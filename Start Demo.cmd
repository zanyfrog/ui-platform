@echo off
setlocal
cd /d "%~dp0"
node scripts\demo-control.mjs status >nul 2>&1
if not errorlevel 1 (
  echo Builder Demo is already running.
  node scripts\demo-control.mjs status
  exit /b 0
)
echo Starting Builder, API and the demo Application services...
echo Leave this window open. Use Stop Demo.cmd to stop the demo services.
call npm.cmd run demo -- --with-preview
set "demoExitCode=%errorlevel%"
if not "%demoExitCode%"=="0" if not defined DEMO_NO_PAUSE pause
exit /b %demoExitCode%
