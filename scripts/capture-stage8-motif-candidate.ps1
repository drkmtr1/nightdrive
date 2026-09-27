[CmdletBinding()]
param(
  [Parameter(Mandatory = $true, Position = 0)]
  [string]$OutputDirectory,
  [Parameter(Mandatory = $true, Position = 1)]
  [string]$ReviewedCommit,
  [Parameter(Mandatory = $true, Position = 2)]
  [string]$ReviewedTree
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$repositoryRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot "..")).Path
$expectedWrapper = (Resolve-Path -LiteralPath (
  Join-Path $repositoryRoot "scripts\capture-stage8-motif-candidate.ps1"
)).Path
$invokedWrapper = (Resolve-Path -LiteralPath $PSCommandPath).Path
$currentDirectory = (Resolve-Path -LiteralPath (Get-Location).Path).Path
if ($invokedWrapper -ne $expectedWrapper -or $currentDirectory -ne $repositoryRoot) {
  throw "Stage 8 candidate capture must invoke the tracked wrapper directly from the repository root."
}

function Get-EnvironmentValue {
  param([Parameter(Mandatory = $true)][string]$Name)

  $matches = @(
    [Environment]::GetEnvironmentVariables().Keys |
      Where-Object { $_.ToString().Equals($Name, [StringComparison]::OrdinalIgnoreCase) }
  )
  if ($matches.Count -gt 1) {
    throw "Stage 8 candidate capture refuses duplicate case-insensitive environment input: $Name"
  }
  if ($matches.Count -eq 0) {
    return $null
  }
  return [Environment]::GetEnvironmentVariable($matches[0].ToString())
}

function Assert-EmptyEnvironmentValue {
  param([Parameter(Mandatory = $true)][string]$Name)

  $value = Get-EnvironmentValue -Name $Name
  if ($null -ne $value -and $value.Length -gt 0) {
    throw "Stage 8 candidate capture refuses environment override: $Name"
  }
}

$unsafeExactEnvironmentNames = @(
  "VITEST",
  "VP_RUN_NODE_CLIENT_PATH"
)

foreach ($name in $unsafeExactEnvironmentNames) {
  Assert-EmptyEnvironmentValue -Name $name
}

$unsafeEnvironmentPrefixes = @(
  "NODE_",
  "LD_",
  "DYLD_",
  "NAPI_RS_",
  "VITE_",
  "VITEST_",
  "STAGE8_MOTIF_CANDIDATE_CAPTURE_"
)

foreach ($prefix in $unsafeEnvironmentPrefixes) {
  $matches = @(
    [Environment]::GetEnvironmentVariables().Keys |
      Where-Object { $_.ToString().StartsWith($prefix, [StringComparison]::OrdinalIgnoreCase) }
  )
  if ($matches.Count -gt 0) {
    throw "Stage 8 candidate capture refuses environment override: $($matches[0])"
  }
}

# npm itself supplies NPM_CONFIG_* variables to package scripts. They are not
# trusted capture inputs: remove them, along with Git-routing variables, before
# the capture Node process starts. The direct wrapper has no npm-script ingress,
# so no package-manager configuration reaches Vite, Vitest, or the worker.
$clearOnlyEnvironmentPrefixes = @(
  "GIT_",
  "NPM_CONFIG_"
)

# The supported host selects PowerShell and Node before this boundary can run.
# The Node, Git, and npm byte identities are retained by the capture receipt;
# those records identify what ran but do not authenticate a hostile host before
# the direct wrapper starts.
$node = Get-Command node -CommandType Application | Select-Object -First 1
if ($null -eq $node -or -not (Test-Path -LiteralPath $node.Source -PathType Leaf)) {
  throw "Stage 8 candidate capture cannot locate the Node executable."
}
$nodePath = (Resolve-Path -LiteralPath $node.Source).Path
$repositoryPrefix = $repositoryRoot.TrimEnd([IO.Path]::DirectorySeparatorChar, [IO.Path]::AltDirectorySeparatorChar) + [IO.Path]::DirectorySeparatorChar
if ($nodePath.StartsWith($repositoryPrefix, [StringComparison]::OrdinalIgnoreCase)) {
  throw "Stage 8 candidate capture refuses a Node executable inside the capture worktree."
}

