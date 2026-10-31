<#
.SYNOPSIS
  Supervisor for the Bezeg feature streams (docs/tasks/feature-streams/README.md).

.DESCRIPTION
  Plain script, no model. Starts each stream's first handler session, then polls
  origin/master and relaunches a stream only when it is waiting on gates that are
  now open, or when an active stream has lost its session. It never reads or checks
  code. Handlers launch their own successors at context handoffs.

  Run from the main checkout after `git pull`:
    powershell -ExecutionPolicy Bypass -File tools\feature-streams\streams.ps1
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
    [string]$Ref = 'origin/master',
    [switch]$DryRun,
    [switch]$Once
)

$ErrorActionPreference = 'Stop'
$Repo = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$Order = @('platform', 'learn-ui', 'geometry', 'functions', 'curves', 'maps')
if ($Only.Count -gt 0) { $Order = $Order | Where-Object { $Only -contains $_ } }

# Gate -> stream file that records it.
$GateOwner = @{ 'G-REG' = 'platform'; 'G-CURVE' = 'platform'; 'G-FN' = 'platform'; 'G-CG' = 'geometry'; 'G-HL' = 'learn-ui' }
$EndedStates = @('done', 'failed', 'error', 'stopped', 'exited', 'killed', 'cancelled')
$GraceMinutes = 30

$lastLaunch = @{}
$missingPolls = @{}
$restarts = @{}

function Log([string]$msg) { Write-Host ("[{0}] {1}" -f (Get-Date -Format 'yyyy-MM-dd HH:mm'), $msg) }

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

# Number of live handler sessions for a stream, or -1 if sessions cannot be listed.
function Get-LiveCount([string]$id) {
    try {
        $all = & claude agents --json | ConvertFrom-Json
    } catch {
        Log "could not list sessions: $_"
        return -1
    }
    $live = @($all | Where-Object { $_.name -like "$id handler*" -and ($EndedStates -notcontains $_.state) })
    return $live.Count
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

Log "supervising: $($Order -join ', ') (model $Model, effort $Effort, mode $PermissionMode, every $IntervalMinutes min)"
while ($true) {
    & git -C $Repo fetch -q origin
    if ($LASTEXITCODE -ne 0) { Log 'git fetch failed; retrying next poll' }

    $finished = 0
    $launchedThisPoll = $false
    foreach ($id in $Order) {
        $state = Get-RunState (Get-StreamText $id)
        if ($state -eq 'complete') { $finished++; continue }
        if ($state -like 'stopped*') { Log "$id is $state  <- needs you; set 'Run state: active' and relaunch"; $finished++; continue }
        if (In-Grace $id) { continue }

        $live = Get-LiveCount $id
        if ($live -lt 0) { continue }
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
                else { $restarts[$id] = 1 + [int]$restarts[$id]; $reason = 'it was active but had no running session (crash or failed successor launch)' }
            }
        } else {
            Log "$id has unexpected run state '$state'  <- check docs/tasks/feature-streams/$id.md"
        }

        if ($null -ne $reason) {
            if ($launchedThisPoll) { Start-Sleep -Seconds $StaggerSeconds }
            Start-Stream $id $reason
            $launchedThisPoll = $true
            $missingPolls[$id] = 0
        }
    }

    if ($finished -eq $Order.Count) { Log 'every stream is complete or stopped; exiting'; break }
    if ($Once) { break }
    Start-Sleep -Seconds ($IntervalMinutes * 60)
}
