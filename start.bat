@echo off
REM One-click start: installs what is needed, builds, and opens StudyVault in your browser.
setlocal
title StudyVault
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 goto :no_node
node -e "process.exit(Number(process.versions.node.split('.')[0]) >= 24 ? 0 : 1)"
if errorlevel 1 goto :old_node

if not exist node_modules\ (
  echo Installing dependencies. This happens once and takes a minute...
  call npm install --no-audit --no-fund
  if errorlevel 1 goto :failed
)

call npm run build --silent
if errorlevel 1 goto :failed
node scripts/setup-env.ts
if errorlevel 1 goto :failed
node --env-file-if-exists=.env src/server/manage.ts ensure-owner
if errorlevel 1 goto :failed

echo.
echo Opening StudyVault in your browser. Keep this window open while you use StudyVault.
if not defined OPEN_BROWSER set OPEN_BROWSER=1
node --env-file-if-exists=.env src/server/main.ts
echo.
echo StudyVault has stopped.
pause
exit /b 0

:no_node
echo Node.js is not installed. Install the LTS version from https://nodejs.org then double-click start.bat again.
start "" https://nodejs.org/
pause
exit /b 1

:old_node
echo StudyVault needs Node.js 24 or newer. Install the LTS version from https://nodejs.org then try again.
start "" https://nodejs.org/
pause
exit /b 1

:failed
echo.
echo Something went wrong. Read the messages above.
pause
exit /b 1
