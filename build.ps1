# build.ps1 — Скрипт автоматизации сборки и верификации
param(
    [string]$Version = "1.6.0"
)

$ErrorActionPreference = "Stop"

Write-Host "==> [1/3] Проверка синтаксиса JavaScript..." -ForegroundColor Cyan
node --check uupdump-dynamic-filter.user.js
if ($LASTEXITCODE -ne 0) {
    Write-Error "Ошибка синтаксиса в юзерскрипте!"
    exit 1
}

Write-Host "==> [2/3] Запуск автоматических тестов..." -ForegroundColor Cyan
node test_filter_engine.js
if ($LASTEXITCODE -ne 0) {
    Write-Error "Тесты не пройдены!"
    exit 1
}

Write-Host "==> [3/3] Создание архива релиза исходников..." -ForegroundColor Cyan
$archiveDir = Join-Path $PSScriptRoot "archives"
if (-not (Test-Path $archiveDir)) {
    New-Item -ItemType Directory -Path $archiveDir | Out-Null
}

$zipName = "uupdump-dynamic-filter_v$Version`_src.zip"
$zipPath = Join-Path $archiveDir $zipName

if (Test-Path $zipPath) {
    Remove-Item $zipPath -Force
}

$filesToArchive = @(
    "uupdump-dynamic-filter.user.js",
    "test_filter_engine.js",
    "README.md",
    "CHANGELOG.md",
    "AGENTS.md",
    "ARCHITECTURE.md",
    "build.ps1",
    ".gitignore"
)

Compress-Archive -Path $filesToArchive -DestinationPath $zipPath -Force
Write-Host "✅ Сборка успешно завершена! Создан архив: archives/$zipName" -ForegroundColor Green