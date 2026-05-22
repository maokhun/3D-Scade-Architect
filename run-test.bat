@echo off
setlocal

cd /d "%~dp0"

echo Running tests...
call npm test

if errorlevel 1 (
  echo.
  echo Tests failed.
  pause
  exit /b 1
)

echo.
echo Tests passed.
pause
