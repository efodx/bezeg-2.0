# Stops processes left behind by Claude sessions that are no longer running.
#   start: on SessionStart, kill orphaned trees that a Claude shell started (dev servers,
#          previews, test runs, wait loops) whose owning claude.exe has exited or crashed.
#   end:   on SessionEnd, kill everything the ending session still has running.
# Detached background publish gates (docs/adr/0043-background-publish-worktree.md) are orphans
# by design and are never touched. Codex/ChatGPT and user-terminal trees are left alone.
param([ValidateSet('start', 'end')][string]$Mode = 'start')
$ErrorActionPreference = 'SilentlyContinue'

$reason = ''
if ($Mode -eq 'end') {
    try { $reason = ([Console]::In.ReadToEnd() | ConvertFrom-Json).reason } catch {}
    # /clear ends the transcript but the process keeps running with its MCP servers and tasks.
    if ($reason -eq 'clear') { exit 0 }
}

$all = Get-CimInstance Win32_Process
$byId = @{}
foreach ($p in $all) { $byId[[int]$p.ProcessId] = $p }
$liveRoots = 'claude.exe', 'codex.exe', 'ChatGPT.exe'

# Parent lookup that ignores reused PIDs (a "parent" younger than its child is a different process).
function Get-Parent($p) {
    $pp = $byId[[int]$p.ParentProcessId]
    if ($pp -and $pp.CreationDate -le $p.CreationDate) { return $pp }
    return $null
}

function Test-Gate($p) { $p.CommandLine -match 'publish-gate\.cjs' }

$log = Join-Path $(if ($env:CLAUDE_PROJECT_DIR) { $env:CLAUDE_PROJECT_DIR } else { '.' }) '.command-logs'
New-Item -ItemType Directory -Force $log | Out-Null
$log = Join-Path $log 'session-cleanup.log'

function Stop-Tree($p, $why) {
    $cmd = "$($p.CommandLine)"; if ($cmd.Length -gt 200) { $cmd = $cmd.Substring(0, 200) }
    Add-Content -Encoding utf8 $log ("{0} {1} kill {2} {3} ({4}) {5}" -f (Get-Date -Format s), $Mode, $p.ProcessId, $p.Name, $why, $cmd)
    taskkill /PID $p.ProcessId /T /F 2>&1 | Out-Null
}

$targets = @{}

if ($Mode -eq 'start') {
    $candidates = 'node.exe', 'bash.exe', 'sh.exe', 'just.exe', 'nohup.exe', 'cmd.exe', 'python.exe', 'sleep.exe'
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
        # Only trees a Claude shell started: its bash wrapper sources a shell snapshot, and worktree tooling lives under .claude.
        $owned = $chain | Where-Object { $_.CommandLine -match 'shell-snapshots|[\\/]\.claude[\\/]' }
        if (-not $owned) { continue }
        $top = $chain[-1]
        if ($top.Name -in $candidates) { $targets[[int]$top.ProcessId] = $top }
    }
    foreach ($t in $targets.Values) { Stop-Tree $t 'orphaned by an exited session' }
}
else {
    # The hook runs below this session's claude.exe; find it and keep our own ancestry alive.
    $mine = @{}; $c = $byId[$PID]; $session = $null
    while ($c) {
        $mine[[int]$c.ProcessId] = $true
        if ($c.Name -eq 'claude.exe') { $session = $c; break }
        $c = Get-Parent $c
    }
    if (-not $session) { exit 0 }
    foreach ($child in $all | Where-Object { [int]$_.ParentProcessId -eq [int]$session.ProcessId -and $_.CreationDate -ge $session.CreationDate }) {
        if ($mine[[int]$child.ProcessId] -or $child.Name -eq 'claude.exe' -or (Test-Gate $child)) { continue }
        Stop-Tree $child "session ended: $reason"
    }
}
exit 0
