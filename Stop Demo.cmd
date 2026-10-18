@echo off
setlocal
cd /d "%~dp0"
node scripts\demo-control.mjs stop
set "demoExitCode=%errorlevel%"
if not "%demoExitCode%"=="0" if not defined DEMO_NO_PAUSE pause
exit /b %demoExitCode%
