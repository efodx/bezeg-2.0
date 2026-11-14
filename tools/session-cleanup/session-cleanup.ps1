# Stops processes left behind by Claude sessions that no longer need them.
#   start: on SessionStart, sweep orphaned trees a Claude shell started (dev servers, previews,
#          test runs, wait loops) whose owning claude.exe has exited or crashed.
#   end:   on SessionEnd, the ending session's own trees get the same treatment.
# Handoff rule: a tree is kept while a live Claude session that started after the tree exists in
# the same working directory (worktree). A successor handler started by `claude --bg` in its
# predecessor's worktree therefore inherits the predecessor's previews and servers; they are
# stopped once no newer session remains there.
# Never touched: claude.exe processes and anything below them, detached background publish gates
# (docs/adr/0043-background-publish-worktree.md), Codex/ChatGPT and user-terminal trees.
# -DryRun prints the decisions; SESSION_CLEANUP_SESSIONS_DIR points tests at fake session records.
param([ValidateSet('start', 'end')][string]$Mode = 'start', [switch]$DryRun)
$ErrorActionPreference = 'SilentlyContinue'

if ($Mode -eq 'end') {
    $reason = ''
    try { $reason = ([Console]::In.ReadToEnd() | ConvertFrom-Json).reason } catch {}
    # /clear ends the transcript but the process keeps running with its MCP servers and tasks.
    if ($reason -eq 'clear') { exit 0 }
}

Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
public static class ProcCwd {
    [DllImport("ntdll.dll")] static extern int NtQueryInformationProcess(IntPtr h, int c, ref PBI i, int l, out int r);
    [DllImport("kernel32.dll")] static extern IntPtr OpenProcess(int a, bool i, int pid);
    [DllImport("kernel32.dll")] static extern bool CloseHandle(IntPtr h);
    [DllImport("kernel32.dll")] static extern bool ReadProcessMemory(IntPtr h, IntPtr a, byte[] b, int n, out IntPtr r);
    [StructLayout(LayoutKind.Sequential)] struct PBI { public IntPtr r1, Peb, r2a, r2b, Pid, r3; }
    static byte[] Read(IntPtr h, long addr, int n) { var b = new byte[n]; IntPtr r; return ReadProcessMemory(h, new IntPtr(addr), b, n, out r) ? b : null; }
    // 64-bit only: PEB+0x20 -> RTL_USER_PROCESS_PARAMETERS, +0x38 -> CurrentDirectory.DosPath.
    public static string Get(int pid) {
        IntPtr h = OpenProcess(0x0410, false, pid);
        if (h == IntPtr.Zero) return null;
        try {
            var pbi = new PBI(); int ret;
            if (NtQueryInformationProcess(h, 0, ref pbi, Marshal.SizeOf(pbi), out ret) != 0) return null;
            var pp = Read(h, pbi.Peb.ToInt64() + 0x20, 8); if (pp == null) return null;
            var us = Read(h, BitConverter.ToInt64(pp, 0) + 0x38, 16); if (us == null) return null;
            int len = BitConverter.ToUInt16(us, 0);
            var s = Read(h, BitConverter.ToInt64(us, 8), len); if (s == null) return null;
            return System.Text.Encoding.Unicode.GetString(s);
        } finally { CloseHandle(h); }
    }
}
'@

$all = Get-CimInstance Win32_Process
$byId = @{}; $children = @{}
foreach ($p in $all) {
    $byId[[int]$p.ProcessId] = $p
    $children[[int]$p.ParentProcessId] += @($p)
}
$liveRoots = 'claude.exe', 'codex.exe', 'ChatGPT.exe'

