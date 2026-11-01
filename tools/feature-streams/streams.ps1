<#
.SYNOPSIS
  Supervisor for the Bezeg feature streams (docs/tasks/feature-streams/README.md).

.DESCRIPTION
  Plain script, no model. Starts each stream's first handler session, then polls
  origin/master and relaunches a stream only when it is waiting on gates that are
  now open, or when an active stream has lost its session. It never reads or checks
  code. Handlers launch their own successors at context handoffs.

  A finished background session stays resident (about 0.7 GB each) until it is
  stopped, so every poll stops handler sessions that have been idle and done for
  two polls, together with the processes they left behind. `claude stop` keeps the
  conversation; `claude attach <id>` still opens it. New streams start only while
  fewer than -MaxLive handlers run and at least -MinFreeGB of memory is free.

  Run from the main checkout after `git pull`:
    powershell -ExecutionPolicy Bypass -File tools\feature-streams\streams.ps1
  Stop finished handler sessions once, without launching anything:
    powershell -ExecutionPolicy Bypass -File tools\feature-streams\streams.ps1 -ReapOnly
#>
param(
    [string[]]$Only = @(),
    [string]$PermissionMode = 'auto',
    [string]$Model = 'opus',
    [ValidateSet('low', 'medium', 'high', 'xhigh', 'max')]
    [string]$Effort = 'medium',
    [int]$IntervalMinutes = 10,
    [int]$StaggerSeconds = 90,
    [int]$MaxRestarts = 3,
    [int]$MaxLive = 3,
    [double]$MinFreeGB = 3,
    [string]$Ref = 'origin/master',
    [switch]$DryRun,
    [switch]$Once,
    [switch]$ReapOnly
)

$ErrorActionPreference = 'Stop'
$Repo = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$AllStreams = @('platform', 'learn-ui', 'geometry', 'functions', 'curves', 'maps')
$Order = $AllStreams
if ($Only.Count -gt 0) { $Order = $Order | Where-Object { $Only -contains $_ } }

# Gate -> stream file that records it.
$GateOwner = @{ 'G-REG' = 'platform'; 'G-CURVE' = 'platform'; 'G-FN' = 'platform'; 'G-CG' = 'geometry'; 'G-HL' = 'learn-ui' }
$EndedStates = @('done', 'failed', 'error', 'stopped', 'exited', 'killed', 'cancelled')
$GraceMinutes = 30

$lastLaunch = @{}
$missingPolls = @{}
$restarts = @{}
$donePolls = @{}

function Log([string]$msg) { Write-Host ("[{0}] {1}" -f (Get-Date -Format 'yyyy-MM-dd HH:mm'), $msg) }

# All sessions the daemon knows, or $null if they cannot be listed.
function Get-Sessions {
    try {
        $parsed = ((& claude agents --json) -join "`n") | ConvertFrom-Json
        return @($parsed | ForEach-Object { $_ })
    } catch {
        Log "could not list sessions: $_"
        return $null
    }
}

function Test-HandlerSession($session) {
    if ($session.kind -ne 'background') { return $false }
    foreach ($id in $AllStreams) { if ($session.name -like "$id handler*") { return $true } }
    return $false
}

function Get-FreeGB { return [math]::Round((Get-CimInstance Win32_OperatingSystem).FreePhysicalMemory / 1MB, 1) }

# Processes started below $rootPid (shells, preview servers, test runners, headless browsers), as pid + start time.
function Get-Descendants([int]$rootPid) {
    $children = @{}
    foreach ($p in Get-CimInstance Win32_Process) {
        $key = [int]$p.ParentProcessId
        if (-not $children.ContainsKey($key)) { $children[$key] = New-Object System.Collections.ArrayList }
        [void]$children[$key].Add($p)
    }
    $root = Get-CimInstance Win32_Process -Filter "ProcessId=$rootPid"
    $found = New-Object System.Collections.ArrayList
    if ($null -eq $root) { return $found }
    $queue = New-Object System.Collections.Queue
    $queue.Enqueue($root)
    while ($queue.Count -gt 0) {
        $parent = $queue.Dequeue()
        $key = [int]$parent.ProcessId
        if (-not $children.ContainsKey($key)) { continue }
        foreach ($child in $children[$key]) {
            # Windows reuses pids: a real child is younger than the process it hangs under.
            if ($child.CreationDate -lt $parent.CreationDate) { continue }
            [void]$found.Add([pscustomobject]@{ Id = [int]$child.ProcessId; Started = $child.CreationDate })
            $queue.Enqueue($child)
        }
    }
    return $found
}

