@echo off
setlocal

cd /d "%~dp0"

where npm >nul 2>nul
if errorlevel 1 (
  echo npm was not found. Please install Node.js first.
  pause
  exit /b 1
)

if not exist "node_modules" (
  echo Installing dependencies...
  call npm install
  if errorlevel 1 (
    echo.
    echo Dependency install failed.
    pause
    exit /b 1
  )
)

echo Opening browser when the local server is ready...
start "" powershell -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -Command "for ($i = 0; $i -lt 60; $i++) { try { Invoke-WebRequest -UseBasicParsing -Uri 'http://localhost:3000/' -TimeoutSec 1 | Out-Null; Start-Process 'http://localhost:3000/'; exit 0 } catch { Start-Sleep -Seconds 1 } }; Start-Process 'http://localhost:3000/'"

echo Starting local app...
echo.
call npm run dev

echo.
echo Local server stopped.
pause
