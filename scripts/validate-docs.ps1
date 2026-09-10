[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
$repositoryRoot = Split-Path -Parent $PSScriptRoot

$requiredFiles = @(
    'AGENTS.md',
    'README.md',
    'docs/PROJECT_OVERVIEW.md',
    'docs/SCOPE.md',
    'docs/REQUIREMENTS.md',
    'docs/USER_FLOWS.md',
    'docs/UX_DESIGN.md',
    'docs/ACCEPTANCE_CRITERIA.md',
    'docs/ARCHITECTURE.md',
    'docs/DATA_MODEL.md',
    'docs/API_CONTRACTS.md',
    'docs/AI_SYSTEM_DESIGN.md',
    'docs/EVALUATION_PLAN.md',
    'docs/TESTING_STRATEGY.md',
    'docs/SECURITY.md',
    'docs/OBSERVABILITY.md',
    'docs/DEPLOYMENT.md',
    'docs/DEVELOPMENT_WORKFLOW.md',
    'docs/CODING_AGENT_RULES.md',
    'docs/DECISIONS.md',
    'docs/RISKS.md',
    'docs/ROADMAP.md',
    'docs/MUSIC_DOMAIN_MODEL.md',
    'docs/COMPOSITION_ENGINE.md',
    'docs/MIDI_MODEL.md',
    'docs/GENRE_PROFILE_MODEL.md',
    'docs/SYNTH_RECIPE_MODEL.md',
    'docs/MUSICAL_TIME_MODEL.md',
    'docs/FRAMEWORK_VALIDATION.md',
    'docs/DEPENDENCIES.md'
)

$issues = [System.Collections.Generic.List[string]]::new()

foreach ($relativePath in $requiredFiles) {
    $fullPath = Join-Path $repositoryRoot $relativePath
    if (-not (Test-Path -LiteralPath $fullPath -PathType Leaf)) {
        $issues.Add("Missing required file: $relativePath")
    }
}

$markdownFiles = Get-ChildItem -LiteralPath $repositoryRoot -Recurse -File -Filter '*.md' |
    Where-Object {
        $_.FullName -notmatch '[\\/](?:\.git|\.next|node_modules|coverage)[\\/]'
    }

foreach ($file in $markdownFiles) {
    $content = Get-Content -LiteralPath $file.FullName -Raw
    $fenceCount = ([regex]::Matches($content, '(?m)^```')).Count
    if ($fenceCount % 2 -ne 0) {
        $issues.Add("Unbalanced fenced code block: $($file.FullName)")
    }

    foreach ($match in [regex]::Matches($content, '\[[^\]]+\]\(([^)]+)\)')) {
        $target = $match.Groups[1].Value.Trim()
        if ($target -match '^(https?://|mailto:|#)') {
            continue
        }

        $targetPath = ($target -split '#')[0]
        if ([string]::IsNullOrWhiteSpace($targetPath)) {
            continue
        }

        $resolvedPath = Join-Path $file.DirectoryName $targetPath
        if (-not (Test-Path -LiteralPath $resolvedPath)) {
            $issues.Add("Broken local link in $($file.FullName): $target")
        }
    }
}

$requirementsPath = Join-Path $repositoryRoot 'docs/REQUIREMENTS.md'
$acceptancePath = Join-Path $repositoryRoot 'docs/ACCEPTANCE_CRITERIA.md'

if ((Test-Path -LiteralPath $requirementsPath) -and (Test-Path -LiteralPath $acceptancePath)) {
    $requirements = Get-Content -LiteralPath $requirementsPath -Raw
    $acceptance = Get-Content -LiteralPath $acceptancePath -Raw
    $requirementPattern = '\b(?:FR|NFR|UX|A11Y|SEC|AI|MUS|MIDI)-\d{3}\b'
    $acceptancePattern = '\bAC-\d{3}\b'

    $requirementIds = [regex]::Matches($requirements, $requirementPattern) |
        ForEach-Object Value | Sort-Object -Unique
    $acceptanceIds = [regex]::Matches($acceptance, $acceptancePattern) |
        ForEach-Object Value | Sort-Object -Unique

    foreach ($id in $requirementIds) {
        if ($acceptance -notmatch "\b$([regex]::Escape($id))\b") {
            $issues.Add("Requirement has no acceptance mapping: $id")
        }
    }

    foreach ($id in $acceptanceIds) {
        if ($requirements -notmatch "\b$([regex]::Escape($id))\b") {
            $issues.Add("Acceptance criterion has no requirement mapping: $id")
        }
    }

    $declaredRequirementIds = [regex]::Matches(
        $requirements,
        '(?m)^\| ((?:FR|NFR|UX|A11Y|SEC|AI|MUS|MIDI)-\d{3}) \|'
    ) | ForEach-Object { $_.Groups[1].Value }
    foreach ($duplicate in ($declaredRequirementIds | Group-Object | Where-Object Count -gt 1)) {
        $issues.Add("Duplicate requirement ID: $($duplicate.Name)")
    }

    $declaredAcceptanceIds = [regex]::Matches($acceptance, '(?m)^\| (AC-\d{3}) \|') |
        ForEach-Object { $_.Groups[1].Value }
    foreach ($duplicate in ($declaredAcceptanceIds | Group-Object | Where-Object Count -gt 1)) {
        $issues.Add("Duplicate acceptance ID: $($duplicate.Name)")
    }
}

if ($issues.Count -gt 0) {
    $issues | ForEach-Object { Write-Error $_ }
    exit 1
}

Write-Output "Documentation validation passed: $($requiredFiles.Count) required files, $($markdownFiles.Count) Markdown files."
