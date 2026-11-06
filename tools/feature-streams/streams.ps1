<#
.SYNOPSIS
  Supervisor for the Bezeg feature streams (docs/tasks/feature-streams/README.md).

.DESCRIPTION
  Plain script, no model. Reads the streams from origin/master: every Markdown file
  in docs/tasks/feature-streams with a `Run state:` line is a stream, and complete
  streams are left out of the supervised list. Starts each stream's first handler
  session, then polls origin/master and relaunches a stream only when it is waiting
  on gates that are now open, or when an active stream has lost its session.

  Pushing a new stream file to master is enough to start it: the script keeps running
  when nothing is left to supervise and checks every -IdleMinutes. With -Only it exits
  instead once the named streams are complete or stopped. An active stream with no
  session starts on the supervisor's first poll; later polls wait for two misses so
  that a handoff in progress is not mistaken for a crash. It never reads or checks
  code. Handlers launch their own successors at context handoffs.

  A finished background session stays resident (about 0.7 GB each) until it is
  stopped, so every poll stops handler sessions that have been idle and done for
  two polls, together with the processes they left behind. `claude stop` keeps the
  conversation; `claude attach <id>` still opens it. New streams start only while
  fewer than -MaxLive handlers run and at least -MinFreeGB of memory is free.

  Run from the main checkout. It pulls master once at startup, fast-forward only:
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
    [double]$IdleMinutes = 30,
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
$StreamDir = 'docs/tasks/feature-streams'

# Refreshed from $Ref on every poll. $AllStreams keeps complete streams, because their finished handlers
# are still recognized and stopped by name. $Order is what the supervisor acts on.
$RunStates = [ordered]@{}
$AllStreams = @()
$Order = @()

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
function Get-StreamOf($session) {
    foreach ($id in $AllStreams) { if ($session.name -like "$id handler*") { return $id } }
    return $null
}

