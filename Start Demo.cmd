@echo off
setlocal
cd /d "%~dp0"
node scripts\demo-control.mjs status >nul 2>&1
if errorlevel 2 (
  node scripts\demo-control.mjs status
  echo If startup has stalled, run Stop Demo.cmd and then Start Demo.cmd.
  if not defined DEMO_NO_PAUSE pause
  exit /b 1
)
if not errorlevel 1 (
  echo Starting any missing demo services...
  node scripts\demo-control.mjs start-all
  if errorlevel 1 (
    echo Run Stop Demo.cmd then Start Demo.cmd if this is an older launcher.
    if not defined DEMO_NO_PAUSE pause
    exit /b 1
  )
  exit /b 0
)
echo Starting Builder, APIs, saved Application and reference demo services...
echo Leave this window open. Use Stop Demo.cmd to stop the demo services.
call npm.cmd run demo -- --with-preview --with-reference
set "demoExitCode=%errorlevel%"
if not "%demoExitCode%"=="0" if not defined DEMO_NO_PAUSE pause
exit /b %demoExitCode%