# Parent lookup that ignores reused PIDs (a "parent" younger than its child is a different process).
function Get-Parent($p) {
    $pp = $byId[[int]$p.ParentProcessId]
    if ($pp -and $pp.CreationDate -le $p.CreationDate) { return $pp }
    return $null
}
function Get-Kids($p) { @($children[[int]$p.ProcessId] | Where-Object { $_.CreationDate -ge $p.CreationDate }) }
function Test-Gate($p) { $p.CommandLine -match 'publish-gate\.cjs' }
function Norm($path) { if ($path) { $path.TrimEnd('\').ToLowerInvariant() } }

# The session running this hook (end mode): nearest claude.exe above us.
$self = $null; $mine = @{}
$c = $byId[$PID]
while ($c) {
    $mine[[int]$c.ProcessId] = $true
    if ($c.Name -eq 'claude.exe') { $self = $c; break }
    $c = Get-Parent $c
}

# Live sessions with their working directory and start time; the ending session no longer counts.
$sessions = foreach ($f in Get-ChildItem $(if ($env:SESSION_CLEANUP_SESSIONS_DIR) { $env:SESSION_CLEANUP_SESSIONS_DIR } else { Join-Path $HOME '.claude/sessions' }) -Filter *.json) {
    try { $j = Get-Content $f.FullName -Raw | ConvertFrom-Json } catch { continue }
    $proc = $byId[[int]$j.pid]
    if (-not $proc -or $proc.Name -ne 'claude.exe') { continue }
    $started = [DateTimeOffset]::FromUnixTimeMilliseconds([long]$j.startedAt).LocalDateTime
    if ([math]::Abs(($proc.CreationDate - $started).TotalMinutes) -gt 10) { continue }  # reused PID
    if ($Mode -eq 'end' -and $self -and [int]$j.pid -eq [int]$self.ProcessId) { continue }
    [pscustomobject]@{ Pid = [int]$j.pid; Cwd = (Norm $j.cwd); Started = $proc.CreationDate }
}

# A worktree is its own home; elsewhere the cwd itself is.
function Get-Home($cwd) {
    if ($cwd -match '^(.*?\\\.claude\\worktrees\\[^\\]+)') { return $Matches[1] }
    return $cwd
}
function Get-TreeCwd($p) {
    $cwd = Norm ([ProcCwd]::Get([int]$p.ProcessId))
    if ($cwd) { return $cwd }
    foreach ($k in Get-Kids $p) { $cwd = Get-TreeCwd $k; if ($cwd) { return $cwd } }
    return $null
}
# Kept when a newer live session works in the same home (the successor inherits the tree).
function Test-Inherited($top) {
    $treeHome = Get-Home (Get-TreeCwd $top)
    foreach ($s in $sessions) {
        if ($s.Started -le $top.CreationDate) { continue }
        if (-not $treeHome) { return $true }  # cwd unreadable: keep while any newer session lives
        if ($s.Cwd -eq $treeHome) { return $true }
        if ($treeHome.StartsWith($s.Cwd + '\') -and $treeHome.Substring($s.Cwd.Length) -notmatch '\\\.claude\\worktrees\\') { return $true }
    }
    return $false
}

$log = Join-Path $(if ($env:CLAUDE_PROJECT_DIR) { $env:CLAUDE_PROJECT_DIR } else { '.' }) '.command-logs'
New-Item -ItemType Directory -Force $log | Out-Null
$log = Join-Path $log 'session-cleanup.log'

# Kill bottom-up, never crossing into a claude.exe subtree (a successor may run below an old shell).
function Stop-TreeSafe($p) {
    if ($p.Name -eq 'claude.exe' -or (Test-Gate $p)) { return }
    foreach ($k in Get-Kids $p) { Stop-TreeSafe $k }
    Stop-Process -Id $p.ProcessId -Force
}
function Stop-Tree($p, $why) {
    $cmd = "$($p.CommandLine)"; if ($cmd.Length -gt 200) { $cmd = $cmd.Substring(0, 200) }
    Add-Content -Encoding utf8 $log ("{0} {1} kill {2} {3} ({4}) {5}" -f (Get-Date -Format s), $Mode, $p.ProcessId, $p.Name, $why, $cmd)
    Stop-TreeSafe $p
}

$targets = @{}
$candidates = 'node.exe', 'bash.exe', 'sh.exe', 'just.exe', 'nohup.exe', 'cmd.exe', 'python.exe', 'sleep.exe'

# Orphaned trees started by a Claude shell.
foreach ($p in $all | Where-Object { $_.Name -in $candidates }) {
    $chain = @($p); $c = $p; $orphan = $false
    while ($true) {
        $pp = Get-Parent $c
        if (-not $pp) { $orphan = $true; break }
        if ($pp.Name -in $liveRoots) { break }
        $chain += $pp; $c = $pp
    }
    if (-not $orphan) { continue }
    if ($chain | Where-Object { Test-Gate $_ }) { continue }
    # Claude's bash wrapper sources a shell snapshot; worktree tooling lives under .claude.
    if (-not ($chain | Where-Object { $_.CommandLine -match 'shell-snapshots|[\\/]\.claude[\\/]' })) { continue }
    $top = $chain[-1]
    if ($top.Name -in $candidates) { $targets[[int]$top.ProcessId] = @($top, 'orphaned by an exited session') }
}

# The ending session's own trees, except the hook's own ancestry.
if ($Mode -eq 'end' -and $self) {
    foreach ($k in Get-Kids $self) {
        if ($mine[[int]$k.ProcessId] -or $k.Name -eq 'claude.exe' -or (Test-Gate $k)) { continue }
        $targets[[int]$k.ProcessId] = @($k, "session ended: $reason")
    }
}

foreach ($t in $targets.Values) {
    $keep = Test-Inherited $t[0]
    if ($DryRun) { '{0} {1} {2} cwd={3}' -f $(if ($keep) { 'keep' } else { 'kill' }), $t[0].ProcessId, $t[0].Name, (Get-TreeCwd $t[0]); continue }
    if ($keep) { continue }
    Stop-Tree $t[0] $t[1]
}
exit 0