# Stops handler sessions that are idle and done (by default for two consecutive polls, so a session
# between two turns is never caught), then kills processes they left running. A done session has
# finished its turn and runs no background task: those keep it busy.
function Stop-FinishedHandlers($sessions, [int]$requiredPolls) {
    $seen = @{}
    foreach ($s in $sessions) {
        if (-not (Test-HandlerSession $s)) { continue }
        if ($s.state -ne 'done' -or $s.status -ne 'idle') { continue }
        $seen[$s.id] = 1 + [int]$donePolls[$s.id]
        if ($seen[$s.id] -lt $requiredPolls) { continue }
        $leftovers = @(Get-Descendants ([int]$s.pid))
        if ($DryRun) { Log "DRY RUN would stop finished session '$($s.name)' ($($s.id)) and $($leftovers.Count) child processes"; continue }
        Log "stopping finished session '$($s.name)' ($($s.id)); attach with: claude attach $($s.id)"
        & claude stop $s.id | Out-Null
        if ($LASTEXITCODE -ne 0) { Log "claude stop $($s.id) failed; retrying next poll" }
        foreach ($p in $leftovers) {
            $live = Get-Process -Id $p.Id -ErrorAction SilentlyContinue
            if ($null -ne $live -and [math]::Abs(($live.StartTime - $p.Started).TotalSeconds) -lt 1) {
                Log "  killing leftover $($live.ProcessName) ($($p.Id))"
                Stop-Process -Id $p.Id -Force -ErrorAction SilentlyContinue
            }
        }
        $seen.Remove($s.id)
    }
    $script:donePolls = $seen
}

if ($ReapOnly) {
    $sessions = Get-Sessions
    if ($null -eq $sessions) { exit 1 }
    Stop-FinishedHandlers $sessions 1
    Log ("free memory {0} GB" -f (Get-FreeGB))
    exit 0
}

function Get-StreamText([string]$id) {
    $text = & git -C $Repo show "${Ref}:docs/tasks/feature-streams/$id.md" 2>$null
    if ($LASTEXITCODE -ne 0) { return $null }
    return ($text -join "`n")
}

function Get-RunState([string]$text) {
    if ($null -eq $text) { return 'missing' }
    $m = [regex]::Match($text, '(?m)^Run state:\s*(.+?)\s*$')
    if ($m.Success) { return $m.Groups[1].Value }
    return 'unknown'
}

function Test-GateOpen([string]$gate) {
    $owner = $GateOwner[$gate]
    if ($null -eq $owner) { Log "unknown gate $gate"; return $false }
    $text = Get-StreamText $owner
    if ($null -eq $text) { return $false }
    $m = [regex]::Match($text, '`' + [regex]::Escape($gate) + '`[^|\n]*\|\s*(open|closed)')
    return ($m.Success -and $m.Groups[1].Value -eq 'open')
}

# Number of live handler sessions for a stream ('*' for every stream).
function Get-LiveCount($sessions, [string]$id) {
    $live = @($sessions | Where-Object { (Test-HandlerSession $_) -and $_.name -like "$id handler*" -and ($EndedStates -notcontains $_.state) })
    return $live.Count
}

# Why a new handler may not start now, or $null when the machine has room for one.
function Get-LaunchBlocker([int]$liveTotal) {
    if ($liveTotal -ge $MaxLive) { return "$liveTotal handlers already run (-MaxLive $MaxLive)" }
    $free = Get-FreeGB
    if ($free -lt $MinFreeGB) { return "only $free GB memory free (-MinFreeGB $MinFreeGB)" }
    return $null
}