function Stop-FinishedHandlers($sessions, [int]$requiredPolls) {
    $seen = @{}
    foreach ($s in $sessions) {
        if (-not (Test-HandlerSession $s)) { continue }
        if ($s.status -ne 'idle') { continue }
        # An idle handler is finished when it is done, or when a newer handler of its stream exists: a handed-off
        # session whose leftover watcher still runs reports 'working' while idle.
        $stream = Get-StreamOf $s
        $superseded = @($sessions | Where-Object { (Test-HandlerSession $_) -and (Get-StreamOf $_) -eq $stream -and $_.startedAt -gt $s.startedAt }).Count -gt 0
        if ($s.state -ne 'done' -and -not $superseded) { continue }
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

function Get-StreamText([string]$id) {
    $text = & git -C $Repo show "${Ref}:$StreamDir/$id.md" 2>$null
    if ($LASTEXITCODE -ne 0) { return $null }
    return ($text -join "`n")
}

function Get-RunState([string]$text) {
    if ($null -eq $text) { return 'missing' }
    $m = [regex]::Match($text, '(?m)^Run state:\s*(.+?)\s*$')
    if ($m.Success) { return $m.Groups[1].Value }
    return 'unknown'
}

# Rereads the streams from $Ref. On a Git failure the previous list stands until the next poll.
function Update-Streams {
    $files = @(& git -C $Repo ls-tree --name-only $Ref "$StreamDir/")
    if ($LASTEXITCODE -ne 0) { Log "could not list streams on $Ref; keeping the previous list"; return }
    $states = [ordered]@{}
    foreach ($file in $files) {
        if ($file -notlike '*.md') { continue }
        $id = [IO.Path]::GetFileNameWithoutExtension($file)
        $state = Get-RunState (Get-StreamText $id)
        if (@('missing', 'unknown') -notcontains $state) { $states[$id] = $state }
    }
    $script:RunStates = $states
    $script:AllStreams = @($states.Keys)
    $script:Order = @($states.Keys | Where-Object { $states[$_] -ne 'complete' -and ($Only.Count -eq 0 -or $Only -contains $_) })
}

# The row that says open or closed sits in the providing stream's file; other streams only name the gate.
function Test-GateOpen([string]$gate) {
    foreach ($id in $AllStreams) {
        $text = Get-StreamText $id
        if ($null -eq $text) { continue }
        $m = [regex]::Match($text, '`' + [regex]::Escape($gate) + '`[^|\n]*\|\s*(open|closed)')
        if ($m.Success) { return ($m.Groups[1].Value -eq 'open') }
    }
    Log "unknown gate $gate"
    return $false
}

# Saves the manual `git pull` before a run. Later polls read $Ref directly, so they never touch the checkout.
function Update-Checkout {
    $branch = (& git -C $Repo rev-parse --abbrev-ref HEAD)
    $target = $Ref -replace '^origin/', ''
    if ($branch -ne $target) { Log "checkout is on $branch, not $target; not pulling"; return }
    & git -C $Repo pull -q --ff-only origin $target
    if ($LASTEXITCODE -ne 0) { Log 'git pull failed; continuing with the checkout as it is' }
}

if ($ReapOnly) {
    Update-Streams
    $sessions = Get-Sessions
    if ($null -eq $sessions) { exit 1 }
    Stop-FinishedHandlers $sessions 1
    Log ("free memory {0} GB" -f (Get-FreeGB))
    exit 0
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
    # A stream worktree that has not rebased since the handler agent landed cannot resolve it yet.
    $agent = if (Test-Path (Join-Path $cwd '.claude/agents/bezeg-handler.md')) { 'bezeg-handler' } else { 'claude' }
    $prompt += " Launch successors with: --agent bezeg-handler --model $Model --permission-mode $PermissionMode --effort $Effort."
    if ($DryRun) { Log "DRY RUN would start '$name' in $cwd ($reason): $prompt"; return }
    Log "starting '$name' in $cwd ($reason)"
    Push-Location $cwd
    try { & claude --bg -n $name --agent $agent --model $Model --permission-mode $PermissionMode --effort $Effort $prompt }
    finally { Pop-Location }
    $lastLaunch[$id] = Get-Date
}

function In-Grace([string]$id) {
    if (-not $lastLaunch.ContainsKey($id)) { return $false }
    return ((Get-Date) - $lastLaunch[$id]).TotalMinutes -lt $GraceMinutes
}

if (-not $DryRun) { Update-Checkout }
$firstPoll = $true
$supervised = $null
Log "settings: model $Model, effort $Effort, mode $PermissionMode, every $IntervalMinutes min ($IdleMinutes when idle), at most $MaxLive live, launch above $MinFreeGB GB free"
while ($true) {
    & git -C $Repo fetch -q origin
    if ($LASTEXITCODE -ne 0) { Log 'git fetch failed; retrying next poll' }
    Update-Streams
    if (($Order -join ',') -ne $supervised) {
        $supervised = $Order -join ','
        if ($Order.Count -gt 0) { Log "supervising: $($Order -join ', ')" } else { Log 'no streams to supervise' }
    }

    $sessions = Get-Sessions
    if ($null -ne $sessions) {
        Stop-FinishedHandlers $sessions 2
        $liveTotal = Get-LiveCount $sessions '*'
    }

    $stopped = 0
    $launchedThisPoll = $false
    foreach ($id in $Order) {
        $state = $RunStates[$id]
        if ($state -like 'stopped*') { Log "$id is $state  <- needs you; set 'Run state: active' and relaunch"; $stopped++; continue }
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
            if ($firstPoll) {
                $reason = 'it is active but had no running session when the supervisor started'
            } elseif ($missingPolls[$id] -ge 2) {
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

    $idle = $stopped -eq $Order.Count
    if ($idle -and $Only.Count -gt 0) { Log 'every named stream is complete or stopped; exiting'; break }
    if ($Once) { break }
    $firstPoll = $false
    Start-Sleep -Seconds ($(if ($idle) { $IdleMinutes } else { $IntervalMinutes }) * 60)
}