foreach ($name in $unsafeExactEnvironmentNames) {
  Remove-Item "Env:$name" -ErrorAction SilentlyContinue
}
foreach ($prefix in $unsafeEnvironmentPrefixes) {
  $matches = @(
    [Environment]::GetEnvironmentVariables().Keys |
      Where-Object { $_.ToString().StartsWith($prefix, [StringComparison]::OrdinalIgnoreCase) }
  )
  foreach ($match in $matches) {
    Remove-Item "Env:$($match.ToString())" -ErrorAction SilentlyContinue
  }
}
foreach ($prefix in $clearOnlyEnvironmentPrefixes) {
  $matches = @(
    [Environment]::GetEnvironmentVariables().Keys |
      Where-Object { $_.ToString().StartsWith($prefix, [StringComparison]::OrdinalIgnoreCase) }
  )
  foreach ($match in $matches) {
    Remove-Item "Env:$($match.ToString())" -ErrorAction SilentlyContinue
  }
}

$launcherCandidate = Join-Path $PSScriptRoot "..\src\evaluation\stage8-motif-candidate-capture-launcher.mjs"
if (-not (Test-Path -LiteralPath $launcherCandidate -PathType Leaf)) {
  throw "Stage 8 candidate capture launcher is unavailable."
}
$launcher = (Resolve-Path -LiteralPath $launcherCandidate).Path

$resolvedOutputDirectory = [IO.Path]::GetFullPath($OutputDirectory)
$wrapperExecutable = (Get-Process -Id $PID).Path
if (
  [string]::IsNullOrWhiteSpace($wrapperExecutable) -or
  -not (Test-Path -LiteralPath $wrapperExecutable -PathType Leaf)
) {
  throw "Stage 8 candidate capture cannot identify its PowerShell host executable."
}
$wrapperExecutable = (Resolve-Path -LiteralPath $wrapperExecutable).Path

# The wrapper is the only approved pre-Node ingress. Its one-time stdin
# attestation binds this PowerShell process, its actual Node child, the tracked
# launcher, and the reviewed tuple. The Node boundary independently checks the
# live parent-process command line before any capture preflight or output write.
$nonceBytes = New-Object byte[] 32
[Security.Cryptography.RandomNumberGenerator]::Fill($nonceBytes)
$nonce = [Convert]::ToHexString($nonceBytes).ToLowerInvariant()

$startInfo = [Diagnostics.ProcessStartInfo]::new()
$startInfo.FileName = $nodePath
$startInfo.WorkingDirectory = $repositoryRoot
$startInfo.UseShellExecute = $false
$startInfo.RedirectStandardInput = $true
$startInfo.StandardInputEncoding = [Text.UTF8Encoding]::new($false)
$startInfo.ArgumentList.Add($launcher)
$startInfo.ArgumentList.Add("--stage8-motif-candidate-wrapper-ingress-v1")
$startInfo.ArgumentList.Add($resolvedOutputDirectory)
$startInfo.ArgumentList.Add($ReviewedCommit)
$startInfo.ArgumentList.Add($ReviewedTree)

$child = [Diagnostics.Process]::new()
$child.StartInfo = $startInfo
if (-not $child.Start()) {
  throw "Stage 8 candidate capture could not start the Node custody launcher."
}

$ingress = [ordered]@{
  schema = "nightdrive.stage8-motif-candidate-wrapper-ingress.v1"
  nonce = $nonce
  wrapper = [ordered]@{
    processId = [int]$PID
    executable = $wrapperExecutable
    script = $expectedWrapper
  }
  child = [ordered]@{
    processId = [int]$child.Id
    executable = $nodePath
    launcher = $launcher
    workingDirectory = $repositoryRoot
    outputDirectory = $resolvedOutputDirectory
    reviewedCommit = $ReviewedCommit
    reviewedTree = $ReviewedTree
  }
}

$exitCode = 1
try {
  $ingressJson = $ingress | ConvertTo-Json -Compress -Depth 4
  $child.StandardInput.Write($ingressJson)
  $child.StandardInput.Write("`n")
  $child.StandardInput.Close()
  $child.WaitForExit()
  $exitCode = $child.ExitCode
}
finally {
  if (-not $child.HasExited) {
    $child.Kill()
    $child.WaitForExit()
  }
  $child.Dispose()
}

exit $exitCode
