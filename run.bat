@echo off
setlocal

set "APP_DIR=%~dp0"

start "" powershell -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -Command ^
  "$ErrorActionPreference = 'SilentlyContinue';" ^
  "$appDir = '%APP_DIR%';" ^
  "$url = 'http://localhost:3000/';" ^
  "Set-Location -LiteralPath $appDir;" ^
  "function Open-App { Start-Process $url; exit 0 }" ^
  "try { Invoke-WebRequest -UseBasicParsing -Uri $url -TimeoutSec 1 | Out-Null; Open-App } catch {}" ^
  "if (-not (Get-Command npm -ErrorAction SilentlyContinue)) { Add-Content -LiteralPath 'run.log' -Value 'npm was not found. Install Node.js first.'; exit 1 }" ^
  "if (-not (Test-Path -LiteralPath 'node_modules')) { npm install *> 'run.log'; if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE } }" ^
  "$server = Start-Process -FilePath 'npm.cmd' -ArgumentList 'run','dev' -WorkingDirectory $appDir -WindowStyle Hidden -RedirectStandardOutput 'server-start.log' -RedirectStandardError 'server-start.err.log' -PassThru;" ^
  "for ($i = 0; $i -lt 60; $i++) { try { Invoke-WebRequest -UseBasicParsing -Uri $url -TimeoutSec 1 | Out-Null; Open-App } catch { Start-Sleep -Seconds 1 } }" ^
  "Start-Process $url"

exit /b 0
