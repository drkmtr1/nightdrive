<#
  The only execution-capable entry point for the ND-QA-003 Windows ARM64
  evidence procedure. This script is intentionally not a package script and
  does not offer a dry-run, mock, environment opt-in, or alternate ingress.
#>
[CmdletBinding()]
param(
  [Parameter(Mandatory = $true, Position = 0)]
  [string]$ReceiptDirectory,
  [Parameter(Mandatory = $true, Position = 1)]
  [string]$ReviewedCommit,
  [Parameter(Mandatory = $true, Position = 2)]
  [string]$ReviewedTree,
  [Parameter(Mandatory = $true, Position = 3)]
  [string]$RuntimeRoot,
  [Parameter(Mandatory = $true, Position = 4)]
  [string]$RuntimeProvenancePath,
  [Parameter(Mandatory = $true, Position = 5)]
  [string]$RecoveryRoot
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$ProcedureVersion = "nightdrive.ndqa003.windows-arm64-evidence-procedure.v1"
$IngressSchema = "nightdrive.ndqa003.windows-arm64-wrapper-ingress.v1"
$IngressSentinel = "--ndqa003-windows-arm64-wrapper-ingress-v1"
$ExpectedNodeVersion = "v24.21.0"
$ExpectedNpmVersion = "11.19.0"
$ExpectedRegistry = "https://registry.npmjs.org/"
$ProbeOrder = @(
  "userconfig", "globalconfig", "registry", "proxy", "https-proxy", "omit",
  "production", "offline", "prefer-offline", "package-lock", "workspace", "workspaces"
)
$EvidencePhaseOrder = @(
  "negative-audit", "sbom-first", "sbom-second", "fixture-missing", "fixture-noassertion",
  "fixture-malformed", "positive-audit"
)
$NotRunClass = "NOT_RUN_PRECONDITION_FAILED"
$ReceiptStatuses = @("PASS", "FAIL", "BLOCKED", "NOT VERIFIED")
$ReceiptPhaseExitClasses = @(
  $NotRunClass, "EXPECTED_NETWORK_UNAVAILABLE", "COMPLETE", "COMPLETE_NO_THRESHOLD_FINDING",
  "COMPLETE_THRESHOLD_FINDING", "DECLARATION_MISSING", "DECLARATION_EMPTY",
  "DECLARATION_MALFORMED", "DECLARATION_NOASSERTION", "DECLARATION_UNKNOWN", "EXECUTION_FAILED"
)
$ReceiptLifecycleClasses = @("NEGATIVE_AUDIT", "SBOM_AND_FIXTURES")

function Fail-Procedure {
  param([Parameter(Mandatory = $true)][string]$Message)
  throw "ND-QA-003 Windows ARM64 evidence: $Message"
}

function Get-ExactEnvironmentValue {
  param([Parameter(Mandatory = $true)][string]$Name)

  $matches = @(
    [Environment]::GetEnvironmentVariables().Keys |
      Where-Object { $_.ToString().Equals($Name, [StringComparison]::OrdinalIgnoreCase) }
  )
  if ($matches.Count -gt 1) { Fail-Procedure "duplicate case-insensitive environment input: $Name" }
  if ($matches.Count -eq 0) { return $null }
  return [Environment]::GetEnvironmentVariable($matches[0].ToString())
}

function Assert-NoUnsafeProcessStartOverrides {
  $unsafeExact = @("VITEST", "VP_RUN_NODE_CLIENT_PATH", "NODE_OPTIONS", "NODE_V8_COVERAGE")
  $unsafePrefixes = @(
    "NODE_", "NPM_CONFIG_", "GIT_", "VITE_", "VITEST_", "NDQA003_", "LD_", "DYLD_", "NAPI_RS_"
  )
  foreach ($name in $unsafeExact) {
    $value = Get-ExactEnvironmentValue -Name $name
    if ($null -ne $value -and $value.Length -gt 0) { Fail-Procedure "process-start override is prohibited" }
  }
  foreach ($name in [Environment]::GetEnvironmentVariables().Keys) {
    $normalized = $name.ToString().ToUpperInvariant()
    if ($unsafePrefixes | Where-Object { $normalized.StartsWith($_, [StringComparison]::Ordinal) }) {
      $value = [Environment]::GetEnvironmentVariable($name.ToString())
      if ($null -ne $value -and $value.Length -gt 0) { Fail-Procedure "process-start override is prohibited" }
    }
  }
}

function Get-Sha256 {
  param([Parameter(Mandatory = $true)][string]$Path)
  if (-not (Test-Path -LiteralPath $Path -PathType Leaf)) { Fail-Procedure "required file is unavailable" }
  return (Get-FileHash -LiteralPath $Path -Algorithm SHA256).Hash.ToLowerInvariant()
}

function Assert-Sha256 {
  param(
    [Parameter(Mandatory = $true)][string]$Actual,
    [Parameter(Mandatory = $true)][string]$Expected,
    [Parameter(Mandatory = $true)][string]$Label
  )
  if ($Expected -notmatch "^[0-9a-f]{64}$") { Fail-Procedure "$Label provenance identity is invalid" }
  if ($Actual -ne $Expected) { Fail-Procedure "$Label identity does not equal provenance" }
}

function Get-SafeReceiptBoolean {
  param([Parameter(Mandatory = $true)][object]$Value, [Parameter(Mandatory = $true)][string]$Label)
  if ($Value -isnot [bool]) { Fail-Procedure "$Label is not a boolean receipt predicate" }
  return [bool]$Value
}

function Get-SafeReceiptText {
  param([Parameter(Mandatory = $true)][object]$Value, [Parameter(Mandatory = $true)][string[]]$Allowed, [Parameter(Mandatory = $true)][string]$Label)
  if ($Value -isnot [string] -or $Value -cnotin $Allowed) { Fail-Procedure "$Label is not an allowed receipt classification" }
  return [string]$Value
}

function Get-SafeReceiptSha256OrUnavailable {
  param([Parameter(Mandatory = $true)][object]$Value, [Parameter(Mandatory = $true)][string]$Label)
  if ($Value -is [string] -and $Value -eq "NOT AVAILABLE") { return "NOT AVAILABLE" }
  if ($Value -isnot [string] -or $Value -notmatch "^[0-9a-f]{64}$") { Fail-Procedure "$Label is not a safe receipt SHA-256" }
  return [string]$Value
}

function Get-SafeReceiptSha1OrUnavailable {
  param([Parameter(Mandatory = $true)][object]$Value, [Parameter(Mandatory = $true)][string]$Label)
  if ($Value -is [string] -and $Value -eq "NOT AVAILABLE") { return "NOT AVAILABLE" }
  if ($Value -isnot [string] -or $Value -notmatch "^[0-9a-f]{40}$") { Fail-Procedure "$Label is not a safe receipt SHA-1" }
  return [string]$Value
}

function Resolve-ExistingFile {
  param([Parameter(Mandatory = $true)][string]$Path, [Parameter(Mandatory = $true)][string]$Label)
  Assert-NoReparsePointAncestor -Path $Path -Label $Label
  if (-not (Test-Path -LiteralPath $Path -PathType Leaf)) { Fail-Procedure "$Label is unavailable" }
  return (Resolve-Path -LiteralPath $Path).Path
}

function Resolve-ExistingDirectory {
  param([Parameter(Mandatory = $true)][string]$Path, [Parameter(Mandatory = $true)][string]$Label)
  Assert-NoReparsePointAncestor -Path $Path -Label $Label
  if (-not (Test-Path -LiteralPath $Path -PathType Container)) { Fail-Procedure "$Label is unavailable" }
  return (Resolve-Path -LiteralPath $Path).Path
}

function Assert-NoReparsePointAncestor {
  param([Parameter(Mandatory = $true)][string]$Path, [Parameter(Mandatory = $true)][string]$Label)
  $candidate = [IO.Path]::GetFullPath($Path)
  $existing = $candidate
  while (-not (Test-Path -LiteralPath $existing)) {
    $parent = Split-Path -Parent $existing
    if ([string]::IsNullOrWhiteSpace($parent) -or $parent -eq $existing) { Fail-Procedure "$Label has no trusted existing parent" }
    $existing = $parent
  }
  while ($true) {
    try { $item = Get-Item -LiteralPath $existing -Force -ErrorAction Stop }
    catch { Fail-Procedure "$Label parent cannot be inspected" }
    if (($item.Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0) { Fail-Procedure "$Label may not traverse a reparse point" }
    $parent = Split-Path -Parent $existing
    if ([string]::IsNullOrWhiteSpace($parent) -or $parent -eq $existing) { break }
    $existing = $parent
  }
}

function Test-ExactKeySet {
  param([Parameter(Mandatory = $true)][object[]]$Actual, [Parameter(Mandatory = $true)][string[]]$Expected)
  $left = @($Actual | ForEach-Object { $_.ToString() } | Sort-Object)
  $right = @($Expected | Sort-Object)
  if ($left.Count -ne $right.Count) { return $false }
  for ($index = 0; $index -lt $left.Count; $index += 1) {
    if ($left[$index] -cne $right[$index]) { return $false }
  }
  return $true
}

function Test-PathWithin {
  param([Parameter(Mandatory = $true)][string]$Parent, [Parameter(Mandatory = $true)][string]$Candidate)
  $parentRoot = [IO.Path]::GetFullPath($Parent).TrimEnd([IO.Path]::DirectorySeparatorChar, [IO.Path]::AltDirectorySeparatorChar)
  $resolvedParent = $parentRoot + [IO.Path]::DirectorySeparatorChar
  $resolvedCandidate = [IO.Path]::GetFullPath($Candidate)
  return $resolvedCandidate.Equals($parentRoot, [StringComparison]::OrdinalIgnoreCase) -or $resolvedCandidate.StartsWith($resolvedParent, [StringComparison]::OrdinalIgnoreCase)
}

function Assert-OutsideCheckout {
  param([Parameter(Mandatory = $true)][string]$Checkout, [Parameter(Mandatory = $true)][string]$Path, [Parameter(Mandatory = $true)][string]$Label)
  Assert-NoReparsePointAncestor -Path $Checkout -Label "checkout"
  Assert-NoReparsePointAncestor -Path $Path -Label $Label
  if (Test-PathWithin -Parent $Checkout -Candidate $Path) { Fail-Procedure "$Label must be outside the checkout" }
}

function Resolve-TrustedReceiptDirectory {
  param([Parameter(Mandatory = $true)][string]$Checkout, [Parameter(Mandatory = $true)][string]$ReceiptPath)
  $receipt = [IO.Path]::GetFullPath($ReceiptPath)
  if (Test-Path -LiteralPath $receipt) { Fail-Procedure "receipt directory must be initially absent" }
  [void](Resolve-ExistingDirectory -Path (Split-Path -Parent $receipt) -Label "receipt parent")
  Assert-OutsideCheckout -Checkout $Checkout -Path $receipt -Label "receipt directory"
  return $receipt
}

function Invoke-PrivateProcess {
  param(
    [Parameter(Mandatory = $true)][string]$FileName,
    [Parameter(Mandatory = $true)][string[]]$Arguments,
    [Parameter(Mandatory = $true)][string]$WorkingDirectory,
    [Parameter(Mandatory = $true)][System.Collections.IDictionary]$Environment,
    [Parameter(Mandatory = $true)][string]$StdoutPath,
    [Parameter(Mandatory = $true)][string]$StderrPath
  )
  if (Test-Path -LiteralPath $StdoutPath -or Test-Path -LiteralPath $StderrPath) { Fail-Procedure "private raw-output path collision" }
  $startInfo = [Diagnostics.ProcessStartInfo]::new()
  $startInfo.FileName = $FileName
  $startInfo.WorkingDirectory = $WorkingDirectory
  $startInfo.UseShellExecute = $false
  $startInfo.RedirectStandardOutput = $true
  $startInfo.RedirectStandardError = $true
  $startInfo.RedirectStandardInput = $false
  $startInfo.CreateNoWindow = $true
  $startInfo.Environment.Clear()
  foreach ($entry in $Environment.GetEnumerator()) { $startInfo.Environment[$entry.Key] = $entry.Value }
  foreach ($argument in $Arguments) { [void]$startInfo.ArgumentList.Add($argument) }
  $process = [Diagnostics.Process]::new()
  $process.StartInfo = $startInfo
  $stdoutStream = $null
  $stderrStream = $null
  $started = $false
  try {
    $stdoutStream = [IO.FileStream]::new($StdoutPath, [IO.FileMode]::CreateNew, [IO.FileAccess]::Write, [IO.FileShare]::None, 65536, [IO.FileOptions]::WriteThrough)
    $stderrStream = [IO.FileStream]::new($StderrPath, [IO.FileMode]::CreateNew, [IO.FileAccess]::Write, [IO.FileShare]::None, 65536, [IO.FileOptions]::WriteThrough)
    if (-not $process.Start()) { Fail-Procedure "private child process could not start" }
    $started = $true
    $stdoutCopy = $process.StandardOutput.BaseStream.CopyToAsync($stdoutStream)
    $stderrCopy = $process.StandardError.BaseStream.CopyToAsync($stderrStream)
    $process.WaitForExit()
    [Threading.Tasks.Task]::WaitAll([Threading.Tasks.Task[]]@($stdoutCopy, $stderrCopy))
    $stdoutStream.Flush($true)
    $stderrStream.Flush($true)
    $stdoutStream.Dispose()
    $stdoutStream = $null
    $stderrStream.Dispose()
    $stderrStream = $null
    return [ordered]@{ ExitCode = [int]$process.ExitCode; StdoutBytes = [IO.File]::ReadAllBytes($StdoutPath); StderrBytes = [IO.File]::ReadAllBytes($StderrPath) }
  }
  finally {
    if ($null -ne $stdoutStream) { $stdoutStream.Dispose() }
    if ($null -ne $stderrStream) { $stderrStream.Dispose() }
    if ($started -and -not $process.HasExited) { $process.Kill($true); $process.WaitForExit() }
    $process.Dispose()
  }
}
function Get-GitExecutable {
  $git = Get-Command git.exe -CommandType Application -ErrorAction SilentlyContinue | Select-Object -First 1
  if ($null -eq $git) { $git = Get-Command git -CommandType Application -ErrorAction SilentlyContinue | Select-Object -First 1 }
  if ($null -eq $git) { Fail-Procedure "Git executable is unavailable" }
  return (Resolve-ExistingFile -Path $git.Source -Label "Git executable")
}

function Invoke-GitText {
  param(
    [Parameter(Mandatory = $true)][string]$Git,
    [Parameter(Mandatory = $true)][string]$Root,
    [Parameter(Mandatory = $true)][string[]]$Arguments,
    [Parameter(Mandatory = $true)][string]$PrivateRoot
  )
  $private = Resolve-ExistingDirectory -Path $PrivateRoot -Label "Git private output root"
  $stdout = Join-Path $private ("git-" + [Guid]::NewGuid().ToString("N") + ".out")
  $stderr = Join-Path $private ("git-" + [Guid]::NewGuid().ToString("N") + ".err")
  try {
    $hostIdentity = Get-TrustedWindowsHost
    $environment = [ordered]@{ SystemRoot = $hostIdentity.SystemRoot; ComSpec = $hostIdentity.ComSpec; PATHEXT = $hostIdentity.PathExt; PATH = "$($hostIdentity.System32);$($hostIdentity.SystemRoot)" }
    $result = Invoke-PrivateProcess -FileName $Git -Arguments (@("--no-pager") + $Arguments) -WorkingDirectory $Root -Environment $environment -StdoutPath $stdout -StderrPath $stderr
    if ($result.ExitCode -ne 0) { Fail-Procedure "Git integrity inspection failed" }
    return (Get-StrictUtf8Text -Bytes $result.StdoutBytes -Label "Git stdout")
  }
  finally {
    foreach ($path in @($stdout, $stderr)) {
      if (Test-Path -LiteralPath $path) { Remove-Item -LiteralPath $path -Force -ErrorAction Stop }
      if (Test-Path -LiteralPath $path) { Fail-Procedure "Git private-output cleanup failed" }
    }
  }
}
function Assert-RepositoryIntegrity {
  param(
    [Parameter(Mandatory = $true)][string]$Root,
    [Parameter(Mandatory = $true)][string]$Commit,
    [Parameter(Mandatory = $true)][string]$Tree,
    [Parameter(Mandatory = $true)][string]$Git,
    [Parameter(Mandatory = $true)][string]$PrivateRoot
  )
  if ($Commit -notmatch "^[0-9a-f]{40}$" -or $Tree -notmatch "^[0-9a-f]{40}$") {
    Fail-Procedure "reviewed source identity is malformed"
  }
  $head = (Invoke-GitText -Git $Git -Root $Root -Arguments @("rev-parse", "HEAD") -PrivateRoot $PrivateRoot).TrimEnd("`r", "`n")
  $actualTree = (Invoke-GitText -Git $Git -Root $Root -Arguments @("rev-parse", "HEAD^{tree}") -PrivateRoot $PrivateRoot).TrimEnd("`r", "`n")
  [void](Invoke-GitText -Git $Git -Root $Root -Arguments @("cat-file", "-e", "$Commit^{commit}") -PrivateRoot $PrivateRoot)
  if ($head -ne $Commit -or $actualTree -ne $Tree) { Fail-Procedure "HEAD and reviewed source identity disagree" }
  foreach ($arguments in @(
    @("diff", "--quiet"), @("diff", "--cached", "--quiet"), @("diff", "--check")
  )) { [void](Invoke-GitText -Git $Git -Root $Root -Arguments $arguments -PrivateRoot $PrivateRoot) }
  if ((Invoke-GitText -Git $Git -Root $Root -Arguments @("ls-files", "-u", "-z") -PrivateRoot $PrivateRoot).Length -ne 0) {
    Fail-Procedure "repository has unmerged entries"
  }
  $indexFlags = Invoke-GitText -Git $Git -Root $Root -Arguments @("ls-files", "-v") -PrivateRoot $PrivateRoot
  if ($indexFlags -match "(?m)^[a-z]") { Fail-Procedure "repository index suppresses an input path" }
  $sparseResult = Invoke-OptionalGitText -Git $Git -Root $Root -Arguments @("config", "--bool", "--get", "core.sparseCheckout") -PrivateRoot $PrivateRoot
  if ($sparseResult.ExitCode -notin @(0, 1)) { Fail-Procedure "sparse-checkout inspection failed" }
  if ($sparseResult.ExitCode -eq 0 -and $sparseResult.Stdout.Trim() -eq "true") { Fail-Procedure "sparse checkout is prohibited" }
  # Ignore exclusions are deliberately not part of the all-untracked custody inspection.
  if ((Invoke-GitText -Git $Git -Root $Root -Arguments @("ls-files", "--others", "-z") -PrivateRoot $PrivateRoot).Length -ne 0) {
    Fail-Procedure "repository has untracked or ignored state"
  }
  if (Test-Path -LiteralPath (Join-Path $Root "node_modules")) { Fail-Procedure "node_modules is prohibited" }
  foreach ($inputPath in @("package.json", "package-lock.json", ".npmrc", "scripts/run-ndqa003-windows-arm64-evidence.ps1", "src/evaluation/ndqa003-windows-arm64-evidence-launcher.mjs", "src/evaluation/ndqa003-windows-arm64-evidence-runner.mjs")) {
    [void](Invoke-GitText -Git $Git -Root $Root -Arguments @("ls-files", "--error-unmatch", "--", $inputPath) -PrivateRoot $PrivateRoot)
    if (-not (Test-Path -LiteralPath (Join-Path $Root $inputPath) -PathType Leaf)) {
      Fail-Procedure "immutable input is absent"
    }
  }
  return [ordered]@{
    Commit = $head; Tree = $actualTree; PackageLockSha256 = Get-Sha256 (Join-Path $Root "package-lock.json"); ProjectNpmrcSha256 = Get-Sha256 (Join-Path $Root ".npmrc")
    WrapperSha256 = Get-Sha256 (Join-Path $Root "scripts\run-ndqa003-windows-arm64-evidence.ps1")
    LauncherSha256 = Get-Sha256 (Join-Path $Root "src\evaluation\ndqa003-windows-arm64-evidence-launcher.mjs")
    RunnerSha256 = Get-Sha256 (Join-Path $Root "src\evaluation\ndqa003-windows-arm64-evidence-runner.mjs")
  }
}
function Invoke-OptionalGitText {
  param(
    [Parameter(Mandatory = $true)][string]$Git,
    [Parameter(Mandatory = $true)][string]$Root,
    [Parameter(Mandatory = $true)][string[]]$Arguments,
    [Parameter(Mandatory = $true)][string]$PrivateRoot
  )
  $private = Resolve-ExistingDirectory -Path $PrivateRoot -Label "Git private output root"
  $stdout = Join-Path $private ("git-" + [Guid]::NewGuid().ToString("N") + ".out")
  $stderr = Join-Path $private ("git-" + [Guid]::NewGuid().ToString("N") + ".err")
  try {
    $hostIdentity = Get-TrustedWindowsHost
    $environment = [ordered]@{ SystemRoot = $hostIdentity.SystemRoot; ComSpec = $hostIdentity.ComSpec; PATHEXT = $hostIdentity.PathExt; PATH = "$($hostIdentity.System32);$($hostIdentity.SystemRoot)" }
    $result = Invoke-PrivateProcess -FileName $Git -Arguments (@("--no-pager") + $Arguments) -WorkingDirectory $Root -Environment $environment -StdoutPath $stdout -StderrPath $stderr
    return [ordered]@{
      ExitCode = $result.ExitCode
      Stdout = Get-StrictUtf8Text -Bytes $result.StdoutBytes -Label "Git stdout"
      Stderr = Get-StrictUtf8Text -Bytes $result.StderrBytes -Label "Git stderr"
    }
  }
  finally {
    foreach ($path in @($stdout, $stderr)) {
      if (Test-Path -LiteralPath $path) { Remove-Item -LiteralPath $path -Force -ErrorAction Stop }
      if (Test-Path -LiteralPath $path) { Fail-Procedure "Git private-output cleanup failed" }
    }
  }
}
function Get-RuntimeProvenance {
  param(
    [Parameter(Mandatory = $true)][string]$Root,
    [Parameter(Mandatory = $true)][string]$ProvenancePath,
    [Parameter(Mandatory = $true)][string]$Checkout
  )
  $runtimeRoot = Resolve-ExistingDirectory -Path $Root -Label "isolated runtime root"
  Assert-OutsideCheckout -Checkout $Checkout -Path $runtimeRoot -Label "isolated runtime root"
  $provenance = Resolve-ExistingFile -Path $ProvenancePath -Label "runtime provenance record"
  Assert-OutsideCheckout -Checkout $Checkout -Path $provenance -Label "runtime provenance record"
  try { $record = Get-Content -Raw -LiteralPath $provenance | ConvertFrom-Json -AsHashtable -Depth 8 }
  catch { Fail-Procedure "runtime provenance record is not valid JSON" }
  $expectedKeys = @("schema", "node", "npmCmd", "npmCli")
  if ($record -isnot [System.Collections.IDictionary] -or -not (Test-ExactKeySet -Actual @($record.Keys) -Expected $expectedKeys)) {
    Fail-Procedure "runtime provenance record has an unexpected shape"
  }
  if ($record.schema -ne "nightdrive.ndqa003.isolated-runtime-provenance.v1") {
    Fail-Procedure "runtime provenance record schema is unsupported"
  }
  foreach ($field in @("node", "npmCmd", "npmCli")) {
    if ($record[$field] -isnot [System.Collections.IDictionary] -or -not (Test-ExactKeySet -Actual @($record[$field].Keys) -Expected @("path", "sha256"))) {
      Fail-Procedure "runtime provenance record entry is invalid"
    }
  }
  $node = Resolve-ExistingFile -Path $record.node.path -Label "isolated node executable"
  $npmCmd = Resolve-ExistingFile -Path $record.npmCmd.path -Label "isolated npm command shim"
  $npmCli = Resolve-ExistingFile -Path $record.npmCli.path -Label "isolated npm CLI entrypoint"
  $expectedNode = Resolve-ExistingFile -Path (Join-Path $runtimeRoot "node.exe") -Label "official isolated node.exe"
  $expectedNpmCmd = Resolve-ExistingFile -Path (Join-Path $runtimeRoot "npm.cmd") -Label "official isolated npm.cmd"
  $expectedNpmCli = Resolve-ExistingFile -Path (Join-Path $runtimeRoot "node_modules\npm\bin\npm-cli.js") -Label "official isolated npm CLI entrypoint"
  if ($node -cne $expectedNode -or $npmCmd -cne $expectedNpmCmd -or $npmCli -cne $expectedNpmCli) { Fail-Procedure "runtime provenance does not bind the official isolated Node/npm layout" }
  foreach ($path in @($node, $npmCmd, $npmCli)) {
    if (-not (Test-PathWithin -Parent $runtimeRoot -Candidate $path)) { Fail-Procedure "runtime provenance path escapes the isolated runtime" }
  }
  Assert-Sha256 -Actual (Get-Sha256 $node) -Expected $record.node.sha256.ToLowerInvariant() -Label "node.exe"
  Assert-Sha256 -Actual (Get-Sha256 $npmCmd) -Expected $record.npmCmd.sha256.ToLowerInvariant() -Label "npm.cmd"
  Assert-Sha256 -Actual (Get-Sha256 $npmCli) -Expected $record.npmCli.sha256.ToLowerInvariant() -Label "npm CLI"
  $npmCmdText = Get-StrictUtf8Text -Bytes ([IO.File]::ReadAllBytes($npmCmd)) -Label "npm.cmd"
  if ($npmCmdText -notmatch '(?i)%~dp0\\node\.exe' -or $npmCmdText -notmatch '(?i)%~dp0\\node_modules\\npm\\bin\\npm-cli\.js') { Fail-Procedure "npm.cmd does not bind the verified isolated Node and CLI entrypoint" }
  return [ordered]@{
    Root = $runtimeRoot; Node = $node; NpmCmd = $npmCmd; NpmCli = $npmCli
    NodeSha256 = Get-Sha256 $node; NpmCmdSha256 = Get-Sha256 $npmCmd; NpmCliSha256 = Get-Sha256 $npmCli
    NodeVersionCommandIdentity = "NOT AVAILABLE"; NpmVersionCommandIdentity = "NOT AVAILABLE"
    NodeVersion = "NOT AVAILABLE"; NpmVersion = "NOT AVAILABLE"; NodeVersionMatched = $false; NpmVersionMatched = $false
    RuntimeProvenanceMatched = $true; NpmCmdBindingMatched = $true; LauncherNodeIdentityMatched = $false
  }
}

function Assert-RuntimeProvenanceStillBound {
  param([Parameter(Mandatory = $true)][System.Collections.IDictionary]$Runtime)
  if ((Get-Sha256 $Runtime.Node) -ne $Runtime.NodeSha256 -or (Get-Sha256 $Runtime.NpmCmd) -ne $Runtime.NpmCmdSha256 -or (Get-Sha256 $Runtime.NpmCli) -ne $Runtime.NpmCliSha256) { Fail-Procedure "isolated runtime provenance changed after preflight" }
  $npmCmdText = Get-StrictUtf8Text -Bytes ([IO.File]::ReadAllBytes($Runtime.NpmCmd)) -Label "npm.cmd"
  if ($npmCmdText -notmatch '(?i)%~dp0\\node\.exe' -or $npmCmdText -notmatch '(?i)%~dp0\\node_modules\\npm\\bin\\npm-cli\.js') { Fail-Procedure "npm.cmd no longer binds the verified isolated Node and CLI entrypoint" }
}

function Get-TrustedWindowsHost {
  if (-not [System.Runtime.InteropServices.RuntimeInformation]::IsOSPlatform([System.Runtime.InteropServices.OSPlatform]::Windows)) {
    Fail-Procedure "native Windows host is required"
  }
  $nativeArchitecture = [System.Runtime.InteropServices.RuntimeInformation]::OSArchitecture
  $processArchitecture = [System.Runtime.InteropServices.RuntimeInformation]::ProcessArchitecture
  if ($nativeArchitecture -ne [System.Runtime.InteropServices.Architecture]::Arm64 -or $processArchitecture -ne [System.Runtime.InteropServices.Architecture]::Arm64) {
    Fail-Procedure "native Windows ARM64 process and host are required"
  }
  $system32 = Resolve-ExistingDirectory -Path [Environment]::SystemDirectory -Label "Windows system directory"
  $systemRoot = Resolve-ExistingDirectory -Path (Split-Path -Parent $system32) -Label "Windows root directory"
  $commandInterpreter = Resolve-ExistingFile -Path (Join-Path $system32 "cmd.exe") -Label "Windows command interpreter"
  return [ordered]@{
    SystemRoot = $systemRoot; System32 = $system32; ComSpec = $commandInterpreter; PathExt = ".COM;.EXE;.BAT;.CMD"
    OsFamily = "windows"; HostArchitecture = "arm64"; ProcessArchitecture = "arm64"; NativeArm64 = $true
  }
}

function New-TaskLayout {
  param(
    [Parameter(Mandatory = $true)][string]$Checkout,
    [Parameter(Mandatory = $true)][string]$ReceiptPath,
    [Parameter(Mandatory = $true)][string]$StableRecoveryRoot
  )
  $receipt = [IO.Path]::GetFullPath($ReceiptPath)
  $recovery = $null
  $scratch = $null
  $roles = $null
  $createdRecovery = $false
  $scratchCreated = $false
  $privateScratchEstablished = $false
  try {
    $receipt = Resolve-TrustedReceiptDirectory -Checkout $Checkout -ReceiptPath $receipt
    $receiptParent = Resolve-ExistingDirectory -Path (Split-Path -Parent $receipt) -Label "receipt parent"
    $recoveryCandidate = [IO.Path]::GetFullPath($StableRecoveryRoot)
    Assert-NoReparsePointAncestor -Path $recoveryCandidate -Label "stable recovery root"
    if (Test-Path -LiteralPath $recoveryCandidate) {
      $recovery = Resolve-ExistingDirectory -Path $recoveryCandidate -Label "stable recovery root"
      Assert-OutsideCheckout -Checkout $Checkout -Path $recovery -Label "stable recovery root"
      # An existing root can only be a prior task-owned crash-recovery root.
      # Never replace ACLs on an unverified caller-supplied directory.
      Assert-PrivateAcl -Path $recovery -IsDirectory $true
      Assert-RecoveryRootContents -Recovery $recovery
    }
    else {
      $recoveryParent = Resolve-ExistingDirectory -Path (Split-Path -Parent $recoveryCandidate) -Label "stable recovery parent"
      Assert-OutsideCheckout -Checkout $Checkout -Path $recoveryParent -Label "stable recovery parent"
      try { New-Item -ItemType Directory -LiteralPath $recoveryCandidate -ErrorAction Stop | Out-Null }
      catch { Fail-Procedure "stable recovery root cannot be exclusively created" }
      $createdRecovery = $true
      $recovery = Resolve-ExistingDirectory -Path $recoveryCandidate -Label "stable recovery root"
      Set-PrivateAcl -Path $recovery -IsDirectory $true
      Assert-RecoveryRootContents -Recovery $recovery
    }
    if (Test-PathWithin -Parent $receiptParent -Candidate $recovery -or Test-PathWithin -Parent $recovery -Candidate $receiptParent) {
      Fail-Procedure "recovery root must be separate from receipt scratch"
    }
    $scratch = Join-Path $receiptParent ("ndqa003-windows-arm64-private-" + [Guid]::NewGuid().ToString("N"))
    if (Test-Path -LiteralPath $scratch) { Fail-Procedure "private scratch collision" }
    New-Item -ItemType Directory -LiteralPath $scratch -ErrorAction Stop | Out-Null
    $scratchCreated = $true
    Set-PrivateAcl -Path $scratch -IsDirectory $true
    $privateScratchEstablished = $true
    $roles = [ordered]@{}
    foreach ($role in @("states", "fixtures", "git")) {
      $rolePath = Join-Path $scratch $role
      New-Item -ItemType Directory -LiteralPath $rolePath -ErrorAction Stop | Out-Null
      Set-PrivateAcl -Path $rolePath -IsDirectory $true
      $roles[$role] = $rolePath
    }
    foreach ($candidate in @($scratch) + @($roles.Values)) { Assert-OutsideCheckout -Checkout $Checkout -Path $candidate -Label "task-private path" }
    return [ordered]@{ Receipt = $receipt; Recovery = $recovery; Scratch = $scratch; Roles = $roles }
  }
  catch {
    $layoutFailure = $_
    if ($privateScratchEstablished -and $null -ne $scratch -and (Test-Path -LiteralPath $scratch)) {
      try { Clear-PrivateTaskData -Scratch $scratch }
      catch { Fail-Procedure "private task-layout cleanup cannot be verified" }
    }
    elseif ($scratchCreated -and $null -ne $scratch -and (Test-Path -LiteralPath $scratch)) {
      Fail-Procedure "private task-layout scratch boundary cannot be cleaned safely"
    }
    if ($createdRecovery -and $null -ne $recovery -and (Test-Path -LiteralPath $recovery)) {
      try {
        Assert-PrivateAcl -Path $recovery -IsDirectory $true
        Assert-RecoveryRootContents -Recovery $recovery
        Remove-Item -LiteralPath $recovery -Force -ErrorAction Stop
        if (Test-Path -LiteralPath $recovery) { Fail-Procedure "new stable recovery root cleanup cannot be verified" }
      }
      catch { Fail-Procedure "new stable recovery root cleanup cannot be verified" }
    }
    throw $layoutFailure
  }
}

function New-NpmInvocationState {
  param(
    [Parameter(Mandatory = $true)][System.Collections.IDictionary]$Layout,
    [Parameter(Mandatory = $true)][string]$Checkout
  )
  $root = Join-Path $Layout.Roles.states ("invocation-" + [Guid]::NewGuid().ToString("N"))
  if (Test-Path -LiteralPath $root) { Fail-Procedure "private npm invocation-state collision" }
  $created = $false
  try {
    New-Item -ItemType Directory -LiteralPath $root -ErrorAction Stop | Out-Null
    $created = $true
    Set-PrivateAcl -Path $root -IsDirectory $true
    $roles = [ordered]@{}
    foreach ($role in @("home", "appdata", "localappdata", "temp", "cache", "logs", "raw", "configs")) {
      $rolePath = Join-Path $root $role
      New-Item -ItemType Directory -LiteralPath $rolePath -ErrorAction Stop | Out-Null
      Set-PrivateAcl -Path $rolePath -IsDirectory $true
      $roles[$role] = $rolePath
    }
    $roles.userConfig = Join-Path $roles.configs "user.npmrc"
    $roles.globalConfig = Join-Path $roles.configs "global.npmrc"
    [IO.File]::WriteAllBytes($roles.userConfig, [byte[]]@())
    [IO.File]::WriteAllBytes($roles.globalConfig, [byte[]]@())
    Set-PrivateAcl -Path $roles.userConfig -IsDirectory $false
    Set-PrivateAcl -Path $roles.globalConfig -IsDirectory $false
    foreach ($role in @("cache", "logs", "raw")) {
      if (@(Get-ChildItem -LiteralPath $roles[$role] -Force -ErrorAction Stop).Count -ne 0) { Fail-Procedure "fresh npm invocation state is not empty" }
    }
    foreach ($candidate in @($root) + @($roles.Values)) { Assert-OutsideCheckout -Checkout $Checkout -Path $candidate -Label "invocation-private path" }
    return [ordered]@{ Root = $root; Roles = $roles; FreshInvocationState = $true; FreshCacheEmpty = $true }
  }
  catch {
    $stateFailure = $_
    if ($created -and (Test-Path -LiteralPath $root)) {
      try { Clear-PrivateTaskData -Scratch $root }
      catch { Fail-Procedure "private npm invocation-state cleanup cannot be verified" }
    }
    throw $stateFailure
  }
}

function Get-SterileNpmEnvironment {
  param(
    [Parameter(Mandatory = $true)][System.Collections.IDictionary]$Runtime,
    [Parameter(Mandatory = $true)][System.Collections.IDictionary]$State,
    [Parameter(Mandatory = $true)][System.Collections.IDictionary]$Host
  )
  $runtimeDirectory = Split-Path -Parent $Runtime.Node
  $environment = [ordered]@{
    SystemRoot = $Host.SystemRoot; ComSpec = $Host.ComSpec; PATHEXT = $Host.PathExt; PATH = "$runtimeDirectory;$($Host.System32);$($Host.SystemRoot)"
    HOME = $State.Roles.home; USERPROFILE = $State.Roles.home; APPDATA = $State.Roles.appdata
    LOCALAPPDATA = $State.Roles.localappdata; TEMP = $State.Roles.temp; TMP = $State.Roles.temp
    NPM_CONFIG_USERCONFIG = $State.Roles.userConfig; NPM_CONFIG_GLOBALCONFIG = $State.Roles.globalConfig
    NPM_CONFIG_CACHE = $State.Roles.cache; NPM_CONFIG_LOGS_DIR = $State.Roles.logs
  }
  $allowed = @("SYSTEMROOT", "COMSPEC", "PATHEXT", "PATH", "HOME", "USERPROFILE", "APPDATA", "LOCALAPPDATA", "TEMP", "TMP", "NPM_CONFIG_USERCONFIG", "NPM_CONFIG_GLOBALCONFIG", "NPM_CONFIG_CACHE", "NPM_CONFIG_LOGS_DIR")
  if (-not (Test-ExactKeySet -Actual @($environment.Keys | ForEach-Object { $_.ToUpperInvariant() }) -Expected $allowed)) {
    Fail-Procedure "sterile npm environment is not closed"
  }
  return $environment
}

function Get-StrictUtf8Text {
  param([Parameter(Mandatory = $true)][byte[]]$Bytes, [Parameter(Mandatory = $true)][string]$Label)
  try { return [Text.UTF8Encoding]::new($false, $true).GetString($Bytes) }
  catch { Fail-Procedure "$Label is not strict UTF-8" }
}

function Invoke-NpmCommand {
  param(
    [Parameter(Mandatory = $true)][System.Collections.IDictionary]$Runtime,
    [Parameter(Mandatory = $true)][System.Collections.IDictionary]$Environment,
    [Parameter(Mandatory = $true)][System.Collections.IDictionary]$Host,
    [Parameter(Mandatory = $true)][string]$WorkingDirectory,
    [Parameter(Mandatory = $true)][string[]]$NpmArguments,
    [Parameter(Mandatory = $true)][System.Collections.IDictionary]$State,
    [Parameter(Mandatory = $true)][string]$Label
  )
  Assert-RuntimeProvenanceStillBound -Runtime $Runtime
  $stdout = Join-Path $State.Roles.raw ("$Label.stdout")
  $stderr = Join-Path $State.Roles.raw ("$Label.stderr")
  return Invoke-PrivateProcess -FileName $Host.ComSpec -Arguments (@("/d", "/s", "/c", $Runtime.NpmCmd) + $NpmArguments) -WorkingDirectory $WorkingDirectory -Environment $Environment -StdoutPath $stdout -StderrPath $stderr
}

function Assert-NpmConfigurationSources {
  param([Parameter(Mandatory = $true)][string]$Checkout, [Parameter(Mandatory = $true)][System.Collections.IDictionary]$State)
  $projectNpmrc = Get-Content -Raw -LiteralPath (Join-Path $Checkout ".npmrc")
  if ($projectNpmrc -notmatch "^save-exact=true\r?\n$") { Fail-Procedure "tracked project npm configuration is not the accepted source" }
  foreach ($configPath in @($State.Roles.userConfig, $State.Roles.globalConfig)) {
    if ([IO.File]::ReadAllBytes($configPath).Length -ne 0) { Fail-Procedure "controlled npm configuration is not empty" }
  }
  if ($projectNpmrc -match "(?im)(?:_auth|token|password|username|email|cert|key|proxy|registry|workspace|workspaces)\s*=") {
    Fail-Procedure "npm configuration has a prohibited directive"
  }
}

function Invoke-FreshNpmCommand {
  param(
    [Parameter(Mandatory = $true)][System.Collections.IDictionary]$Runtime,
    [Parameter(Mandatory = $true)][System.Collections.IDictionary]$Layout,
    [Parameter(Mandatory = $true)][System.Collections.IDictionary]$Host,
    [Parameter(Mandatory = $true)][string]$Checkout,
    [Parameter(Mandatory = $true)][string]$WorkingDirectory,
    [Parameter(Mandatory = $true)][string[]]$NpmArguments,
    [Parameter(Mandatory = $true)][string]$Label
  )
  $state = New-NpmInvocationState -Layout $Layout -Checkout $Checkout
  try {
    Assert-NpmConfigurationSources -Checkout $Checkout -State $state
    $environment = Get-SterileNpmEnvironment -Runtime $Runtime -State $state -Host $Host
    $result = Invoke-NpmCommand -Runtime $Runtime -Environment $environment -Host $Host -WorkingDirectory $WorkingDirectory -NpmArguments $NpmArguments -State $state -Label $Label
    return [ordered]@{ Result = $result; UserConfig = $state.Roles.userConfig; GlobalConfig = $state.Roles.globalConfig; FreshInvocationState = ($state.FreshInvocationState -eq $true); FreshCacheEmpty = ($state.FreshCacheEmpty -eq $true) }
  }
  finally { Clear-PrivateTaskData -Scratch $state.Root }
}

function Invoke-FreshNodeCommand {
  param(
    [Parameter(Mandatory = $true)][System.Collections.IDictionary]$Runtime,
    [Parameter(Mandatory = $true)][System.Collections.IDictionary]$Layout,
    [Parameter(Mandatory = $true)][System.Collections.IDictionary]$Host,
    [Parameter(Mandatory = $true)][string]$Checkout,
    [Parameter(Mandatory = $true)][string[]]$Arguments,
    [Parameter(Mandatory = $true)][string]$Label
  )
  $state = New-NpmInvocationState -Layout $Layout -Checkout $Checkout
  try {
    Assert-RuntimeProvenanceStillBound -Runtime $Runtime
    Assert-NpmConfigurationSources -Checkout $Checkout -State $state
    $environment = Get-SterileNpmEnvironment -Runtime $Runtime -State $state -Host $Host
    $stdout = Join-Path $state.Roles.raw ("$Label.stdout")
    $stderr = Join-Path $state.Roles.raw ("$Label.stderr")
    return Invoke-PrivateProcess -FileName $Runtime.Node -Arguments $Arguments -WorkingDirectory $Checkout -Environment $environment -StdoutPath $stdout -StderrPath $stderr
  }
  finally { Clear-PrivateTaskData -Scratch $state.Root }
}

function Assert-ExactToolchain {
  param(
    [Parameter(Mandatory = $true)][System.Collections.IDictionary]$Runtime,
    [Parameter(Mandatory = $true)][System.Collections.IDictionary]$Layout,
    [Parameter(Mandatory = $true)][System.Collections.IDictionary]$Host,
    [Parameter(Mandatory = $true)][string]$Checkout
  )
  $node = Invoke-FreshNodeCommand -Runtime $Runtime -Layout $Layout -Host $Host -Checkout $Checkout -Arguments @("--version") -Label "node-version"
  $nodeText = Get-StrictUtf8Text -Bytes $node.StdoutBytes -Label "Node version stdout"
  if ($node.ExitCode -ne 0 -or (Remove-OneTerminalLineEnding -Value $nodeText) -ne $ExpectedNodeVersion -or $node.StderrBytes.Length -ne 0) { Fail-Procedure "isolated Node version is not exact" }
  $Runtime.NodeVersion = $ExpectedNodeVersion
  $Runtime.NodeVersionMatched = $true
  $Runtime.NodeVersionCommandIdentity = Get-CommandIdentity -Label "node-version" -Runtime $Runtime -Arguments @("--version")
  $npm = Invoke-FreshNpmCommand -Runtime $Runtime -Layout $Layout -Host $Host -Checkout $Checkout -WorkingDirectory $Checkout -NpmArguments @("--version") -Label "npm-version"
  $npmText = Get-StrictUtf8Text -Bytes $npm.Result.StdoutBytes -Label "npm version stdout"
  if ($npm.Result.ExitCode -ne 0 -or (Remove-OneTerminalLineEnding -Value $npmText) -ne $ExpectedNpmVersion -or $npm.Result.StderrBytes.Length -ne 0) { Fail-Procedure "isolated npm version is not exact" }
  $Runtime.NpmVersion = $ExpectedNpmVersion
  $Runtime.NpmVersionMatched = $true
  $Runtime.NpmVersionCommandIdentity = Get-CommandIdentity -Label "npm-version" -Runtime $Runtime -Arguments @("--version")
}

function Remove-OneTerminalLineEnding {
  param([Parameter(Mandatory = $true)][string]$Value)
  if ($Value.EndsWith("`r`n")) { return $Value.Substring(0, $Value.Length - 2) }
  if ($Value.EndsWith("`n")) { return $Value.Substring(0, $Value.Length - 1) }
  return $Value
}

function Assert-NpmConfiguration {
  param(
    [Parameter(Mandatory = $true)][System.Collections.IDictionary]$Runtime,
    [Parameter(Mandatory = $true)][System.Collections.IDictionary]$Layout,
    [Parameter(Mandatory = $true)][System.Collections.IDictionary]$Host,
    [Parameter(Mandatory = $true)][string]$Checkout
  )
  $raw = [ordered]@{}
  foreach ($probe in $ProbeOrder) {
    $invocation = Invoke-FreshNpmCommand -Runtime $Runtime -Layout $Layout -Host $Host -Checkout $Checkout -WorkingDirectory $Checkout -NpmArguments @("config", "get", $probe) -Label ("probe-" + $probe)
    $result = $invocation.Result
    if ($result.ExitCode -ne 0 -or $result.StderrBytes.Length -ne 0) { Fail-Procedure "npm configuration probe is unavailable" }
    $token = Remove-OneTerminalLineEnding -Value (Get-StrictUtf8Text -Bytes $result.StdoutBytes -Label "npm configuration probe stdout")
    if ($token.Contains("`r") -or $token.Contains("`n")) { Fail-Procedure "npm configuration probe is multiline" }
    if (($probe -eq "userconfig" -and $token -ne $invocation.UserConfig) -or ($probe -eq "globalconfig" -and $token -ne $invocation.GlobalConfig)) {
      Fail-Procedure "npm configuration source mismatch"
    }
    $raw[$probe] = $token
  }
  if (
    $raw.registry -ne $ExpectedRegistry -or $raw.proxy -ne "null" -or $raw."https-proxy" -ne "null" -or
    $raw.omit -ne "" -or $raw.production -ne "false" -or $raw.offline -ne "false" -or
    $raw."prefer-offline" -ne "false" -or $raw."package-lock" -ne "true" -or
    $raw.workspace -ne "" -or $raw.workspaces -ne "null"
  ) { Fail-Procedure "npm configuration does not satisfy the accepted policy" }
  return [ordered]@{
    allowlistVersion = "nightdrive.ndqa003.windows-arm64-npm-environment.v1"; probeSetVersion = "nightdrive.ndqa003.windows-arm64-npm-probes.v1"; probeSetExitClass = "COMPLETE"
    credentialBearingInputAbsent = $true; controlledConfigEmpty = $true; effectiveRegistryMatches = $true
    networkModeOnline = $true; noScopeReduction = $true; proxiesAbsent = $true; workspaceSelectionInactive = $true
  }
}
function Set-PrivateAcl {
  param([Parameter(Mandatory = $true)][string]$Path, [Parameter(Mandatory = $true)][bool]$IsDirectory)
  $current = [Security.Principal.WindowsIdentity]::GetCurrent().User
  $system = [Security.Principal.SecurityIdentifier]::new("S-1-5-18")
  $rights = [Security.AccessControl.FileSystemRights]::FullControl
  $inheritance = if ($IsDirectory) { [Security.AccessControl.InheritanceFlags]::ContainerInherit -bor [Security.AccessControl.InheritanceFlags]::ObjectInherit } else { [Security.AccessControl.InheritanceFlags]::None }
  $acl = if ($IsDirectory) { [Security.AccessControl.DirectorySecurity]::new() } else { [Security.AccessControl.FileSecurity]::new() }
  $acl.SetAccessRuleProtection($true, $false)
  $acl.SetOwner($current)
  foreach ($identity in @($current, $system)) {
    $rule = [Security.AccessControl.FileSystemAccessRule]::new($identity, $rights, $inheritance, [Security.AccessControl.PropagationFlags]::None, [Security.AccessControl.AccessControlType]::Allow)
    [void]$acl.AddAccessRule($rule)
  }
  try {
    Set-Acl -LiteralPath $Path -AclObject $acl
  }
  catch { Fail-Procedure "recovery ACL cannot be applied and verified" }
  Assert-PrivateAcl -Path $Path -IsDirectory $IsDirectory
}

function Assert-PrivateAcl {
  param([Parameter(Mandatory = $true)][string]$Path, [Parameter(Mandatory = $true)][bool]$IsDirectory)
  $current = [Security.Principal.WindowsIdentity]::GetCurrent().User
  $system = [Security.Principal.SecurityIdentifier]::new("S-1-5-18")
  $rights = [Security.AccessControl.FileSystemRights]::FullControl
  $inheritance = if ($IsDirectory) { [Security.AccessControl.InheritanceFlags]::ContainerInherit -bor [Security.AccessControl.InheritanceFlags]::ObjectInherit } else { [Security.AccessControl.InheritanceFlags]::None }
  try { $verified = Get-Acl -LiteralPath $Path -ErrorAction Stop }
  catch { Fail-Procedure "private recovery ACL cannot be inspected" }
  try { $owner = $verified.GetOwner([Security.Principal.SecurityIdentifier]) }
  catch { Fail-Procedure "private recovery owner cannot be inspected" }
  if ($owner.Value -ne $current.Value) { Fail-Procedure "private recovery owner is not the invoking identity" }
  if (-not $verified.AreAccessRulesProtected -or -not $verified.AreAccessRulesCanonical) { Fail-Procedure "private recovery ACL is not protected and canonical" }
  $rules = @($verified.GetAccessRules($true, $false, [Security.Principal.SecurityIdentifier]))
  if ($rules.Count -ne 2) { Fail-Procedure "private recovery ACL has an unexpected access rule" }
  foreach ($identity in @($current, $system)) {
    $matches = @($rules | Where-Object { $_.IdentityReference.Value -eq $identity.Value })
    if ($matches.Count -ne 1) { Fail-Procedure "private recovery ACL does not bind an intended identity exactly once" }
    $rule = $matches[0]
    if ($rule.AccessControlType -ne [Security.AccessControl.AccessControlType]::Allow -or $rule.FileSystemRights -ne $rights) { Fail-Procedure "private recovery ACL rights are not exact" }
    if ($IsDirectory -and $rule.InheritanceFlags -ne $inheritance) { Fail-Procedure "private recovery directory ACL inheritance is not exact" }
    if (-not $IsDirectory -and $rule.InheritanceFlags -ne [Security.AccessControl.InheritanceFlags]::None) { Fail-Procedure "private recovery file ACL inheritance is not exact" }
  }
}

function Assert-RecoveryRootContents {
  param([Parameter(Mandatory = $true)][string]$Recovery, [switch]$LockHeld)
  $entries = @(Get-ChildItem -LiteralPath $Recovery -Force -ErrorAction Stop)
  $allowed = @("ndqa003-windows-arm64-recovery.json")
  if ($LockHeld) { $allowed += "ndqa003-windows-arm64-recovery.lock" }
  foreach ($entry in $entries) {
    if ($entry.Name -cnotin $allowed -or $entry.PSIsContainer) { Fail-Procedure "stable recovery root has unexpected state" }
  }
  if (@($entries | Where-Object { $_.Name -ceq "ndqa003-windows-arm64-recovery.json" }).Count -gt 1) { Fail-Procedure "stable recovery root has multiple markers" }
}

function Get-RecoveryLockPath {
  param([Parameter(Mandatory = $true)][string]$Recovery)
  return (Join-Path $Recovery "ndqa003-windows-arm64-recovery.lock")
}

function Enter-RecoveryBoundary {
  param([Parameter(Mandatory = $true)][string]$Recovery)
  Assert-PrivateAcl -Path $Recovery -IsDirectory $true
  Assert-RecoveryRootContents -Recovery $Recovery
  $lockPath = Get-RecoveryLockPath -Recovery $Recovery
  if (Test-Path -LiteralPath $lockPath) { Fail-Procedure "recovery boundary is already active or unresolved" }
  $stream = $null
  $lockCreated = $false
  try {
    $stream = [IO.FileStream]::new($lockPath, [IO.FileMode]::CreateNew, [IO.FileAccess]::ReadWrite, [IO.FileShare]::None, 1, ([IO.FileOptions]::DeleteOnClose -bor [IO.FileOptions]::WriteThrough))
    $lockCreated = $true
    Set-PrivateAcl -Path $lockPath -IsDirectory $false
    $stream.Flush($true)
    Assert-RecoveryRootContents -Recovery $Recovery -LockHeld
    return [ordered]@{ Path = $lockPath; Stream = $stream }
  }
  catch {
    $acquisitionFailure = $_
    $cleanupFailure = $null
    if ($null -ne $stream) {
      try { $stream.Dispose() }
      catch { $cleanupFailure = $_ }
    }
    if ($lockCreated -and (Test-Path -LiteralPath $lockPath)) {
      try { Remove-Item -LiteralPath $lockPath -Force -ErrorAction Stop }
      catch { $cleanupFailure = $_ }
    }
    if (($lockCreated -and (Test-Path -LiteralPath $lockPath)) -or $null -ne $cleanupFailure) { Fail-Procedure "recovery boundary acquisition cleanup cannot be verified" }
    throw $acquisitionFailure
  }
}

function Exit-RecoveryBoundary {
  param([Parameter(Mandatory = $true)][System.Collections.IDictionary]$Boundary, [Parameter(Mandatory = $true)][string]$Recovery)
  try { $Boundary.Stream.Dispose() }
  finally {
    if (Test-Path -LiteralPath $Boundary.Path) { Remove-Item -LiteralPath $Boundary.Path -Force -ErrorAction Stop }
    Assert-RecoveryRootContents -Recovery $Recovery
    if (Test-Path -LiteralPath (Get-RecoveryMarkerPath -Recovery $Recovery)) { Fail-Procedure "recovery marker remains after controlled wrapper exit" }
  }
}

function Get-RecoveryMarkerPath {
  param([Parameter(Mandatory = $true)][string]$Recovery)
  return (Join-Path $Recovery "ndqa003-windows-arm64-recovery.json")
}

function Get-MarkerBodyHash {
  param([Parameter(Mandatory = $true)][System.Collections.IDictionary]$Body)
  $json = $Body | ConvertTo-Json -Compress -Depth 8
  return [Convert]::ToHexString([Security.Cryptography.SHA256]::HashData([Text.UTF8Encoding]::new($false).GetBytes($json))).ToLowerInvariant()
}

function Write-RecoveryMarker {
  param(
    [Parameter(Mandatory = $true)][string]$Recovery,
    [Parameter(Mandatory = $true)][string]$RuleName,
    [Parameter(Mandatory = $true)][System.Collections.IDictionary]$Runtime
  )
  Assert-RecoveryRootContents -Recovery $Recovery -LockHeld
  $marker = Get-RecoveryMarkerPath -Recovery $Recovery
  if (Test-Path -LiteralPath $marker) { Fail-Procedure "recovery marker already exists" }
  $body = [ordered]@{
    ProcedureVersion = $ProcedureVersion; RuleName = $RuleName; NodeSha256 = $Runtime.NodeSha256
    NodePath = $Runtime.Node; Attributes = [ordered]@{ Direction = "Outbound"; Action = "Block"; Enabled = $true; Profile = "Any"; PolicyStore = "PersistentStore" }
  }
  $record = [ordered]@{ Body = $body; IntegritySha256 = Get-MarkerBodyHash -Body $body }
  $bytes = [Text.UTF8Encoding]::new($false).GetBytes(($record | ConvertTo-Json -Compress -Depth 8))
  $stream = [IO.FileStream]::new($marker, [IO.FileMode]::CreateNew, [IO.FileAccess]::Write, [IO.FileShare]::None, 4096, [IO.FileOptions]::WriteThrough)
  try { $stream.Write($bytes, 0, $bytes.Length); $stream.Flush($true) }
  finally { $stream.Dispose() }
  Set-PrivateAcl -Path $marker -IsDirectory $false
  $persisted = [IO.File]::ReadAllBytes($marker)
  if (-not [Linq.Enumerable]::SequenceEqual[byte]($bytes, $persisted)) { Fail-Procedure "recovery marker changed after write" }
  return (Get-Sha256 $marker)
}

function Read-RecoveryMarker {
  param([Parameter(Mandatory = $true)][string]$Recovery)
  $marker = Get-RecoveryMarkerPath -Recovery $Recovery
  if (-not (Test-Path -LiteralPath $marker)) { return $null }
  Assert-PrivateAcl -Path $marker -IsDirectory $false
  try { $record = Get-Content -Raw -LiteralPath $marker | ConvertFrom-Json -AsHashtable -Depth 8 }
  catch { Fail-Procedure "recovery marker is malformed" }
  if ($record -isnot [System.Collections.IDictionary] -or -not (Test-ExactKeySet -Actual @($record.Keys) -Expected @("Body", "IntegritySha256"))) { Fail-Procedure "recovery marker has an unexpected shape" }
  if ($record.Body -isnot [System.Collections.IDictionary] -or $record.IntegritySha256 -notmatch "^[0-9a-f]{64}$") { Fail-Procedure "recovery marker has invalid content" }
  if (-not (Test-ExactKeySet -Actual @($record.Body.Keys) -Expected @("ProcedureVersion", "RuleName", "NodeSha256", "NodePath", "Attributes"))) { Fail-Procedure "recovery marker binding is incomplete" }
  if ($record.Body.Attributes -isnot [System.Collections.IDictionary] -or -not (Test-ExactKeySet -Actual @($record.Body.Attributes.Keys) -Expected @("Direction", "Action", "Enabled", "Profile", "PolicyStore"))) { Fail-Procedure "recovery marker attributes are incomplete" }
  if ((Get-MarkerBodyHash -Body $record.Body) -ne $record.IntegritySha256) { Fail-Procedure "recovery marker self-integrity failed" }
  if ($record.Body.ProcedureVersion -ne $ProcedureVersion -or $record.Body.RuleName -notmatch "^NDQA003-[0-9a-f]{32}$" -or $record.Body.NodeSha256 -notmatch "^[0-9a-f]{64}$" -or $record.Body.Attributes.Direction -ne "Outbound" -or $record.Body.Attributes.Action -ne "Block" -or $record.Body.Attributes.Enabled -ne $true -or $record.Body.Attributes.Profile -ne "Any" -or $record.Body.Attributes.PolicyStore -ne "PersistentStore") { Fail-Procedure "recovery marker binding is invalid" }
  return $record.Body
}

function Get-ExactFirewallRule {
  param([Parameter(Mandatory = $true)][string]$RuleName, [Parameter(Mandatory = $true)][string]$PolicyStore)
  try { $rules = @(Get-NetFirewallRule -Name $RuleName -PolicyStore $PolicyStore -ErrorAction Stop) }
  catch {
    if ($_.Exception -is [System.Management.Automation.ItemNotFoundException] -or $_.FullyQualifiedErrorId -eq "NoMatchingMSFT_NetFirewallRuleObjectsFound,Get-NetFirewallRule") {
      return $null
    }
    Fail-Procedure "task firewall rule inspection is unavailable"
  }
  if ($rules.Count -gt 1) { Fail-Procedure "multiple task firewall rules exist" }
  return if ($rules.Count -eq 1) { $rules[0] } else { $null }
}

function Assert-AllFirewallProfilesEnabled {
  try { $profiles = @(Get-NetFirewallProfile -ErrorAction Stop) }
  catch { Fail-Procedure "Windows firewall profile inspection is unavailable" }
  if ($profiles.Count -ne 3 -or @($profiles | Where-Object { $_.Enabled -ne "True" -and $_.Enabled -ne $true }).Count -ne 0) { Fail-Procedure "all Windows firewall profiles must remain enabled" }
}

function Assert-RuntimeCollisionAbsent {
  param([Parameter(Mandatory = $true)][string]$NodePath)
  try { $processes = @(Get-Process -ErrorAction Stop | Where-Object { $_.ProcessName -ieq "node" }) }
  catch { Fail-Procedure "isolated runtime collision cannot be inspected" }
  foreach ($process in $processes) {
    try { $processPath = $process.Path }
    catch { Fail-Procedure "isolated runtime collision cannot be inspected" }
    if ([string]::IsNullOrWhiteSpace($processPath)) { Fail-Procedure "isolated runtime collision cannot be inspected" }
    if ([IO.Path]::GetFullPath($processPath) -eq [IO.Path]::GetFullPath($NodePath)) { Fail-Procedure "isolated runtime has a live process collision" }
  }
}

function Assert-ExactFirewallRule {
  param([Parameter(Mandatory = $true)][string]$RuleName, [Parameter(Mandatory = $true)][string]$NodePath)
  Assert-AllFirewallProfilesEnabled
  Assert-RuntimeCollisionAbsent -NodePath $NodePath
  $persistent = Get-ExactFirewallRule -RuleName $RuleName -PolicyStore "PersistentStore"
  $active = Get-ExactFirewallRule -RuleName $RuleName -PolicyStore "ActiveStore"
  if ($null -eq $persistent -or $null -eq $active) { Fail-Procedure "task firewall rule is not present in both stores" }
  foreach ($rule in @($persistent, $active)) {
    if ($rule.Direction -ne "Outbound" -or $rule.Action -ne "Block" -or ($rule.Enabled -ne "True" -and $rule.Enabled -ne $true) -or $rule.Profile -ne "Any") { Fail-Procedure "task firewall rule semantics are not exact" }
    $application = @(Get-NetFirewallApplicationFilter -AssociatedNetFirewallRule $rule -ErrorAction Stop)
    $port = @(Get-NetFirewallPortFilter -AssociatedNetFirewallRule $rule -ErrorAction Stop)
    $address = @(Get-NetFirewallAddressFilter -AssociatedNetFirewallRule $rule -ErrorAction Stop)
    $service = @(Get-NetFirewallServiceFilter -AssociatedNetFirewallRule $rule -ErrorAction Stop)
    $interface = @(Get-NetFirewallInterfaceFilter -AssociatedNetFirewallRule $rule -ErrorAction Stop)
    $security = @(Get-NetFirewallSecurityFilter -AssociatedNetFirewallRule $rule -ErrorAction Stop)
    if ($application.Count -ne 1 -or $application[0].Program -ne $NodePath -or @("", "Any") -notcontains [string]$application[0].Package) { Fail-Procedure "task firewall application scope is not exact" }
    if ($port.Count -ne 1 -or $address.Count -ne 1 -or $service.Count -ne 1 -or $interface.Count -ne 1 -or $security.Count -ne 1) { Fail-Procedure "task firewall filter scope is ambiguous" }
    if ($port[0].Protocol -ne "Any" -or $port[0].LocalPort -ne "Any" -or $port[0].RemotePort -ne "Any") { Fail-Procedure "task firewall has a port or protocol scope" }
    if ($address[0].LocalAddress -ne "Any" -or $address[0].RemoteAddress -ne "Any") { Fail-Procedure "task firewall has an address scope" }
    if ($service[0].Service -ne "Any" -or $interface[0].InterfaceType -ne "Any" -or $interface[0].InterfaceAlias -ne "Any") { Fail-Procedure "task firewall has a service or interface scope" }
    foreach ($property in @("Authentication", "Encryption", "LocalUser", "RemoteMachine", "RemoteUser")) {
      if ($null -ne $security[0].PSObject.Properties[$property] -and @("", "Any", "None", "NotRequired") -notcontains [string]$security[0].$property) { Fail-Procedure "task firewall has a security scope" }
    }
    if ($null -ne $security[0].PSObject.Properties["OverrideBlockRules"] -and $security[0].OverrideBlockRules -ne $false) { Fail-Procedure "task firewall has an override" }
  }
  Assert-AllFirewallProfilesEnabled
  Assert-RuntimeCollisionAbsent -NodePath $NodePath
  return [ordered]@{ persistentRulePresent = $true; activeRulePresent = $true; allProfilesEnabled = $true; profileStateRecheckPassed = $true; ruleEffectiveForActiveProfiles = $true; firewallProgramIdentityMatched = $true; firewallScopeVerified = $true; runtimeCollisionAbsent = $true }
}

function Assert-ExactRuleAbsent {
  param([Parameter(Mandatory = $true)][string]$RuleName)
  if ($null -ne (Get-ExactFirewallRule -RuleName $RuleName -PolicyStore "PersistentStore") -or $null -ne (Get-ExactFirewallRule -RuleName $RuleName -PolicyStore "ActiveStore")) { Fail-Procedure "task firewall rule remains present" }
}

function Remove-ExactTaskFirewallRule {
  param([Parameter(Mandatory = $true)][string]$RuleName)
  $persistent = Get-ExactFirewallRule -RuleName $RuleName -PolicyStore "PersistentStore"
  $active = Get-ExactFirewallRule -RuleName $RuleName -PolicyStore "ActiveStore"
  if ($null -ne $persistent -or $null -ne $active) {
    if ($null -eq $persistent -or $null -eq $active) { Fail-Procedure "task firewall rule store state is ambiguous" }
    $persistent | Remove-NetFirewallRule -ErrorAction Stop
  }
  Assert-ExactRuleAbsent -RuleName $RuleName
}

function Recover-TaskFirewallRule {
  param([Parameter(Mandatory = $true)][string]$Recovery)
  Assert-RecoveryRootContents -Recovery $Recovery -LockHeld
  $marker = Read-RecoveryMarker -Recovery $Recovery
  if ($null -eq $marker) { return [ordered]@{ Checked = $true; CompletedWhenNeeded = $false } }
  $nodePath = Resolve-ExistingFile -Path $marker.NodePath -Label "marker-bound node executable"
  if ((Get-Sha256 $nodePath) -ne $marker.NodeSha256) { Fail-Procedure "marker-bound executable identity changed" }
  $persistent = Get-ExactFirewallRule -RuleName $marker.RuleName -PolicyStore "PersistentStore"
  $active = Get-ExactFirewallRule -RuleName $marker.RuleName -PolicyStore "ActiveStore"
  if ($null -ne $persistent -or $null -ne $active) {
    if ($null -eq $persistent -or $null -eq $active) { Fail-Procedure "marker-bound firewall rule store state is ambiguous" }
    [void](Assert-ExactFirewallRule -RuleName $marker.RuleName -NodePath $nodePath)
    Remove-ExactTaskFirewallRule -RuleName $marker.RuleName
  }
  else { Assert-ExactRuleAbsent -RuleName $marker.RuleName }
  Remove-Item -LiteralPath (Get-RecoveryMarkerPath -Recovery $Recovery) -Force -ErrorAction Stop
  Assert-RecoveryRootContents -Recovery $Recovery -LockHeld
  return [ordered]@{ Checked = $true; CompletedWhenNeeded = $true }
}

function Assert-FirewallCapabilities {
  foreach ($name in @(
    "Get-NetFirewallRule", "New-NetFirewallRule", "Remove-NetFirewallRule", "Get-NetFirewallProfile",
    "Get-NetFirewallApplicationFilter", "Get-NetFirewallPortFilter", "Get-NetFirewallAddressFilter",
    "Get-NetFirewallServiceFilter", "Get-NetFirewallInterfaceFilter", "Get-NetFirewallSecurityFilter"
  )) {
    if ($null -eq (Get-Command -Name $name -CommandType Cmdlet -ErrorAction SilentlyContinue)) {
      Fail-Procedure "Windows firewall capability is unavailable"
    }
  }
}

function Assert-AdministrativeToken {
  $identity = [Security.Principal.WindowsIdentity]::GetCurrent()
  $principal = [Security.Principal.WindowsPrincipal]::new($identity)
  if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    Fail-Procedure "administrative token is required for the task-owned firewall rule"
  }
}

function New-ExactTaskFirewallRule {
  param(
    [Parameter(Mandatory = $true)][string]$Recovery,
    [Parameter(Mandatory = $true)][System.Collections.IDictionary]$Runtime
  )
  Assert-FirewallCapabilities
  Assert-AdministrativeToken
  Assert-RuntimeProvenanceStillBound -Runtime $Runtime
  Assert-AllFirewallProfilesEnabled
  Assert-RuntimeCollisionAbsent -NodePath $Runtime.Node
  $ruleName = "NDQA003-" + [Guid]::NewGuid().ToString("N")
  Assert-ExactRuleAbsent -RuleName $ruleName
  $identity = Write-RecoveryMarker -Recovery $Recovery -RuleName $ruleName -Runtime $Runtime
  New-NetFirewallRule -Name $ruleName -DisplayName $ruleName -PolicyStore PersistentStore -Direction Outbound -Action Block -Enabled True -Profile Any -Program $Runtime.Node -ErrorAction Stop | Out-Null
  [void](Assert-ExactFirewallRule -RuleName $ruleName -NodePath $Runtime.Node)
  return [ordered]@{ RuleName = $ruleName; RuleIdentitySha256 = $identity }
}

function Complete-TaskFirewallLifecycle {
  param([Parameter(Mandatory = $true)][string]$Recovery, [Parameter(Mandatory = $true)][string]$RuleName)
  Remove-ExactTaskFirewallRule -RuleName $RuleName
  Assert-ExactRuleAbsent -RuleName $RuleName
  $marker = Get-RecoveryMarkerPath -Recovery $Recovery
  $markerBody = Read-RecoveryMarker -Recovery $Recovery
  if ($null -eq $markerBody -or $markerBody.RuleName -cne $RuleName) { Fail-Procedure "recovery marker does not bind the exact completed rule" }
  Remove-Item -LiteralPath $marker -Force -ErrorAction Stop
  Assert-RecoveryRootContents -Recovery $Recovery -LockHeld
}

function Finalize-TaskFirewallLifecycle {
  param(
    [Parameter(Mandatory = $true)][string]$Recovery,
    [Parameter(Mandatory = $true)][System.Collections.IDictionary]$Lifecycle,
    [Parameter(Mandatory = $false)][object]$Rule
  )
  $completionFailure = $null
  $cleanupRuleName = $null
  if ($null -ne $Rule) {
    $cleanupRuleName = $Rule.RuleName
    try { Complete-TaskFirewallLifecycle -Recovery $Recovery -RuleName $Rule.RuleName }
    catch { $completionFailure = $_ }
  }
  try {
    $marker = Read-RecoveryMarker -Recovery $Recovery
    if ($null -ne $marker) {
      $cleanupRuleName = $marker.RuleName
      $Lifecycle.ruleIdentitySha256 = Get-Sha256 (Get-RecoveryMarkerPath -Recovery $Recovery)
      $recovery = Recover-TaskFirewallRule -Recovery $Recovery
      if (-not $recovery.Checked -or -not $recovery.CompletedWhenNeeded) { Fail-Procedure "task firewall lifecycle recovery is incomplete" }
    }
    if ($null -ne $cleanupRuleName) { Set-FirewallLifecycleAbsent -Lifecycle $Lifecycle -RuleName $cleanupRuleName }
    Assert-RecoveryRootContents -Recovery $Recovery -LockHeld
  }
  catch { Fail-Procedure "task firewall lifecycle cleanup cannot be verified" }
  if ($null -ne $completionFailure) { throw $completionFailure }
}
function Get-CommandIdentity {
  param(
    [Parameter(Mandatory = $true)][string]$Label,
    [Parameter(Mandatory = $true)][System.Collections.IDictionary]$Runtime,
    [Parameter(Mandatory = $true)][string[]]$Arguments
  )
  $canonical = [ordered]@{ Label = $Label; NodeSha256 = $Runtime.NodeSha256; NpmCmdSha256 = $Runtime.NpmCmdSha256; NpmCliSha256 = $Runtime.NpmCliSha256; Arguments = $Arguments }
  $bytes = [Text.UTF8Encoding]::new($false).GetBytes(($canonical | ConvertTo-Json -Compress -Depth 4))
  return [Convert]::ToHexString([Security.Cryptography.SHA256]::HashData($bytes)).ToLowerInvariant()
}

function New-PhaseLedger {
  param([Parameter(Mandatory = $true)][System.Collections.IDictionary]$Runtime)
  $auditIdentity = Get-CommandIdentity -Label "npm-audit" -Runtime $Runtime -Arguments @("audit", "--json", "--audit-level=high")
  $sbomIdentity = Get-CommandIdentity -Label "npm-sbom" -Runtime $Runtime -Arguments @("sbom", "--package-lock-only", "--sbom-format=spdx")
  $ledger = @()
  foreach ($phase in $EvidencePhaseOrder) {
    $ledger += [ordered]@{ Phase = $phase; CommandIdentity = if ($phase -like "*audit") { $auditIdentity } else { $sbomIdentity }; ExitClass = $NotRunClass; FreshInvocationState = $false; FreshCacheEmpty = $false }
  }
  return ,$ledger
}

function New-UnavailablePhaseLedger {
  $ledger = @()
  foreach ($phase in $EvidencePhaseOrder) {
    $ledger += [ordered]@{ Phase = $phase; CommandIdentity = "NOT AVAILABLE"; ExitClass = $NotRunClass; FreshInvocationState = $false; FreshCacheEmpty = $false }
  }
  return ,$ledger
}

function New-ReceiptRuntimeState {
  return [ordered]@{
    NodeVersion = "NOT AVAILABLE"; NpmVersion = "NOT AVAILABLE"
    NodeSha256 = "NOT AVAILABLE"; NpmCmdSha256 = "NOT AVAILABLE"; NpmCliSha256 = "NOT AVAILABLE"
    NodeVersionCommandIdentity = "NOT AVAILABLE"; NpmVersionCommandIdentity = "NOT AVAILABLE"
    NodeVersionMatched = $false; NpmVersionMatched = $false; RuntimeProvenanceMatched = $false
    NpmCmdBindingMatched = $false; LauncherNodeIdentityMatched = $false
  }
}

function Record-Phase {
  param(
    [Parameter(Mandatory = $true)][object[]]$Ledger,
    [Parameter(Mandatory = $true)][string]$Phase,
    [Parameter(Mandatory = $true)][string]$ExitClass,
    [Parameter(Mandatory = $true)][bool]$FreshInvocationState,
    [Parameter(Mandatory = $true)][bool]$FreshCacheEmpty
  )
  $index = [Array]::IndexOf($EvidencePhaseOrder, $Phase)
  if ($index -lt 0 -or $Ledger[$index].ExitClass -notin @($NotRunClass, "EXECUTION_FAILED") -or $ExitClass -eq $NotRunClass) { Fail-Procedure "phase ledger order is invalid" }
  if (-not $FreshInvocationState -or -not $FreshCacheEmpty) { Fail-Procedure "phase did not prove fresh private npm state" }
  foreach ($earlier in 0..($index - 1)) { if ($index -gt 0 -and $Ledger[$earlier].ExitClass -eq $NotRunClass) { Fail-Procedure "phase cannot start before an earlier phase" } }
  $Ledger[$index].ExitClass = $ExitClass; $Ledger[$index].FreshInvocationState = $true; $Ledger[$index].FreshCacheEmpty = $true
}

function Mark-PhaseExecutionAttempt {
  param([Parameter(Mandatory = $true)][object[]]$Ledger, [Parameter(Mandatory = $true)][string]$Phase)
  $index = [Array]::IndexOf($EvidencePhaseOrder, $Phase)
  if ($index -lt 0 -or $Ledger[$index].ExitClass -ne $NotRunClass) { Fail-Procedure "phase execution attempt order is invalid" }
  foreach ($earlier in 0..($index - 1)) { if ($index -gt 0 -and $Ledger[$earlier].ExitClass -eq $NotRunClass) { Fail-Procedure "phase execution attempt cannot start before an earlier phase" } }
  # This conservative class prevents a started or attempted child from being
  # represented as a precondition-skipped phase if private execution fails
  # before a semantic result can be classified.
  $Ledger[$index].ExitClass = "EXECUTION_FAILED"
  $Ledger[$index].FreshInvocationState = $false
  $Ledger[$index].FreshCacheEmpty = $false
}

function Test-NegativeAuditResult {
  param([Parameter(Mandatory = $true)][System.Collections.IDictionary]$Result)
  if ($Result.ExitCode -eq 0 -or $Result.StdoutBytes.Length -ne 0) { return $false }
  $stderr = Get-StrictUtf8Text -Bytes $Result.StderrBytes -Label "negative audit stderr"
  if ($stderr.Length -eq 0 -or $stderr -match "(?i)\b(cache|partial|auditReportVersion|vulnerabilities|metadata)\b") { return $false }
  return $stderr -match "\b(ENETUNREACH|ENETDOWN|ENOTFOUND|EAI_AGAIN|ECONNREFUSED|ECONNRESET|ETIMEDOUT)\b"
}

function Get-PositiveAuditSummary {
  param([Parameter(Mandatory = $true)][System.Collections.IDictionary]$Result)
  if ($Result.StderrBytes.Length -ne 0) { Fail-Procedure "positive audit produced unexpected stderr" }
  try { $value = (Get-StrictUtf8Text -Bytes $Result.StdoutBytes -Label "positive audit stdout") | ConvertFrom-Json -AsHashtable -Depth 16 }
  catch { Fail-Procedure "positive audit output is not JSON" }
  if ($value -isnot [System.Collections.IDictionary] -or $value.auditReportVersion -ne 2 -or $value.metadata -isnot [System.Collections.IDictionary] -or $value.metadata.vulnerabilities -isnot [System.Collections.IDictionary] -or $value.metadata.dependencies -isnot [System.Collections.IDictionary] -or $value.vulnerabilities -isnot [System.Collections.IDictionary]) { Fail-Procedure "positive audit report is incomplete" }
  if ($value.ContainsKey("errors") -and @($value.errors).Count -ne 0) { Fail-Procedure "positive audit report contains incomplete-result errors" }
  foreach ($name in @("prod", "dev", "optional", "peer", "peerOptional", "total")) {
    if (($value.metadata.dependencies[$name] -isnot [int] -and $value.metadata.dependencies[$name] -isnot [long]) -or $value.metadata.dependencies[$name] -lt 0) { Fail-Procedure "positive audit dependency coverage is incomplete" }
  }
  $severity = $value.metadata.vulnerabilities
  foreach ($name in @("info", "low", "moderate", "high", "critical", "total")) {
    if (($severity[$name] -isnot [int] -and $severity[$name] -isnot [long]) -or $severity[$name] -lt 0) { Fail-Procedure "positive audit severity vector is incomplete" }
  }
  if ($Result.ExitCode -ne 0 -and (($severity.high + $severity.critical) -eq 0)) { Fail-Procedure "positive audit exit is unclassified" }
  if ($Result.ExitCode -eq 0 -and (($severity.high + $severity.critical) -gt 0)) { Fail-Procedure "positive audit result is inconsistent" }
  if ($Result.ExitCode -notin @(0, 1)) { Fail-Procedure "positive audit exit is unclassified" }
  return [ordered]@{
    complete = $true; exitClass = if (($severity.high + $severity.critical) -gt 0) { "COMPLETE_THRESHOLD_FINDING" } else { "COMPLETE_NO_THRESHOLD_FINDING" }
    rawByteLength = $Result.StdoutBytes.Length; rawSha256 = [Convert]::ToHexString([Security.Cryptography.SHA256]::HashData($Result.StdoutBytes)).ToLowerInvariant()
    severityCounts = [ordered]@{ info = [int]$severity.info; low = [int]$severity.low; moderate = [int]$severity.moderate; high = [int]$severity.high; critical = [int]$severity.critical; total = [int]$severity.total }
  }
}

function Get-LockPackageName {
  param([Parameter(Mandatory = $true)][string]$Path, [Parameter(Mandatory = $true)][System.Collections.IDictionary]$Entry)
  if ($Path -eq "") {
    if ($Entry.name -isnot [string] -or [string]::IsNullOrWhiteSpace($Entry.name)) { Fail-Procedure "lockfile root name is unavailable" }
    return $Entry.name
  }
  $segments = @($Path -split "/")
  $marker = -1
  for ($index = 0; $index -lt $segments.Count; $index += 1) { if ($segments[$index] -eq "node_modules") { $marker = $index } }
  if ($marker -lt 0 -or $marker + 1 -ge $segments.Count) { Fail-Procedure "lockfile package path is unsupported" }
  if ($segments[$marker + 1].StartsWith("@")) {
    if ($marker + 2 -ge $segments.Count) { Fail-Procedure "lockfile scoped package path is incomplete" }
    return "$($segments[$marker + 1])/$($segments[$marker + 2])"
  }
  return $segments[$marker + 1]
}

function Resolve-LockDependencyPath {
  param(
    [Parameter(Mandatory = $true)][string]$ParentPath,
    [Parameter(Mandatory = $true)][string]$DependencyName,
    [Parameter(Mandatory = $true)][System.Collections.IDictionary]$Packages
  )
  $current = $ParentPath
  while ($true) {
    $candidate = if ($current -eq "") { "node_modules/$DependencyName" } else { "$current/node_modules/$DependencyName" }
    if ($Packages.ContainsKey($candidate)) { return $candidate }
    if ($current -eq "") { break }
    $nestedMarker = $current.LastIndexOf("/node_modules/", [StringComparison]::Ordinal)
    if ($nestedMarker -lt 0) { $current = "" } else { $current = $current.Substring(0, $nestedMarker) }
  }
  return $null
}

function Get-LockfileGraph {
  param([Parameter(Mandatory = $true)][string]$Checkout)
  try { $lock = (Get-StrictUtf8Text -Bytes ([IO.File]::ReadAllBytes((Join-Path $Checkout "package-lock.json"))) -Label "package lock") | ConvertFrom-Json -AsHashtable -Depth 64 }
  catch { Fail-Procedure "package lock is malformed" }
  if ($lock -isnot [System.Collections.IDictionary] -or $lock.lockfileVersion -ne 3 -or $lock.packages -isnot [System.Collections.IDictionary] -or -not $lock.packages.ContainsKey("")) { Fail-Procedure "package lock is not a complete lockfile-v3 graph" }
  $identityByPath = [ordered]@{}
  $all = [Collections.Generic.HashSet[string]]::new([StringComparer]::Ordinal)
  $production = [Collections.Generic.HashSet[string]]::new([StringComparer]::Ordinal)
  $development = [Collections.Generic.HashSet[string]]::new([StringComparer]::Ordinal)
  $optional = [Collections.Generic.HashSet[string]]::new([StringComparer]::Ordinal)
  $peer = [Collections.Generic.HashSet[string]]::new([StringComparer]::Ordinal)
  $transitive = [Collections.Generic.HashSet[string]]::new([StringComparer]::Ordinal)
  $rootDirect = [Collections.Generic.HashSet[string]]::new([StringComparer]::Ordinal)
  $rootEntry = $lock.packages[""]
  foreach ($field in @("dependencies", "devDependencies", "optionalDependencies", "peerDependencies")) {
    if ($rootEntry[$field] -is [System.Collections.IDictionary]) { foreach ($name in $rootEntry[$field].Keys) { [void]$rootDirect.Add([string]$name) } }
  }
  foreach ($packagePath in @($lock.packages.Keys | Sort-Object)) {
    $entry = $lock.packages[$packagePath]
    if ($entry -isnot [System.Collections.IDictionary] -or $entry.version -isnot [string] -or [string]::IsNullOrWhiteSpace($entry.version)) { Fail-Procedure "lockfile package entry is incomplete" }
    $name = Get-LockPackageName -Path $packagePath -Entry $entry
    $identity = "$name`0$($entry.version)"
    if (-not $all.Add($identity)) { Fail-Procedure "lockfile name/version identity is ambiguous" }
    $identityByPath[$packagePath] = $identity
    if ($entry.dev -ne $true) { [void]$production.Add($identity) }
    if ($entry.dev -eq $true -or $entry.devOptional -eq $true) { [void]$development.Add($identity) }
    if ($entry.optional -eq $true -or $entry.devOptional -eq $true) { [void]$optional.Add($identity) }
    if ($entry.peer -eq $true) { [void]$peer.Add($identity) }
    if ($packagePath -ne "" -and -not $rootDirect.Contains($name)) { [void]$transitive.Add($identity) }
  }
  $relationships = [Collections.Generic.HashSet[string]]::new([StringComparer]::Ordinal)
  foreach ($packagePath in @($lock.packages.Keys | Sort-Object)) {
    $entry = $lock.packages[$packagePath]
    foreach ($field in @("dependencies", "devDependencies", "optionalDependencies", "peerDependencies")) {
      if ($entry[$field] -isnot [System.Collections.IDictionary]) { continue }
      foreach ($dependencyName in @($entry[$field].Keys | Sort-Object)) {
        $childPath = Resolve-LockDependencyPath -ParentPath $packagePath -DependencyName ([string]$dependencyName) -Packages $lock.packages
        if ($null -eq $childPath) {
          $isOptionalPeer = $field -eq "peerDependencies" -and $entry.peerDependenciesMeta -is [System.Collections.IDictionary] -and $entry.peerDependenciesMeta[$dependencyName] -is [System.Collections.IDictionary] -and $entry.peerDependenciesMeta[$dependencyName].optional -eq $true
          if ($isOptionalPeer) { continue }
          Fail-Procedure "lockfile dependency relationship is unresolved"
        }
        [void]$relationships.Add("$($identityByPath[$packagePath])`0DEPENDS_ON`0$($identityByPath[$childPath])")
      }
    }
  }
  return [ordered]@{
    identities = $all; identityByPath = $identityByPath; relationships = $relationships; rootIdentity = $identityByPath[""]
    categories = [ordered]@{ production = $production; development = $development; optional = $optional; peer = $peer; transitive = $transitive }
  }
}

function Get-DeclaredLicenseCategory {
  param([Parameter(Mandatory = $false)][object]$Value)
  if ($null -eq $Value) { return "missing" }
  if ($Value -isnot [string]) { return "malformed" }
  if ($Value.Length -eq 0) { return "empty" }
  if ($Value -eq "NOASSERTION") { return "noAssertion" }
  if ($Value -match "\s{2,}|[\r\n]" -or $Value -notmatch "^[A-Za-z0-9.+()\- /:]+$") { return "malformed" }
  if ($Value -match "^(?i:unknown|none)$") { return "unknown" }
  return "declared"
}

function Get-SbomSummary {
  param(
    [Parameter(Mandatory = $true)][System.Collections.IDictionary]$Result,
    [Parameter(Mandatory = $true)][System.Collections.IDictionary]$ExpectedGraph
  )
  if ($Result.ExitCode -ne 0 -or $Result.StderrBytes.Length -ne 0) { Fail-Procedure "SBOM command did not complete cleanly" }
  try { $value = (Get-StrictUtf8Text -Bytes $Result.StdoutBytes -Label "SBOM stdout") | ConvertFrom-Json -AsHashtable -Depth 64 }
  catch { Fail-Procedure "SBOM output is malformed" }
  if ($value -isnot [System.Collections.IDictionary] -or $value.spdxVersion -ne "SPDX-2.3" -or $value.packages -isnot [object[]] -or $value.relationships -isnot [object[]] -or $value.documentDescribes -isnot [object[]]) { Fail-Procedure "SBOM schema is incomplete" }
  $spdxIdToIdentity = [ordered]@{}
  $seenIdentities = [Collections.Generic.HashSet[string]]::new([StringComparer]::Ordinal)
  $counts = [ordered]@{ missing = 0; empty = 0; malformed = 0; noAssertion = 0; unknown = 0; declared = 0; unmappable = 0; ambiguous = 0 }
  $rootDeclarationCategory = $null
  foreach ($package in $value.packages) {
    if ($package -isnot [System.Collections.IDictionary] -or $package.SPDXID -isnot [string] -or $package.name -isnot [string] -or $package.versionInfo -isnot [string]) { Fail-Procedure "SBOM package field coverage is incomplete" }
    $identity = "$($package.name)`0$($package.versionInfo)"
    if (-not $ExpectedGraph.identities.Contains($identity)) { $counts.unmappable += 1; continue }
    if (-not $seenIdentities.Add($identity) -or $spdxIdToIdentity.Contains($package.SPDXID)) { $counts.ambiguous += 1; continue }
    $spdxIdToIdentity[$package.SPDXID] = $identity
    $category = Get-DeclaredLicenseCategory -Value $package.licenseDeclared
    $counts[$category] += 1
    if ($identity -eq $ExpectedGraph.rootIdentity) { $rootDeclarationCategory = $category }
  }
  $rootPresent = $false
  foreach ($described in $value.documentDescribes) { if ($described -is [string] -and $spdxIdToIdentity.Contains($described) -and $spdxIdToIdentity[$described] -eq $ExpectedGraph.rootIdentity) { $rootPresent = $true } }
  $observedRelationships = [Collections.Generic.HashSet[string]]::new([StringComparer]::Ordinal)
  foreach ($relationship in $value.relationships) {
    if ($relationship -isnot [System.Collections.IDictionary] -or $relationship.relationshipType -ne "DEPENDS_ON" -or $relationship.spdxElementId -isnot [string] -or $relationship.relatedSpdxElement -isnot [string] -or -not $spdxIdToIdentity.Contains($relationship.spdxElementId) -or -not $spdxIdToIdentity.Contains($relationship.relatedSpdxElement)) { Fail-Procedure "SBOM relationship coverage is incomplete" }
    [void]$observedRelationships.Add("$($spdxIdToIdentity[$relationship.spdxElementId])`0DEPENDS_ON`0$($spdxIdToIdentity[$relationship.relatedSpdxElement])")
  }
  $categoryCoverage = [ordered]@{}
  foreach ($categoryName in @("production", "development", "optional", "peer", "transitive")) {
    $expected = $ExpectedGraph.categories[$categoryName]
    $observedCount = @($expected | Where-Object { $seenIdentities.Contains($_) }).Count
    $categoryCoverage[$categoryName] = [ordered]@{ expected = $expected.Count; observed = $observedCount }
  }
  $complete = $rootPresent -and $null -ne $rootDeclarationCategory -and $seenIdentities.Count -eq $ExpectedGraph.identities.Count -and $counts.unmappable -eq 0 -and $counts.ambiguous -eq 0 -and $observedRelationships.SetEquals($ExpectedGraph.relationships)
  if (-not $complete) { Fail-Procedure "SBOM resolved graph does not equal the lockfile graph" }
  return [ordered]@{
    completeGraph = $true; exitClass = "COMPLETE"; rawByteLength = $Result.StdoutBytes.Length; rawSha256 = [Convert]::ToHexString([Security.Cryptography.SHA256]::HashData($Result.StdoutBytes)).ToLowerInvariant()
    coverage = [ordered]@{ packagesExpected = $ExpectedGraph.identities.Count; packagesObserved = $seenIdentities.Count; relationshipsExpected = $ExpectedGraph.relationships.Count; relationshipsObserved = $observedRelationships.Count; rootPresent = $rootPresent; categories = $categoryCoverage }
    declaredLicenseCounts = $counts; rootDeclarationCategory = $rootDeclarationCategory
  }
}

function Set-FixtureRootLicense {
  param([Parameter(Mandatory = $true)][string]$Fixture, [Parameter(Mandatory = $true)][string]$Kind)
  $packagePath = Join-Path $Fixture "package.json"
  $lockPath = Join-Path $Fixture "package-lock.json"
  try { $package = Get-Content -Raw -LiteralPath $packagePath | ConvertFrom-Json -AsHashtable -Depth 32; $lock = Get-Content -Raw -LiteralPath $lockPath | ConvertFrom-Json -AsHashtable -Depth 64 }
  catch { Fail-Procedure "fixture input cannot be parsed" }
  if ($package -isnot [System.Collections.IDictionary] -or $lock -isnot [System.Collections.IDictionary] -or $lock.packages -isnot [System.Collections.IDictionary] -or $lock.packages[""] -isnot [System.Collections.IDictionary]) { Fail-Procedure "fixture input is incomplete" }
  if ($Kind -eq "missing") { [void]$package.Remove("license"); [void]$lock.packages[""].Remove("license") }
  elseif ($Kind -eq "noassertion") { $package.license = "NOASSERTION"; $lock.packages[""].license = "NOASSERTION" }
  elseif ($Kind -eq "malformed") { $package.license = "@@@"; $lock.packages[""].license = "@@@" }
  else { Fail-Procedure "unknown declaration fixture" }
  [IO.File]::WriteAllText($packagePath, ($package | ConvertTo-Json -Compress -Depth 32), [Text.UTF8Encoding]::new($false))
  [IO.File]::WriteAllText($lockPath, ($lock | ConvertTo-Json -Compress -Depth 64), [Text.UTF8Encoding]::new($false))
}

function New-DeclarationFixture {
  param([Parameter(Mandatory = $true)][string]$Checkout, [Parameter(Mandatory = $true)][string]$Root, [Parameter(Mandatory = $true)][string]$Kind)
  $fixture = Join-Path $Root ("fixture-" + $Kind + "-" + [Guid]::NewGuid().ToString("N"))
  $created = $false
  try {
    New-Item -ItemType Directory -LiteralPath $fixture -ErrorAction Stop | Out-Null
    $created = $true
    Set-PrivateAcl -Path $fixture -IsDirectory $true
    foreach ($inputName in @("package.json", "package-lock.json", ".npmrc")) {
      $source = Join-Path $Checkout $inputName
      $copy = Join-Path $fixture $inputName
      Copy-Item -LiteralPath $source -Destination $copy -ErrorAction Stop
      Set-PrivateAcl -Path $copy -IsDirectory $false
      if ((Get-Sha256 $copy) -ne (Get-Sha256 $source)) { Fail-Procedure "fixture input did not preserve checkout bytes before mutation" }
    }
    if (Test-Path -LiteralPath (Join-Path $fixture "node_modules")) { Fail-Procedure "fixture contains node_modules" }
    Set-FixtureRootLicense -Fixture $fixture -Kind $Kind
    return $fixture
  }
  catch {
    $fixtureFailure = $_
    if ($created -and (Test-Path -LiteralPath $fixture)) {
      try { Clear-PrivateTaskData -Scratch $fixture }
      catch { Fail-Procedure "declaration fixture cleanup cannot be verified" }
    }
    throw $fixtureFailure
  }
}

function Assert-FixtureMutation {
  param(
    [Parameter(Mandatory = $true)][string]$Fixture,
    [Parameter(Mandatory = $true)][string]$Checkout,
    [Parameter(Mandatory = $true)][string]$Kind
  )
  try {
    $package = Get-Content -Raw -LiteralPath (Join-Path $Fixture "package.json") | ConvertFrom-Json -AsHashtable -Depth 32
    $lock = Get-Content -Raw -LiteralPath (Join-Path $Fixture "package-lock.json") | ConvertFrom-Json -AsHashtable -Depth 64
  }
  catch { Fail-Procedure "fixture mutation cannot be inspected" }
  if ($package -isnot [System.Collections.IDictionary] -or $lock -isnot [System.Collections.IDictionary] -or $lock.packages -isnot [System.Collections.IDictionary] -or $lock.packages[""] -isnot [System.Collections.IDictionary]) { Fail-Procedure "fixture mutation is structurally incomplete" }
  $expected = if ($Kind -eq "missing") { "missing" } elseif ($Kind -eq "noassertion") { "noAssertion" } elseif ($Kind -eq "malformed") { "malformed" } else { Fail-Procedure "unknown declaration fixture" }
  if ((Get-DeclaredLicenseCategory -Value $package.license) -ne $expected -or (Get-DeclaredLicenseCategory -Value $lock.packages[""].license) -ne $expected) { Fail-Procedure "fixture mutation does not match the requested declaration condition" }
  if ((Get-Sha256 (Join-Path $Fixture ".npmrc")) -ne (Get-Sha256 (Join-Path $Checkout ".npmrc"))) { Fail-Procedure "fixture npm configuration does not preserve checked-out bytes" }
}
function Clear-PrivateTaskData {
  param([Parameter(Mandatory = $true)][string]$Scratch)
  if (Test-Path -LiteralPath $Scratch) { Remove-Item -LiteralPath $Scratch -Recurse -Force -ErrorAction Stop }
  if (Test-Path -LiteralPath $Scratch) { Fail-Procedure "private task data cleanup failed" }
}
function Invoke-LauncherIngress {
  param(
    [Parameter(Mandatory = $true)][string]$Checkout,
    [Parameter(Mandatory = $true)][System.Collections.IDictionary]$Runtime,
    [Parameter(Mandatory = $true)][System.Collections.IDictionary]$Layout,
    [Parameter(Mandatory = $true)][System.Collections.IDictionary]$Host,
    [Parameter(Mandatory = $true)][string]$Commit,
    [Parameter(Mandatory = $true)][string]$Tree,
    [Parameter(Mandatory = $true)][string]$ProvenancePath,
    [Parameter(Mandatory = $true)][System.Collections.IDictionary]$Source
  )
  $wrapper = Resolve-ExistingFile -Path $PSCommandPath -Label "tracked wrapper"
  $launcher = Resolve-ExistingFile -Path (Join-Path $Checkout "src\evaluation\ndqa003-windows-arm64-evidence-launcher.mjs") -Label "tracked launcher"
  $runner = Resolve-ExistingFile -Path (Join-Path $Checkout "src\evaluation\ndqa003-windows-arm64-evidence-runner.mjs") -Label "tracked semantic runner"
  if ((Get-Sha256 $wrapper) -ne $Source.WrapperSha256 -or (Get-Sha256 $launcher) -ne $Source.LauncherSha256 -or (Get-Sha256 $runner) -ne $Source.RunnerSha256) { Fail-Procedure "tracked ingress source changed after custody preflight" }
  $hostProcess = Get-Process -Id $PID -ErrorAction Stop
  $hostExecutable = Resolve-ExistingFile -Path $hostProcess.Path -Label "PowerShell host executable"
  $nonceBytes = New-Object byte[] 32
  [Security.Cryptography.RandomNumberGenerator]::Fill($nonceBytes)
  $nonce = [Convert]::ToHexString($nonceBytes).ToLowerInvariant()
  $state = New-NpmInvocationState -Layout $Layout -Checkout $Checkout
  try {
    $childEnvironment = [ordered]@{
      SystemRoot = $Host.SystemRoot; ComSpec = $Host.ComSpec; PATHEXT = $Host.PathExt
      PATH = (Split-Path -Parent $Runtime.Node) + ";" + $Host.System32 + ";" + $Host.SystemRoot
      TEMP = $state.Roles.temp; TMP = $state.Roles.temp
    }
    $startInfo = [Diagnostics.ProcessStartInfo]::new()
    $startInfo.FileName = $Runtime.Node
    $startInfo.WorkingDirectory = $Checkout
    $startInfo.UseShellExecute = $false
    $startInfo.RedirectStandardInput = $true
    $startInfo.RedirectStandardOutput = $true
    $startInfo.RedirectStandardError = $true
    $startInfo.StandardInputEncoding = [Text.UTF8Encoding]::new($false)
    $startInfo.CreateNoWindow = $true
    $startInfo.Environment.Clear()
    foreach ($entry in $childEnvironment.GetEnumerator()) { $startInfo.Environment[$entry.Key] = $entry.Value }
    foreach ($argument in @($launcher, $IngressSentinel, $Layout.Receipt, $Commit, $Tree, $Runtime.Root, $ProvenancePath, $Layout.Recovery)) { [void]$startInfo.ArgumentList.Add($argument) }
    $child = [Diagnostics.Process]::new()
    $child.StartInfo = $startInfo
    $childStarted = $false
    try {
      Assert-RuntimeProvenanceStillBound -Runtime $Runtime
      if (-not $child.Start()) { Fail-Procedure "approved Node ingress launcher could not start" }
      $childStarted = $true
      $attestation = [ordered]@{
        child = [ordered]@{ executable = $Runtime.Node; launcher = $launcher; launcherSha256 = $Source.LauncherSha256; nodeSha256 = $Runtime.NodeSha256; processId = [int]$child.Id; runner = $runner; runnerSha256 = $Source.RunnerSha256; workingDirectory = $Checkout }
        nonce = $nonce
        schema = $IngressSchema
        wrapper = [ordered]@{ arguments = @("-NoProfile", "-File", $wrapper, $Layout.Receipt, $Commit, $Tree, $Runtime.Root, $ProvenancePath, $Layout.Recovery); executable = $hostExecutable; processId = [int]$PID; script = $wrapper }
      }
      $child.StandardInput.Write(($attestation | ConvertTo-Json -Compress -Depth 6))
      $child.StandardInput.Write("`n")
      $child.StandardInput.Close()
      $stdoutTask = $child.StandardOutput.ReadToEndAsync()
      $stderrTask = $child.StandardError.ReadToEndAsync()
      $child.WaitForExit()
      [Threading.Tasks.Task]::WaitAll([Threading.Tasks.Task[]]@($stdoutTask, $stderrTask))
      $stdout = $stdoutTask.GetAwaiter().GetResult()
      $stderr = $stderrTask.GetAwaiter().GetResult()
      if ($child.ExitCode -ne 0 -or $stderr.Length -ne 0) { Fail-Procedure "approved Node ingress launcher rejected the invocation" }
      try { $ready = $stdout | ConvertFrom-Json -AsHashtable -Depth 4 }
      catch { Fail-Procedure "approved Node ingress launcher did not return a safe readiness record" }
      if ($ready -isnot [System.Collections.IDictionary] -or -not (Test-ExactKeySet -Actual @($ready.Keys) -Expected @("ingress", "ready")) -or $ready.ready -ne $true -or $ready.ingress -notmatch "^[0-9a-f]{64}$") { Fail-Procedure "approved Node ingress readiness is invalid" }
      return $ready.ingress
    }
    finally {
      if ($childStarted -and -not $child.HasExited) { $child.Kill($true); $child.WaitForExit() }
      $child.Dispose()
    }
  }
  finally { Clear-PrivateTaskData -Scratch $state.Root }
}
function Get-SafeNonNegativeInteger {
  param([Parameter(Mandatory = $true)][object]$Value, [Parameter(Mandatory = $true)][string]$Label)
  if (($Value -isnot [int] -and $Value -isnot [long]) -or $Value -lt 0) { Fail-Procedure "$Label is not a nonnegative integer" }
  return [int64]$Value
}

function Get-SanitizedLifecycle {
  param([Parameter(Mandatory = $true)][System.Collections.IDictionary]$Lifecycle)
  $fields = @("ruleLifecycleClass", "persistentRuleAbsentBefore", "activeRuleAbsentBefore", "firewallRuleCreated", "firewallRuleActive", "allProfilesEnabledDuringLifecycle", "profileStateRecheckPassed", "ruleEffectiveForActiveProfiles", "firewallProgramIdentityMatched", "firewallScopeVerified", "runtimeCollisionAbsent", "persistentRuleAbsentAfter", "activeRuleAbsentAfter", "ruleIdentitySha256")
  if (-not (Test-ExactKeySet -Actual @($Lifecycle.Keys) -Expected $fields)) { Fail-Procedure "firewall lifecycle receipt shape is invalid" }
  $safe = [ordered]@{}
  foreach ($field in $fields) {
    if ($field -eq "ruleLifecycleClass") { $safe[$field] = Get-SafeReceiptText -Value $Lifecycle[$field] -Allowed $ReceiptLifecycleClasses -Label "firewall lifecycle class" }
    elseif ($field -eq "ruleIdentitySha256") { $safe[$field] = Get-SafeReceiptSha256OrUnavailable -Value $Lifecycle[$field] -Label "firewall rule identity" }
    else { $safe[$field] = Get-SafeReceiptBoolean -Value $Lifecycle[$field] -Label "firewall lifecycle predicate" }
  }
  return $safe
}

function Get-SanitizedSbomRun {
  param([Parameter(Mandatory = $true)][object]$Summary)
  if ($Summary -isnot [System.Collections.IDictionary]) { return "NOT AVAILABLE" }
  $counts = $Summary.declaredLicenseCounts
  $coverage = $Summary.coverage
  if ($counts -isnot [System.Collections.IDictionary] -or $coverage -isnot [System.Collections.IDictionary] -or $coverage.categories -isnot [System.Collections.IDictionary]) { Fail-Procedure "SBOM receipt summary is incomplete" }
  $safeCounts = [ordered]@{}
  foreach ($name in @("missing", "empty", "malformed", "noAssertion", "unknown", "declared", "unmappable", "ambiguous")) { $safeCounts[$name] = Get-SafeNonNegativeInteger -Value $counts[$name] -Label "SBOM declaration count" }
  $safeCategories = [ordered]@{}
  foreach ($name in @("production", "development", "optional", "peer", "transitive")) {
    $category = $coverage.categories[$name]
    if ($category -isnot [System.Collections.IDictionary]) { Fail-Procedure "SBOM category coverage is incomplete" }
    $safeCategories[$name] = [ordered]@{ expected = Get-SafeNonNegativeInteger -Value $category.expected -Label "SBOM expected coverage"; observed = Get-SafeNonNegativeInteger -Value $category.observed -Label "SBOM observed coverage" }
  }
  return [ordered]@{
    completeGraph = Get-SafeReceiptBoolean -Value $Summary.completeGraph -Label "SBOM complete-graph predicate"
    exitClass = Get-SafeReceiptText -Value $Summary.exitClass -Allowed @("COMPLETE", "INCOMPLETE") -Label "SBOM exit class"
    rawByteLength = Get-SafeNonNegativeInteger -Value $Summary.rawByteLength -Label "SBOM raw length"
    rawSha256 = Get-SafeReceiptSha256OrUnavailable -Value $Summary.rawSha256 -Label "SBOM raw hash"
    coverage = [ordered]@{
      packagesExpected = Get-SafeNonNegativeInteger -Value $coverage.packagesExpected -Label "SBOM package expected coverage"
      packagesObserved = Get-SafeNonNegativeInteger -Value $coverage.packagesObserved -Label "SBOM package observed coverage"
      relationshipsExpected = Get-SafeNonNegativeInteger -Value $coverage.relationshipsExpected -Label "SBOM relationship expected coverage"
      relationshipsObserved = Get-SafeNonNegativeInteger -Value $coverage.relationshipsObserved -Label "SBOM relationship observed coverage"
      rootPresent = Get-SafeReceiptBoolean -Value $coverage.rootPresent -Label "SBOM root coverage"; categories = $safeCategories
    }
    declaredLicenseCounts = $safeCounts
  }
}
function Assert-PassReceiptBody {
  param([Parameter(Mandatory = $true)][System.Collections.IDictionary]$Body)
  if ($Body.status -ne "PASS") { return }
  if ($Body.platform.hostArchitecture -ne "arm64" -or $Body.platform.processArchitecture -ne "arm64" -or $Body.platform.processPlatform -ne "win32") { Fail-Procedure "PASS receipt does not prove the exact native Windows ARM64 platform" }
  if ($Body.toolchain.node -ne $ExpectedNodeVersion -or $Body.toolchain.npm -ne $ExpectedNpmVersion) { Fail-Procedure "PASS receipt does not prove the exact Node and npm versions" }
  foreach ($value in @(
    $Body.platform.osFamilyWindows, $Body.platform.nativeArm64,
    $Body.toolchain.nodeVersionMatched, $Body.toolchain.npmVersionMatched, $Body.toolchain.runtimeProvenanceMatched,
    $Body.toolchain.npmCmdBindingMatched, $Body.toolchain.launcherNodeIdentityMatched,
    $Body.configuration.credentialBearingInputAbsent, $Body.configuration.controlledConfigEmpty,
    $Body.configuration.effectiveRegistryMatches, $Body.configuration.networkModeOnline,
    $Body.configuration.noScopeReduction, $Body.configuration.proxiesAbsent, $Body.configuration.workspaceSelectionInactive,
    $Body.firewall.recoveryChecked, $Body.custody.repositoryUnchanged, $Body.custody.untrackedStateEmpty,
    $Body.custody.noNodeModules, $Body.custody.cleanupVerified, $Body.custody.sanitizedReceiptOnly
  )) { if ($value -ne $true) { Fail-Procedure "PASS receipt has an unverified required predicate" } }
  foreach ($identity in @(
    $Body.ingress.attestationSha256, $Body.checkout.commit, $Body.checkout.tree,
    $Body.checkout.packageLockSha256, $Body.checkout.projectNpmrcSha256,
    $Body.toolchain.nodeSha256, $Body.toolchain.npmCmdSha256, $Body.toolchain.npmCliSha256,
    $Body.toolchain.nodeVersionCommandIdentity, $Body.toolchain.npmVersionCommandIdentity
  )) { if ($identity -eq "NOT AVAILABLE") { Fail-Procedure "PASS receipt has an unavailable required identity" } }
  $identityRuntime = [ordered]@{ NodeSha256 = $Body.toolchain.nodeSha256; NpmCmdSha256 = $Body.toolchain.npmCmdSha256; NpmCliSha256 = $Body.toolchain.npmCliSha256 }
  if ($Body.toolchain.nodeVersionCommandIdentity -ne (Get-CommandIdentity -Label "node-version" -Runtime $identityRuntime -Arguments @("--version")) -or $Body.toolchain.npmVersionCommandIdentity -ne (Get-CommandIdentity -Label "npm-version" -Runtime $identityRuntime -Arguments @("--version"))) { Fail-Procedure "PASS receipt version-command identity is not exact" }
  if ($Body.configuration.allowlistVersion -ne "nightdrive.ndqa003.windows-arm64-npm-environment.v1" -or $Body.configuration.probeSetVersion -ne "nightdrive.ndqa003.windows-arm64-npm-probes.v1" -or $Body.configuration.probeSetExitClass -ne "COMPLETE" -or $Body.audit -eq "NOT AVAILABLE" -or $Body.audit.complete -ne $true -or $Body.audit.exitClass -ne "COMPLETE_NO_THRESHOLD_FINDING" -or $Body.audit.rawByteLength -le 0 -or $Body.audit.rawSha256 -eq "NOT AVAILABLE" -or $Body.sbom -eq "NOT AVAILABLE" -or $Body.sbom.determinism -ne "PASS" -or $Body.sbom.rawEqual -ne $true) { Fail-Procedure "PASS receipt has incomplete command evidence" }
  if ($Body.audit.severityCounts.high -ne 0 -or $Body.audit.severityCounts.critical -ne 0) { Fail-Procedure "PASS receipt contradicts the accepted high threshold" }
  if ($Body.audit.severityCounts.total -ne ($Body.audit.severityCounts.info + $Body.audit.severityCounts.low + $Body.audit.severityCounts.moderate + $Body.audit.severityCounts.high + $Body.audit.severityCounts.critical)) { Fail-Procedure "PASS receipt has inconsistent audit severity counts" }
  if ($Body.sbom.first.rawByteLength -ne $Body.sbom.second.rawByteLength -or $Body.sbom.first.rawSha256 -ne $Body.sbom.second.rawSha256) { Fail-Procedure "PASS receipt contradicts raw SBOM equality" }
  if ($Body.firewall.ruleA.ruleLifecycleClass -ne "NEGATIVE_AUDIT" -or $Body.firewall.ruleB.ruleLifecycleClass -ne "SBOM_AND_FIXTURES") { Fail-Procedure "PASS receipt firewall lifecycle classes are not exact" }
  foreach ($lifecycle in @($Body.firewall.ruleA, $Body.firewall.ruleB)) {
    if ($lifecycle.ruleIdentitySha256 -eq "NOT AVAILABLE") { Fail-Procedure "PASS receipt has unavailable firewall identity" }
    foreach ($field in @("persistentRuleAbsentBefore", "activeRuleAbsentBefore", "firewallRuleCreated", "firewallRuleActive", "allProfilesEnabledDuringLifecycle", "profileStateRecheckPassed", "ruleEffectiveForActiveProfiles", "firewallProgramIdentityMatched", "firewallScopeVerified", "runtimeCollisionAbsent", "persistentRuleAbsentAfter", "activeRuleAbsentAfter")) { if ($lifecycle[$field] -ne $true) { Fail-Procedure "PASS receipt has incomplete firewall lifecycle" } }
  }
  if ($Body.phases[0].exitClass -ne "EXPECTED_NETWORK_UNAVAILABLE" -or $Body.phases[1].exitClass -ne "COMPLETE" -or $Body.phases[2].exitClass -ne "COMPLETE" -or $Body.phases[3].exitClass -ne "DECLARATION_MISSING" -or $Body.phases[4].exitClass -ne "DECLARATION_NOASSERTION" -or $Body.phases[5].exitClass -ne "DECLARATION_MALFORMED" -or $Body.phases[6].exitClass -ne "COMPLETE_NO_THRESHOLD_FINDING") { Fail-Procedure "PASS receipt has incomplete phase results" }
  foreach ($phase in $Body.phases) {
    $expectedPhaseIdentity = if ($phase.phase -in @("negative-audit", "positive-audit")) { Get-CommandIdentity -Label "npm-audit" -Runtime $identityRuntime -Arguments @("audit", "--json", "--audit-level=high") } else { Get-CommandIdentity -Label "npm-sbom" -Runtime $identityRuntime -Arguments @("sbom", "--package-lock-only", "--sbom-format=spdx") }
    if ($phase.commandIdentity -ne $expectedPhaseIdentity -or $phase.freshInvocationState -ne $true -or $phase.freshCacheEmpty -ne $true) { Fail-Procedure "PASS receipt has incomplete phase custody" }
  }
  foreach ($run in @($Body.sbom.first, $Body.sbom.second)) {
    if ($run.completeGraph -ne $true -or $run.exitClass -ne "COMPLETE" -or $run.rawByteLength -le 0 -or $run.rawSha256 -eq "NOT AVAILABLE" -or $run.coverage.rootPresent -ne $true -or $run.coverage.packagesExpected -ne $run.coverage.packagesObserved -or $run.coverage.relationshipsExpected -ne $run.coverage.relationshipsObserved) { Fail-Procedure "PASS receipt has incomplete SBOM coverage" }
    foreach ($category in $run.coverage.categories.Values) { if ($category.expected -ne $category.observed) { Fail-Procedure "PASS receipt has incomplete SBOM category coverage" } }
    $declarationCount = 0
    foreach ($name in @("missing", "empty", "malformed", "noAssertion", "unknown", "declared", "unmappable", "ambiguous")) { $declarationCount += [int]$run.declaredLicenseCounts[$name] }
    if ($declarationCount -ne $run.coverage.packagesObserved) { Fail-Procedure "PASS receipt has incomplete SBOM declaration accounting" }
  }
}

function New-SanitizedReceiptBody {
  param(
    [Parameter(Mandatory = $true)][string]$Status,
    [Parameter(Mandatory = $true)][string]$StartedAtUtc,
    [Parameter(Mandatory = $true)][string]$FinishedAtUtc,
    [Parameter(Mandatory = $true)][System.Collections.IDictionary]$Host,
    [Parameter(Mandatory = $true)][System.Collections.IDictionary]$Runtime,
    [Parameter(Mandatory = $true)][System.Collections.IDictionary]$Source,
    [Parameter(Mandatory = $true)][System.Collections.IDictionary]$Configuration,
    [Parameter(Mandatory = $true)][object[]]$Ledger,
    [Parameter(Mandatory = $true)][System.Collections.IDictionary]$Firewall,
    [Parameter(Mandatory = $true)][System.Collections.IDictionary]$Custody,
    [Parameter(Mandatory = $true)][string]$IngressIdentity,
    [Parameter(Mandatory = $true)][object]$Audit,
    [Parameter(Mandatory = $true)][object]$Sbom
  )
  if ($Ledger.Count -ne $EvidencePhaseOrder.Count) { Fail-Procedure "phase receipt ledger is incomplete" }
  $phases = @()
  for ($index = 0; $index -lt $EvidencePhaseOrder.Count; $index += 1) {
    $phase = $Ledger[$index]
    if ($phase -isnot [System.Collections.IDictionary] -or $phase.Phase -cne $EvidencePhaseOrder[$index]) { Fail-Procedure "phase receipt order is invalid" }
    $phases += [ordered]@{
      phase = $EvidencePhaseOrder[$index]
      commandIdentity = Get-SafeReceiptSha256OrUnavailable -Value $phase.CommandIdentity -Label "phase command identity"
      exitClass = Get-SafeReceiptText -Value $phase.ExitClass -Allowed $ReceiptPhaseExitClasses -Label "phase exit class"
      freshInvocationState = Get-SafeReceiptBoolean -Value $phase.FreshInvocationState -Label "phase fresh invocation predicate"
      freshCacheEmpty = Get-SafeReceiptBoolean -Value $phase.FreshCacheEmpty -Label "phase fresh cache predicate"
    }
  }
  if (-not (Test-ExactKeySet -Actual @($Firewall.Keys) -Expected @("recoveryChecked", "recoveryCompletedWhenNeeded", "ruleA", "ruleB"))) { Fail-Procedure "firewall receipt shape is invalid" }
  $safeConfiguration = [ordered]@{}
  $configurationFields = @("allowlistVersion", "probeSetVersion", "probeSetExitClass", "credentialBearingInputAbsent", "controlledConfigEmpty", "effectiveRegistryMatches", "networkModeOnline", "noScopeReduction", "proxiesAbsent", "workspaceSelectionInactive")
  if (-not (Test-ExactKeySet -Actual @($Configuration.Keys) -Expected $configurationFields)) { Fail-Procedure "configuration receipt shape is invalid" }
  foreach ($name in $configurationFields) {
    if (-not $Configuration.Contains($name)) { Fail-Procedure "configuration receipt is incomplete" }
    $safeConfiguration[$name] = if ($name -eq "allowlistVersion") { Get-SafeReceiptText -Value $Configuration[$name] -Allowed @("nightdrive.ndqa003.windows-arm64-npm-environment.v1", "NOT AVAILABLE") -Label "configuration allowlist version" } elseif ($name -eq "probeSetVersion") { Get-SafeReceiptText -Value $Configuration[$name] -Allowed @("nightdrive.ndqa003.windows-arm64-npm-probes.v1", "NOT AVAILABLE") -Label "configuration probe set version" } elseif ($name -eq "probeSetExitClass") { Get-SafeReceiptText -Value $Configuration[$name] -Allowed @("COMPLETE", "NOT AVAILABLE") -Label "configuration probe set exit class" } else { Get-SafeReceiptBoolean -Value $Configuration[$name] -Label "configuration predicate" }
  }
  $safeAudit = if ($Audit -is [System.Collections.IDictionary]) {
    $severity = $Audit.severityCounts
    if ($severity -isnot [System.Collections.IDictionary]) { Fail-Procedure "audit receipt severity is incomplete" }
    $safeSeverity = [ordered]@{}
    foreach ($name in @("info", "low", "moderate", "high", "critical", "total")) { $safeSeverity[$name] = Get-SafeNonNegativeInteger -Value $severity[$name] -Label "audit severity" }
    if (-not (Test-ExactKeySet -Actual @($Audit.Keys) -Expected @("complete", "exitClass", "rawByteLength", "rawSha256", "severityCounts"))) { Fail-Procedure "audit receipt shape is invalid" }
    [ordered]@{ complete = Get-SafeReceiptBoolean -Value $Audit.complete -Label "audit complete predicate"; exitClass = Get-SafeReceiptText -Value $Audit.exitClass -Allowed @("COMPLETE_NO_THRESHOLD_FINDING", "COMPLETE_THRESHOLD_FINDING") -Label "audit exit class"; rawByteLength = Get-SafeNonNegativeInteger -Value $Audit.rawByteLength -Label "audit raw length"; rawSha256 = Get-SafeReceiptSha256OrUnavailable -Value $Audit.rawSha256 -Label "audit raw hash"; severityCounts = $safeSeverity }
  } else { "NOT AVAILABLE" }
  $safeSbom = if ($Sbom -is [System.Collections.IDictionary]) {
    if (-not (Test-ExactKeySet -Actual @($Sbom.Keys) -Expected @("determinism", "rawEqual", "semanticComparable", "semanticEqual", "first", "second"))) { Fail-Procedure "SBOM receipt shape is invalid" }
    [ordered]@{ determinism = Get-SafeReceiptText -Value $Sbom.determinism -Allowed @("PASS", "NOT VERIFIED") -Label "SBOM determinism"; rawEqual = Get-SafeReceiptBoolean -Value $Sbom.rawEqual -Label "SBOM raw equality"; semanticComparable = Get-SafeReceiptBoolean -Value $Sbom.semanticComparable -Label "SBOM semantic comparability"; semanticEqual = Get-SafeReceiptBoolean -Value $Sbom.semanticEqual -Label "SBOM semantic equality"; first = Get-SanitizedSbomRun -Summary $Sbom.first; second = Get-SanitizedSbomRun -Summary $Sbom.second }
  } else { "NOT AVAILABLE" }
  $body = [ordered]@{
    schema = "nightdrive.ndqa003.windows-arm64-evidence-receipt.v1"; procedureVersion = $ProcedureVersion; status = Get-SafeReceiptText -Value $Status -Allowed $ReceiptStatuses -Label "receipt status"
    startedAtUtc = $StartedAtUtc; finishedAtUtc = $FinishedAtUtc
    platform = [ordered]@{
      osFamilyWindows = Get-SafeReceiptBoolean -Value ($Host.OsFamily -eq "windows") -Label "platform operating-system predicate"
      hostArchitecture = Get-SafeReceiptText -Value $Host.HostArchitecture -Allowed @("arm64", "NOT AVAILABLE") -Label "platform host architecture"
      processArchitecture = Get-SafeReceiptText -Value $Host.ProcessArchitecture -Allowed @("arm64", "NOT AVAILABLE") -Label "platform process architecture"
      processPlatform = if ($Host.OsFamily -eq "windows") { "win32" } else { "NOT AVAILABLE" }
      nativeArm64 = Get-SafeReceiptBoolean -Value $Host.NativeArm64 -Label "platform native ARM64 predicate"
    }
    toolchain = [ordered]@{
      node = Get-SafeReceiptText -Value $Runtime.NodeVersion -Allowed @($ExpectedNodeVersion, "NOT AVAILABLE") -Label "toolchain Node version"
      npm = Get-SafeReceiptText -Value $Runtime.NpmVersion -Allowed @($ExpectedNpmVersion, "NOT AVAILABLE") -Label "toolchain npm version"
      nodeSha256 = Get-SafeReceiptSha256OrUnavailable -Value $Runtime.NodeSha256 -Label "toolchain node identity"
      npmCmdSha256 = Get-SafeReceiptSha256OrUnavailable -Value $Runtime.NpmCmdSha256 -Label "toolchain npm.cmd identity"
      npmCliSha256 = Get-SafeReceiptSha256OrUnavailable -Value $Runtime.NpmCliSha256 -Label "toolchain npm CLI identity"
      nodeVersionCommandIdentity = Get-SafeReceiptSha256OrUnavailable -Value $Runtime.NodeVersionCommandIdentity -Label "toolchain Node version command identity"
      npmVersionCommandIdentity = Get-SafeReceiptSha256OrUnavailable -Value $Runtime.NpmVersionCommandIdentity -Label "toolchain npm version command identity"
      nodeVersionMatched = Get-SafeReceiptBoolean -Value $Runtime.NodeVersionMatched -Label "toolchain Node version predicate"
      npmVersionMatched = Get-SafeReceiptBoolean -Value $Runtime.NpmVersionMatched -Label "toolchain npm version predicate"
      runtimeProvenanceMatched = Get-SafeReceiptBoolean -Value $Runtime.RuntimeProvenanceMatched -Label "toolchain provenance predicate"
      npmCmdBindingMatched = Get-SafeReceiptBoolean -Value $Runtime.NpmCmdBindingMatched -Label "toolchain npm binding predicate"
      launcherNodeIdentityMatched = Get-SafeReceiptBoolean -Value $Runtime.LauncherNodeIdentityMatched -Label "toolchain launcher identity predicate"
    }
    ingress = [ordered]@{ attestationSha256 = if ($IngressIdentity -match "^[0-9a-f]{64}$") { $IngressIdentity } else { "NOT AVAILABLE" } }
    checkout = [ordered]@{ commit = Get-SafeReceiptSha1OrUnavailable -Value $Source.Commit -Label "checkout commit"; tree = Get-SafeReceiptSha1OrUnavailable -Value $Source.Tree -Label "checkout tree"; packageLockSha256 = Get-SafeReceiptSha256OrUnavailable -Value $Source.PackageLockSha256 -Label "checkout lock identity"; projectNpmrcSha256 = Get-SafeReceiptSha256OrUnavailable -Value $Source.ProjectNpmrcSha256 -Label "checkout project configuration identity" }
    configuration = $safeConfiguration
    firewall = [ordered]@{ recoveryChecked = Get-SafeReceiptBoolean -Value $Firewall.recoveryChecked -Label "firewall recovery predicate"; recoveryCompletedWhenNeeded = Get-SafeReceiptBoolean -Value $Firewall.recoveryCompletedWhenNeeded -Label "firewall recovery completion predicate"; ruleA = Get-SanitizedLifecycle -Lifecycle $Firewall.ruleA; ruleB = Get-SanitizedLifecycle -Lifecycle $Firewall.ruleB }
    phases = $phases; audit = $safeAudit; sbom = $safeSbom
    custody = [ordered]@{ repositoryUnchanged = Get-SafeReceiptBoolean -Value $Custody.repositoryUnchanged -Label "custody repository predicate"; untrackedStateEmpty = Get-SafeReceiptBoolean -Value $Custody.untrackedStateEmpty -Label "custody untracked predicate"; noNodeModules = Get-SafeReceiptBoolean -Value $Custody.noNodeModules -Label "custody node_modules predicate"; cleanupVerified = Get-SafeReceiptBoolean -Value $Custody.cleanupVerified -Label "custody cleanup predicate"; sanitizedReceiptOnly = Get-SafeReceiptBoolean -Value $Custody.sanitizedReceiptOnly -Label "custody sanitized-retention predicate" }
  }
  Assert-PassReceiptBody -Body $body
  return $body
}
function Write-SanitizedReceipt {
  param(
    [Parameter(Mandatory = $true)][string]$Directory,
    [Parameter(Mandatory = $true)][System.Collections.IDictionary]$Body
  )
  if (Test-Path -LiteralPath $Directory) { Fail-Procedure "receipt directory is no longer exclusively available" }
  $created = $false
  $privateBoundaryEstablished = $false
  try {
    New-Item -ItemType Directory -LiteralPath $Directory -ErrorAction Stop | Out-Null
    $created = $true
    Set-PrivateAcl -Path $Directory -IsDirectory $true
    $privateBoundaryEstablished = $true
    $bodyJson = $Body | ConvertTo-Json -Compress -Depth 32
    $bodyBytes = [Text.UTF8Encoding]::new($false).GetBytes($bodyJson)
    $record = [ordered]@{ receipt = $Body; bodySha256 = [Convert]::ToHexString([Security.Cryptography.SHA256]::HashData($bodyBytes)).ToLowerInvariant() }
    $bytes = [Text.UTF8Encoding]::new($false).GetBytes(($record | ConvertTo-Json -Compress -Depth 32) + "`n")
    $path = Join-Path $Directory "ndqa003-windows-arm64-evidence-receipt.json"
    $stream = [IO.FileStream]::new($path, [IO.FileMode]::CreateNew, [IO.FileAccess]::Write, [IO.FileShare]::None, 4096, [IO.FileOptions]::WriteThrough)
    try { $stream.Write($bytes, 0, $bytes.Length); $stream.Flush($true) }
    finally { $stream.Dispose() }
    Set-PrivateAcl -Path $path -IsDirectory $false
    $persisted = [IO.File]::ReadAllBytes($path)
    if (-not [Linq.Enumerable]::SequenceEqual[byte]($bytes, $persisted)) { Fail-Procedure "receipt changed after exclusive write" }
    $entries = @(Get-ChildItem -LiteralPath $Directory -Force -ErrorAction Stop)
    if ($entries.Count -ne 1 -or $entries[0].PSIsContainer -or $entries[0].Name -cne "ndqa003-windows-arm64-evidence-receipt.json") { Fail-Procedure "receipt directory does not retain exactly one sanitized receipt" }
    return [ordered]@{ ByteLength = $persisted.Length; Sha256 = [Convert]::ToHexString([Security.Cryptography.SHA256]::HashData($persisted)).ToLowerInvariant() }
  }
  catch {
    $publicationFailure = $_
    if ($created -and $privateBoundaryEstablished -and (Test-Path -LiteralPath $Directory)) {
      try { Clear-PrivateTaskData -Scratch $Directory }
      catch { Fail-Procedure "sanitized receipt publication cleanup cannot be verified" }
    }
    elseif ($created -and (Test-Path -LiteralPath $Directory)) {
      Fail-Procedure "sanitized receipt publication boundary cannot be cleaned safely"
    }
    throw $publicationFailure
  }
}

function New-FirewallLifecycleRecord {
  param([Parameter(Mandatory = $true)][string]$LifecycleClass)
  return [ordered]@{
    ruleLifecycleClass = $LifecycleClass; persistentRuleAbsentBefore = $false; activeRuleAbsentBefore = $false
    firewallRuleCreated = $false; firewallRuleActive = $false; allProfilesEnabledDuringLifecycle = $false
    profileStateRecheckPassed = $false; ruleEffectiveForActiveProfiles = $false; firewallProgramIdentityMatched = $false
    firewallScopeVerified = $false; runtimeCollisionAbsent = $false; persistentRuleAbsentAfter = $false
    activeRuleAbsentAfter = $false; ruleIdentitySha256 = "NOT AVAILABLE"
  }
}

function Assert-MaterialCustody {
  param(
    [Parameter(Mandatory = $true)][string]$Checkout,
    [Parameter(Mandatory = $true)][string]$Commit,
    [Parameter(Mandatory = $true)][string]$Tree,
    [Parameter(Mandatory = $true)][string]$Git,
    [Parameter(Mandatory = $true)][string]$PrivateRoot,
    [Parameter(Mandatory = $true)][System.Collections.IDictionary]$Expected
  )
  $observed = Assert-RepositoryIntegrity -Root $Checkout -Commit $Commit -Tree $Tree -Git $Git -PrivateRoot $PrivateRoot
  foreach ($field in @("Commit", "Tree", "PackageLockSha256", "ProjectNpmrcSha256", "WrapperSha256", "LauncherSha256", "RunnerSha256")) {
    if ($observed[$field] -ne $Expected[$field]) { Fail-Procedure "repository immutable-input custody changed" }
  }
  return $observed
}

function Assert-FinalMaterialCustody {
  param(
    [Parameter(Mandatory = $true)][System.Collections.IDictionary]$Layout,
    [Parameter(Mandatory = $true)][string]$Checkout,
    [Parameter(Mandatory = $true)][string]$Commit,
    [Parameter(Mandatory = $true)][string]$Tree,
    [Parameter(Mandatory = $true)][string]$Git,
    [Parameter(Mandatory = $true)][System.Collections.IDictionary]$Expected
  )
  $parent = Resolve-ExistingDirectory -Path (Split-Path -Parent $Layout.Receipt) -Label "final custody parent"
  $private = Join-Path $parent ("ndqa003-windows-arm64-final-custody-" + [Guid]::NewGuid().ToString("N"))
  Assert-OutsideCheckout -Checkout $Checkout -Path $private -Label "final custody private output"
  if (Test-Path -LiteralPath $private) { Fail-Procedure "final custody private-output collision" }
  $created = $false
  $privateBoundaryEstablished = $false
  try {
    New-Item -ItemType Directory -LiteralPath $private -ErrorAction Stop | Out-Null
    $created = $true
    Set-PrivateAcl -Path $private -IsDirectory $true
    $privateBoundaryEstablished = $true
    $observed = Assert-MaterialCustody -Checkout $Checkout -Commit $Commit -Tree $Tree -Git $Git -PrivateRoot $private -Expected $Expected
    if (@(Get-ChildItem -LiteralPath $private -Force -ErrorAction Stop).Count -ne 0) { Fail-Procedure "final custody private output was not deleted after inspection" }
    return $observed
  }
  finally {
    if ($created -and $privateBoundaryEstablished -and (Test-Path -LiteralPath $private)) { Clear-PrivateTaskData -Scratch $private }
    elseif ($created -and (Test-Path -LiteralPath $private)) { Fail-Procedure "final custody private boundary cannot be cleaned safely" }
  }
}

function Assert-PostCleanupRepositoryCustody {
  param(
    [Parameter(Mandatory = $true)][System.Collections.IDictionary]$Layout,
    [Parameter(Mandatory = $true)][string]$Checkout,
    [Parameter(Mandatory = $true)][string]$Commit,
    [Parameter(Mandatory = $true)][string]$Tree,
    [Parameter(Mandatory = $true)][string]$Git,
    [Parameter(Mandatory = $true)][System.Collections.IDictionary]$Expected
  )
  # This second full inspection occurs after the first final-custody root has
  # been removed. Its Git raw output is synchronously deleted before the
  # disposable inspection root itself is removed.
  return (Assert-FinalMaterialCustody -Layout $Layout -Checkout $Checkout -Commit $Commit -Tree $Tree -Git $Git -Expected $Expected)
}

function Set-FirewallLifecycleActive {
  param([Parameter(Mandatory = $true)][System.Collections.IDictionary]$Lifecycle, [Parameter(Mandatory = $true)][System.Collections.IDictionary]$Rule, [Parameter(Mandatory = $true)][System.Collections.IDictionary]$Runtime)
  Assert-RuntimeProvenanceStillBound -Runtime $Runtime
  [void](Assert-ExactFirewallRule -RuleName $Rule.RuleName -NodePath $Runtime.Node)
  $Lifecycle.persistentRuleAbsentBefore = $true; $Lifecycle.activeRuleAbsentBefore = $true; $Lifecycle.firewallRuleCreated = $true; $Lifecycle.firewallRuleActive = $true
  $Lifecycle.allProfilesEnabledDuringLifecycle = $true; $Lifecycle.profileStateRecheckPassed = $true; $Lifecycle.ruleEffectiveForActiveProfiles = $true
  $Lifecycle.firewallProgramIdentityMatched = $true; $Lifecycle.firewallScopeVerified = $true; $Lifecycle.runtimeCollisionAbsent = $true; $Lifecycle.ruleIdentitySha256 = $Rule.RuleIdentitySha256
}

function Set-FirewallLifecycleAbsent {
  param([Parameter(Mandatory = $true)][System.Collections.IDictionary]$Lifecycle, [Parameter(Mandatory = $true)][string]$RuleName)
  Assert-ExactRuleAbsent -RuleName $RuleName
  $Lifecycle.persistentRuleAbsentAfter = $true; $Lifecycle.activeRuleAbsentAfter = $true
}

function Compare-SbomRawBytes {
  param([Parameter(Mandatory = $true)][byte[]]$First, [Parameter(Mandatory = $true)][byte[]]$Second)
  if ([Linq.Enumerable]::SequenceEqual[byte]($First, $Second)) { return [ordered]@{ determinism = "PASS"; rawEqual = $true; semanticComparable = $true; semanticEqual = $true } }
  try {
    $left = (Get-StrictUtf8Text -Bytes $First -Label "first SBOM raw output") | ConvertFrom-Json -AsHashtable -Depth 64
    $right = (Get-StrictUtf8Text -Bytes $Second -Label "second SBOM raw output") | ConvertFrom-Json -AsHashtable -Depth 64
    foreach ($document in @($left, $right)) {
      if ($document -isnot [System.Collections.IDictionary]) { throw "not-object" }
      [void]$document.Remove("documentNamespace")
      if ($document.creationInfo -is [System.Collections.IDictionary]) { [void]$document.creationInfo.Remove("created") }
    }
    $semanticEqual = (($left | ConvertTo-Json -Compress -Depth 64) -ceq ($right | ConvertTo-Json -Compress -Depth 64))
    return [ordered]@{ determinism = "NOT VERIFIED"; rawEqual = $false; semanticComparable = $true; semanticEqual = $semanticEqual }
  }
  catch { return [ordered]@{ determinism = "NOT VERIFIED"; rawEqual = $false; semanticComparable = $false; semanticEqual = $false } }
}

function Assert-FixtureDeclaration {
  param([Parameter(Mandatory = $true)][System.Collections.IDictionary]$Summary, [Parameter(Mandatory = $true)][string]$Kind)
  if ($Kind -notin @("missing", "noassertion", "malformed")) { Fail-Procedure "unknown declaration fixture" }
  $observed = [string]$Summary.rootDeclarationCategory
  if ($observed -notin @("missing", "empty", "malformed", "noAssertion", "unknown")) { Fail-Procedure "declaration fixture did not produce an explicit non-pass category" }
  return $observed
}
function Invoke-WindowsArm64Evidence {
  $startedAtUtc = [DateTime]::UtcNow.ToString("o")
  $layout = $null
  $trustedReceiptDirectory = $null
  $boundary = $null
  $failure = $null
  $checkout = $null
  $host = $null
  $runtime = New-ReceiptRuntimeState
  $source = [ordered]@{ Commit = "NOT AVAILABLE"; Tree = "NOT AVAILABLE"; PackageLockSha256 = "NOT AVAILABLE"; ProjectNpmrcSha256 = "NOT AVAILABLE" }
  $git = $null
  $ledger = New-UnavailablePhaseLedger
  $configuration = [ordered]@{ allowlistVersion = "NOT AVAILABLE"; probeSetVersion = "NOT AVAILABLE"; probeSetExitClass = "NOT AVAILABLE"; credentialBearingInputAbsent = $false; controlledConfigEmpty = $false; effectiveRegistryMatches = $false; networkModeOnline = $false; noScopeReduction = $false; proxiesAbsent = $false; workspaceSelectionInactive = $false }
  $firewall = [ordered]@{ recoveryChecked = $false; recoveryCompletedWhenNeeded = $false; ruleA = New-FirewallLifecycleRecord -LifecycleClass "NEGATIVE_AUDIT"; ruleB = New-FirewallLifecycleRecord -LifecycleClass "SBOM_AND_FIXTURES" }
  $custody = [ordered]@{ repositoryUnchanged = $false; untrackedStateEmpty = $false; noNodeModules = $false; cleanupVerified = $false; sanitizedReceiptOnly = $false }
  $ingressIdentity = "NOT AVAILABLE"
  $auditSummary = $null
  $sbomSummary = $null
  $status = "FAIL"
  $receiptRetentionSafe = $false
  $unsafeCleanup = $false
  try {
    $checkout = Resolve-ExistingDirectory -Path (Join-Path $PSScriptRoot "..") -Label "repository root"
    $expectedWrapper = Resolve-ExistingFile -Path (Join-Path $checkout "scripts\run-ndqa003-windows-arm64-evidence.ps1") -Label "tracked wrapper"
    $actualWrapper = Resolve-ExistingFile -Path $PSCommandPath -Label "invoked wrapper"
    $currentDirectory = Resolve-ExistingDirectory -Path (Get-Location).Path -Label "current directory"
    if ($actualWrapper -ne $expectedWrapper -or $currentDirectory -ne $checkout) { Fail-Procedure "must invoke the tracked wrapper from the repository root" }
    $trustedReceiptDirectory = Resolve-TrustedReceiptDirectory -Checkout $checkout -ReceiptPath $ReceiptDirectory
    if ($ReviewedCommit -notmatch "^[0-9a-f]{40}$" -or $ReviewedTree -notmatch "^[0-9a-f]{40}$") { Fail-Procedure "reviewed tuple is malformed" }
    $source.Commit = $ReviewedCommit; $source.Tree = $ReviewedTree
    # Establish the private receipt boundary before host and process-start
    # preflight so a rejected trusted invocation can retain only its terminal
    # sanitized result after the private scratch area is removed.
    $layout = New-TaskLayout -Checkout $checkout -ReceiptPath $ReceiptDirectory -StableRecoveryRoot $RecoveryRoot
    $host = Get-TrustedWindowsHost
    Assert-NoUnsafeProcessStartOverrides
    $git = Get-GitExecutable
    $runtime = Get-RuntimeProvenance -Root $RuntimeRoot -ProvenancePath $RuntimeProvenancePath -Checkout $checkout
    $ledger = New-PhaseLedger -Runtime $runtime
    $source = Assert-RepositoryIntegrity -Root $checkout -Commit $ReviewedCommit -Tree $ReviewedTree -Git $git -PrivateRoot $layout.Roles.git
    $boundary = Enter-RecoveryBoundary -Recovery $layout.Recovery
    Assert-FirewallCapabilities
    Assert-AdministrativeToken
    $recovery = Recover-TaskFirewallRule -Recovery $layout.Recovery
    $firewall.recoveryChecked = $recovery.Checked; $firewall.recoveryCompletedWhenNeeded = $recovery.CompletedWhenNeeded
    $source = Assert-MaterialCustody -Checkout $checkout -Commit $ReviewedCommit -Tree $ReviewedTree -Git $git -PrivateRoot $layout.Roles.git -Expected $source
    $ingressIdentity = Invoke-LauncherIngress -Checkout $checkout -Runtime $runtime -Layout $layout -Host $host -Commit $ReviewedCommit -Tree $ReviewedTree -ProvenancePath $RuntimeProvenancePath -Source $source
    $runtime.LauncherNodeIdentityMatched = $true
    Assert-ExactToolchain -Runtime $runtime -Layout $layout -Host $host -Checkout $checkout
    $source = Assert-MaterialCustody -Checkout $checkout -Commit $ReviewedCommit -Tree $ReviewedTree -Git $git -PrivateRoot $layout.Roles.git -Expected $source
    $configuration = Assert-NpmConfiguration -Runtime $runtime -Layout $layout -Host $host -Checkout $checkout
    $source = Assert-MaterialCustody -Checkout $checkout -Commit $ReviewedCommit -Tree $ReviewedTree -Git $git -PrivateRoot $layout.Roles.git -Expected $source
    $custody.repositoryUnchanged = $true; $custody.untrackedStateEmpty = $true; $custody.noNodeModules = $true
    $lockGraph = Get-LockfileGraph -Checkout $checkout

    $ruleA = $null
    try {
      $ruleA = New-ExactTaskFirewallRule -Recovery $layout.Recovery -Runtime $runtime
      Set-FirewallLifecycleActive -Lifecycle $firewall.ruleA -Rule $ruleA -Runtime $runtime
      $source = Assert-MaterialCustody -Checkout $checkout -Commit $ReviewedCommit -Tree $ReviewedTree -Git $git -PrivateRoot $layout.Roles.git -Expected $source
      Mark-PhaseExecutionAttempt -Ledger $ledger -Phase "negative-audit"
      Set-FirewallLifecycleActive -Lifecycle $firewall.ruleA -Rule $ruleA -Runtime $runtime
      $negative = Invoke-FreshNpmCommand -Runtime $runtime -Layout $layout -Host $host -Checkout $checkout -WorkingDirectory $checkout -NpmArguments @("audit", "--json", "--audit-level=high") -Label "negative-audit"
      Set-FirewallLifecycleActive -Lifecycle $firewall.ruleA -Rule $ruleA -Runtime $runtime
      if (-not (Test-NegativeAuditResult -Result $negative.Result)) { Fail-Procedure "negative audit did not prove network unavailability" }
      Record-Phase -Ledger $ledger -Phase "negative-audit" -ExitClass "EXPECTED_NETWORK_UNAVAILABLE" -FreshInvocationState $negative.FreshInvocationState -FreshCacheEmpty $negative.FreshCacheEmpty
      $source = Assert-MaterialCustody -Checkout $checkout -Commit $ReviewedCommit -Tree $ReviewedTree -Git $git -PrivateRoot $layout.Roles.git -Expected $source
    }
    finally {
      Finalize-TaskFirewallLifecycle -Recovery $layout.Recovery -Lifecycle $firewall.ruleA -Rule $ruleA
      $source = Assert-MaterialCustody -Checkout $checkout -Commit $ReviewedCommit -Tree $ReviewedTree -Git $git -PrivateRoot $layout.Roles.git -Expected $source
    }

    $ruleB = $null
    try {
      $ruleB = New-ExactTaskFirewallRule -Recovery $layout.Recovery -Runtime $runtime
      Set-FirewallLifecycleActive -Lifecycle $firewall.ruleB -Rule $ruleB -Runtime $runtime
      $source = Assert-MaterialCustody -Checkout $checkout -Commit $ReviewedCommit -Tree $ReviewedTree -Git $git -PrivateRoot $layout.Roles.git -Expected $source
      Mark-PhaseExecutionAttempt -Ledger $ledger -Phase "sbom-first"
      Set-FirewallLifecycleActive -Lifecycle $firewall.ruleB -Rule $ruleB -Runtime $runtime
      $first = Invoke-FreshNpmCommand -Runtime $runtime -Layout $layout -Host $host -Checkout $checkout -WorkingDirectory $checkout -NpmArguments @("sbom", "--package-lock-only", "--sbom-format=spdx") -Label "sbom-first"
      Set-FirewallLifecycleActive -Lifecycle $firewall.ruleB -Rule $ruleB -Runtime $runtime
      $firstSummary = Get-SbomSummary -Result $first.Result -ExpectedGraph $lockGraph
      Record-Phase -Ledger $ledger -Phase "sbom-first" -ExitClass $firstSummary.exitClass -FreshInvocationState $first.FreshInvocationState -FreshCacheEmpty $first.FreshCacheEmpty
      $source = Assert-MaterialCustody -Checkout $checkout -Commit $ReviewedCommit -Tree $ReviewedTree -Git $git -PrivateRoot $layout.Roles.git -Expected $source
      Mark-PhaseExecutionAttempt -Ledger $ledger -Phase "sbom-second"
      Set-FirewallLifecycleActive -Lifecycle $firewall.ruleB -Rule $ruleB -Runtime $runtime
      $second = Invoke-FreshNpmCommand -Runtime $runtime -Layout $layout -Host $host -Checkout $checkout -WorkingDirectory $checkout -NpmArguments @("sbom", "--package-lock-only", "--sbom-format=spdx") -Label "sbom-second"
      Set-FirewallLifecycleActive -Lifecycle $firewall.ruleB -Rule $ruleB -Runtime $runtime
      $secondSummary = Get-SbomSummary -Result $second.Result -ExpectedGraph $lockGraph
      Record-Phase -Ledger $ledger -Phase "sbom-second" -ExitClass $secondSummary.exitClass -FreshInvocationState $second.FreshInvocationState -FreshCacheEmpty $second.FreshCacheEmpty
      $source = Assert-MaterialCustody -Checkout $checkout -Commit $ReviewedCommit -Tree $ReviewedTree -Git $git -PrivateRoot $layout.Roles.git -Expected $source
      foreach ($kind in @("missing", "noassertion", "malformed")) {
        $fixture = $null
        try {
          $fixture = New-DeclarationFixture -Checkout $checkout -Root $layout.Roles.fixtures -Kind $kind
          Assert-FixtureMutation -Fixture $fixture -Checkout $checkout -Kind $kind
          $fixtureGraph = Get-LockfileGraph -Checkout $fixture
          Mark-PhaseExecutionAttempt -Ledger $ledger -Phase ("fixture-" + $kind)
          Set-FirewallLifecycleActive -Lifecycle $firewall.ruleB -Rule $ruleB -Runtime $runtime
          $fixtureResult = Invoke-FreshNpmCommand -Runtime $runtime -Layout $layout -Host $host -Checkout $fixture -WorkingDirectory $fixture -NpmArguments @("sbom", "--package-lock-only", "--sbom-format=spdx") -Label ("fixture-" + $kind)
          Set-FirewallLifecycleActive -Lifecycle $firewall.ruleB -Rule $ruleB -Runtime $runtime
          $fixtureSummary = Get-SbomSummary -Result $fixtureResult.Result -ExpectedGraph $fixtureGraph
          $observedFixtureCategory = Assert-FixtureDeclaration -Summary $fixtureSummary -Kind $kind
          Record-Phase -Ledger $ledger -Phase ("fixture-" + $kind) -ExitClass ("DECLARATION_" + $observedFixtureCategory.ToUpperInvariant()) -FreshInvocationState $fixtureResult.FreshInvocationState -FreshCacheEmpty $fixtureResult.FreshCacheEmpty
          $source = Assert-MaterialCustody -Checkout $checkout -Commit $ReviewedCommit -Tree $ReviewedTree -Git $git -PrivateRoot $layout.Roles.git -Expected $source
        }
        finally {
          if ($null -ne $fixture -and (Test-Path -LiteralPath $fixture)) { Clear-PrivateTaskData -Scratch $fixture }
        }
      }
      $comparison = Compare-SbomRawBytes -First $first.Result.StdoutBytes -Second $second.Result.StdoutBytes
      $sbomSummary = [ordered]@{ determinism = $comparison.determinism; rawEqual = $comparison.rawEqual; semanticComparable = $comparison.semanticComparable; semanticEqual = $comparison.semanticEqual; first = $firstSummary; second = $secondSummary }
    }
    finally {
      Finalize-TaskFirewallLifecycle -Recovery $layout.Recovery -Lifecycle $firewall.ruleB -Rule $ruleB
      $source = Assert-MaterialCustody -Checkout $checkout -Commit $ReviewedCommit -Tree $ReviewedTree -Git $git -PrivateRoot $layout.Roles.git -Expected $source
    }

    Mark-PhaseExecutionAttempt -Ledger $ledger -Phase "positive-audit"
    $positive = Invoke-FreshNpmCommand -Runtime $runtime -Layout $layout -Host $host -Checkout $checkout -WorkingDirectory $checkout -NpmArguments @("audit", "--json", "--audit-level=high") -Label "positive-audit"
    $auditSummary = Get-PositiveAuditSummary -Result $positive.Result
    Record-Phase -Ledger $ledger -Phase "positive-audit" -ExitClass $auditSummary.exitClass -FreshInvocationState $positive.FreshInvocationState -FreshCacheEmpty $positive.FreshCacheEmpty
    $source = Assert-MaterialCustody -Checkout $checkout -Commit $ReviewedCommit -Tree $ReviewedTree -Git $git -PrivateRoot $layout.Roles.git -Expected $source
    $custody.repositoryUnchanged = $true; $custody.untrackedStateEmpty = $true; $custody.noNodeModules = $true
    $status = if ($sbomSummary.determinism -eq "PASS" -and $auditSummary.exitClass -eq "COMPLETE_NO_THRESHOLD_FINDING") { "PASS" } else { "NOT VERIFIED" }
  }
  catch {
    $failure = $_
    if ($_.Exception.Message -match "(?i)recovery|marker|firewall|profile|collision|native Windows ARM64|administrative|cleanup") { $status = "BLOCKED" } else { $status = "FAIL" }
    if ($_.Exception.Message -match "(?i)cleanup cannot be verified|cannot be cleaned safely") { $unsafeCleanup = $true }
    # If task-layout setup did not complete, its transactional cleanup has
    # either succeeded or raised a cleanup failure. A trusted, still-absent
    # receipt path can therefore retain only the terminal sanitized outcome.
    if ($null -eq $layout -and $null -ne $trustedReceiptDirectory -and -not $unsafeCleanup) { $receiptRetentionSafe = $true }
  }
  finally {
    if ($null -ne $boundary -and $null -ne $layout) {
      try { Exit-RecoveryBoundary -Boundary $boundary -Recovery $layout.Recovery }
      catch { $status = "BLOCKED"; $unsafeCleanup = $true; $receiptRetentionSafe = $false; if ($null -eq $failure) { $failure = $_ } }
    }
    if ($null -ne $layout -and $null -ne $checkout -and $null -ne $git -and $source.PackageLockSha256 -ne "NOT AVAILABLE") {
      try { $source = Assert-MaterialCustody -Checkout $checkout -Commit $ReviewedCommit -Tree $ReviewedTree -Git $git -PrivateRoot $layout.Roles.git -Expected $source }
      catch { $status = "FAIL"; if ($null -eq $failure) { $failure = $_ } }
    }
    if ($null -ne $layout) {
      try {
        Clear-PrivateTaskData -Scratch $layout.Scratch
        if ($null -ne $checkout -and $null -ne $git -and $source.PackageLockSha256 -ne "NOT AVAILABLE") {
          $source = Assert-FinalMaterialCustody -Layout $layout -Checkout $checkout -Commit $ReviewedCommit -Tree $ReviewedTree -Git $git -Expected $source
          $source = Assert-PostCleanupRepositoryCustody -Layout $layout -Checkout $checkout -Commit $ReviewedCommit -Tree $ReviewedTree -Git $git -Expected $source
          $custody.repositoryUnchanged = $true; $custody.untrackedStateEmpty = $true; $custody.noNodeModules = $true
        }
        $custody.cleanupVerified = $true
        $receiptRetentionSafe = -not $unsafeCleanup
      }
      catch { $status = "BLOCKED"; $unsafeCleanup = $true; $receiptRetentionSafe = $false; if ($null -eq $failure) { $failure = $_ } }
    }
    $finishedAtUtc = [DateTime]::UtcNow.ToString("o")
    $receiptDirectoryForWrite = if ($null -ne $layout) { $layout.Receipt } else { $trustedReceiptDirectory }
    if ($null -ne $receiptDirectoryForWrite -and $receiptRetentionSafe -and $ledger.Count -eq $EvidencePhaseOrder.Count) {
      if ($null -eq $host) { $host = [ordered]@{ OsFamily = "NOT AVAILABLE"; HostArchitecture = "NOT AVAILABLE"; ProcessArchitecture = "NOT AVAILABLE"; NativeArm64 = $false } }
      $bodyWasConstructed = $false
      try {
        $custody.sanitizedReceiptOnly = ($custody.cleanupVerified -eq $true)
        $body = New-SanitizedReceiptBody -Status $status -StartedAtUtc $startedAtUtc -FinishedAtUtc $finishedAtUtc -Host $host -Runtime $runtime -Source $source -Configuration $configuration -Ledger $ledger -Firewall $firewall -Custody $custody -IngressIdentity $ingressIdentity -Audit $auditSummary -Sbom $sbomSummary
        $bodyWasConstructed = $true
        [void](Write-SanitizedReceipt -Directory $receiptDirectoryForWrite -Body $body)
      }
      catch {
        $receiptFailure = $_
        if ($receiptFailure.Exception.Message -match "(?i)sanitized receipt publication (cleanup|boundary)") {
          $status = "BLOCKED"
          $unsafeCleanup = $true
          $receiptRetentionSafe = $false
        }
        elseif ($status -eq "PASS" -and -not (Test-Path -LiteralPath $receiptDirectoryForWrite)) {
          # A forged or internally inconsistent PASS body must become a
          # terminal FAIL receipt, never a retained successful result. A
          # failed transactional publication has already removed its output.
          $status = "FAIL"
          try {
            $body = New-SanitizedReceiptBody -Status $status -StartedAtUtc $startedAtUtc -FinishedAtUtc $finishedAtUtc -Host $host -Runtime $runtime -Source $source -Configuration $configuration -Ledger $ledger -Firewall $firewall -Custody $custody -IngressIdentity $ingressIdentity -Audit $auditSummary -Sbom $sbomSummary
            [void](Write-SanitizedReceipt -Directory $receiptDirectoryForWrite -Body $body)
          }
          catch { if ($null -eq $failure) { $failure = $_ } }
        }
        else { $status = "FAIL" }
        if ($null -eq $failure) { $failure = $receiptFailure }
      }
    }
  }
  if ($null -ne $failure) { throw $failure }
}

Invoke-WindowsArm64Evidence
