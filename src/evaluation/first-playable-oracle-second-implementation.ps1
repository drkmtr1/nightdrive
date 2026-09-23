param(
  [Parameter(Mandatory = $true)][string]$InputPath,
  [Parameter(Mandatory = $true)][string]$OutputPath,
  [Parameter(Mandatory = $true)][string]$CandidateOraclePath
)

$ErrorActionPreference = 'Stop'
$expectedIds = @('FP-01', 'FP-02', 'FP-03', 'FP-04', 'FP-05', 'FP-06', 'FP-07', 'FP-08', 'FP-09', 'FP-10', 'FP-11', 'FP-12')
$encoding = [System.Text.UTF8Encoding]::new($false)
$oracle = Get-Content -Raw -LiteralPath $InputPath | ConvertFrom-Json -AsHashtable
if ($oracle.status -cne 'CANDIDATE') { throw 'Oracle is not a CANDIDATE artifact.' }
if (@($oracle.vectors).Count -ne 12) { throw 'Oracle must contain exactly twelve vectors.' }
if ((@($oracle.vectors | ForEach-Object { [string]$_.vectorId }) -join ',') -cne ($expectedIds -join ',')) {
  throw 'Oracle vector IDs or order do not match FP-01..FP-12.'
}

$recomputed = [System.Collections.Generic.List[object]]::new()
for ($index = 0; $index -lt $oracle.vectors.Count; $index += 1) {
  $row = $oracle.vectors[$index]
  $inputs = [ordered]@{
    harmony = [string]$row.componentJson.harmony
    bass = [string]$row.componentJson.bass
    arpeggiator = [string]$row.componentJson.arpeggiator
    resultHashInput = [string]$row.resultHashInputJson
    canonical = [string]$row.canonicalJson
  }
  $lengths = [ordered]@{}
  $hashes = [ordered]@{}
  foreach ($name in $inputs.Keys) {
    $bytes = $encoding.GetBytes($inputs[$name])
    $lengths[$name] = $bytes.Length
    $hashes[$name] = [Convert]::ToHexString([System.Security.Cryptography.SHA256]::HashData($bytes)).ToLowerInvariant()
  }
  foreach ($name in @('harmony', 'bass', 'arpeggiator')) {
    if ($lengths[$name] -ne $row.utf8ByteLengths[$name]) { throw "$($row.vectorId) $name UTF-8 length mismatch." }
    if ($hashes[$name] -cne $row.componentHashes[$name]) { throw "$($row.vectorId) $name component digest mismatch." }
  }
  if ($lengths.resultHashInput -ne $row.utf8ByteLengths.resultHashInput) { throw "$($row.vectorId) resultHashInput length mismatch." }
  if ($hashes.resultHashInput -cne $row.resultHash) { throw "$($row.vectorId) resultHash mismatch." }
  if ($lengths.canonical -ne $row.utf8ByteLengths.canonical) { throw "$($row.vectorId) canonical length mismatch." }
  if ($hashes.canonical -cne $row.canonicalUtf8Sha256) { throw "$($row.vectorId) canonical UTF-8 digest mismatch." }
  $recomputed.Add([ordered]@{
    vectorId = [string]$row.vectorId
    utf8ByteLengths = $lengths
    componentHashes = [ordered]@{
      harmony = $hashes.harmony
      bass = $hashes.bass
      arpeggiator = $hashes.arpeggiator
    }
    resultHash = $hashes.resultHashInput
    canonicalUtf8Sha256 = $hashes.canonical
  })
}

$report = [ordered]@{
  schema = 'nightdrive.first-playable-oracle-second-implementation.v1'
  status = 'CANDIDATE EVIDENCE'
  candidateOraclePath = $CandidateOraclePath.Replace('\', '/')
  implementation = [ordered]@{
    api = 'System.Security.Cryptography.SHA256.HashData'
    encoding = 'System.Text.UTF8Encoding(false)'
    powershellCore = $PSVersionTable.PSVersion.ToString()
    dotNet = [System.Environment]::Version.ToString()
    scriptPath = 'src/evaluation/first-playable-oracle-second-implementation.ps1'
  }
  command = "pwsh -NoProfile -File src/evaluation/first-playable-oracle-second-implementation.ps1 -InputPath docs/reviews/FIRST_PLAYABLE_CANONICAL_ORACLE.json -OutputPath docs/reviews/FIRST_PLAYABLE_ORACLE_RECOMPUTATION.json -CandidateOraclePath docs/reviews/FIRST_PLAYABLE_CANONICAL_ORACLE.json"
  vectors = $recomputed.ToArray()
}
$json = ConvertTo-Json -InputObject $report -Depth 12
$json = $json.Replace("`r`n", "`n").Replace("`r", "`n") + "`n"
[System.IO.File]::WriteAllText($OutputPath, $json, $encoding)
Write-Output "PASS: independently recomputed five input lengths and five SHA-256 values for 12 vectors using PowerShell/.NET."
