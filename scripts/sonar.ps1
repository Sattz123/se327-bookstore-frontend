$ErrorActionPreference = 'Stop'
$previousToken = $env:SONAR_TOKEN
$previousHost = $env:SONAR_HOST_URL
Push-Location (Split-Path $PSScriptRoot -Parent)

try {
    if (Test-Path -LiteralPath '.env.sonar') {
        foreach ($line in Get-Content -LiteralPath '.env.sonar') {
            if ($line -match '^(SONAR_HOST_URL|SONAR_TOKEN)=(.+)$') {
                Set-Item -LiteralPath "Env:$($Matches[1])" -Value $Matches[2].Trim()
            }
        }
    }

    if ([string]::IsNullOrWhiteSpace($env:SONAR_TOKEN) -or
        [string]::IsNullOrWhiteSpace($env:SONAR_HOST_URL)) {
        throw 'Set SONAR_HOST_URL and SONAR_TOKEN in .env.sonar or your environment first.'
    }

    & npm.cmd run check
    if ($LASTEXITCODE -ne 0) {
        throw 'Frontend checks failed. Fix them before running SonarQube.'
    }

    # The scanner runs in Linux; use portable source paths in Windows-generated LCOV.
    $lcovPath = Join-Path (Get-Location) 'coverage/lcov.info'
    $lcovLines = foreach ($line in Get-Content -LiteralPath $lcovPath) {
        if ($line.StartsWith('SF:')) { $line.Replace('\', '/') } else { $line }
    }
    [System.IO.File]::WriteAllLines($lcovPath, $lcovLines, [System.Text.UTF8Encoding]::new($false))

    $scannerUrl = [System.UriBuilder]::new($env:SONAR_HOST_URL)
    if ($scannerUrl.Host -in @('localhost', '127.0.0.1', '::1')) {
        $scannerUrl.Host = 'host.docker.internal'
    }
    $env:SONAR_HOST_URL = $scannerUrl.Uri.AbsoluteUri.TrimEnd('/')
    $projectMount = "$(Get-Location):/usr/src"
    & docker run --rm --env SONAR_TOKEN --env SONAR_HOST_URL `
        --volume $projectMount `
        --volume 'se327-sonar-scanner-cache:/opt/sonar-scanner/.sonar/cache' `
        sonarsource/sonar-scanner-cli:latest
    if ($LASTEXITCODE -ne 0) {
        throw 'SonarQube analysis or quality gate failed. Review the output above.'
    }
}
finally {
    $env:SONAR_TOKEN = $previousToken
    $env:SONAR_HOST_URL = $previousHost
    Pop-Location
}