function Start-Stream([string]$id, [string]$reason) {
    $worktree = Join-Path $Repo ".claude\worktrees\stream-$id"
    $stamp = Get-Date -Format 'MMdd-HHmm'
    $name = "$id handler (supervisor $stamp)"
    if (Test-Path $worktree) {
        $cwd = $worktree
        $prompt = "You are a handler of the Bezeg feature stream '$id', started by the supervisor script because: $reason. " +
                  "Rebase onto origin/master, then continue docs/tasks/feature-streams/$id.md from the latest note in docs/reviews/feature-streams/$id/ " +
                  "under AGENTS.md and docs/tasks/feature-streams/README.md. Set 'Run state: active' and push it before dispatching work."
    } else {
        $cwd = $Repo
        $prompt = "You are the first handler of the Bezeg feature stream '$id'. Use EnterWorktree with name 'stream-$id', " +
                  "then run docs/tasks/feature-streams/$id.md under AGENTS.md and docs/tasks/feature-streams/README.md. " +
                  "Set 'Run state: active' and push it before dispatching work."
    }
    $prompt += " Launch successors with: --agent claude --model $Model --permission-mode $PermissionMode --effort $Effort."
    if ($DryRun) { Log "DRY RUN would start '$name' in $cwd ($reason): $prompt"; return }
    Log "starting '$name' in $cwd ($reason)"
    Push-Location $cwd
    try { & claude --bg -n $name --agent claude --model $Model --permission-mode $PermissionMode --effort $Effort $prompt }
    finally { Pop-Location }
    $lastLaunch[$id] = Get-Date
}

function In-Grace([string]$id) {
    if (-not $lastLaunch.ContainsKey($id)) { return $false }
    return ((Get-Date) - $lastLaunch[$id]).TotalMinutes -lt $GraceMinutes
}

Log "supervising: $($Order -join ', ') (model $Model, effort $Effort, mode $PermissionMode, every $IntervalMinutes min, at most $MaxLive live, launch above $MinFreeGB GB free)"
while ($true) {
    & git -C $Repo fetch -q origin
    if ($LASTEXITCODE -ne 0) { Log 'git fetch failed; retrying next poll' }

    $sessions = Get-Sessions
    if ($null -ne $sessions) {
        Stop-FinishedHandlers $sessions 2
        $liveTotal = Get-LiveCount $sessions '*'
    }

    $finished = 0
    $launchedThisPoll = $false
    foreach ($id in $Order) {
        $state = Get-RunState (Get-StreamText $id)
        if ($state -eq 'complete') { $finished++; continue }
        if ($state -like 'stopped*') { Log "$id is $state  <- needs you; set 'Run state: active' and relaunch"; $finished++; continue }
        if (In-Grace $id) { continue }

        if ($null -eq $sessions) { continue }
        $live = Get-LiveCount $sessions $id
        if ($live -gt 0) { $missingPolls[$id] = 0; continue }

        $reason = $null
        if ($state -eq 'not started') {
            $reason = 'the stream has not started'
        } elseif ($state -like 'waiting on*') {
            $gates = [regex]::Matches($state, 'G-[A-Z]+') | ForEach-Object { $_.Value }
            $closed = @($gates | Where-Object { -not (Test-GateOpen $_) })
            if ($gates.Count -gt 0 -and $closed.Count -eq 0) { $reason = "its gates are open: $($gates -join ', ')" }
            else { Log "$id waiting on $($closed -join ', ')" }
        } elseif ($state -eq 'active') {
            $missingPolls[$id] = 1 + [int]$missingPolls[$id]
            if ($missingPolls[$id] -ge 2) {
                if ([int]$restarts[$id] -ge $MaxRestarts) { Log "$id is active with no session; restart limit reached  <- needs you" }
                else { $reason = 'it was active but had no running session (crash or failed successor launch)' }
            }
        } else {
            Log "$id has unexpected run state '$state'  <- check docs/tasks/feature-streams/$id.md"
        }

        if ($null -ne $reason) {
            if ($launchedThisPoll) { Start-Sleep -Seconds $StaggerSeconds }
            $blocker = Get-LaunchBlocker $liveTotal
            if ($null -ne $blocker) { Log "$id deferred: $blocker"; continue }
            if ($state -eq 'active') { $restarts[$id] = 1 + [int]$restarts[$id] }
            Start-Stream $id $reason
            $launchedThisPoll = $true
            $liveTotal++
            $missingPolls[$id] = 0
        }
    }

    if ($finished -eq $Order.Count) { Log 'every stream is complete or stopped; exiting'; break }
    if ($Once) { break }
    Start-Sleep -Seconds ($IntervalMinutes * 60)
}
