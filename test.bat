@echo off
REM One-click tests: type-checks all TypeScript and runs the automated tests on a temporary localhost server.
setlocal
title StudyVault tests
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js is not installed. Install the LTS version from https://nodejs.org
  pause
  exit /b 1
)
if not exist node_modules\ (
  call npm install --no-audit --no-fund
  if errorlevel 1 goto :done
)

echo === Type check ===
call npm run typecheck --silent
if errorlevel 1 goto :done
echo No type errors.
echo.
echo === Tests ===
call npm test --silent

:done
if errorlevel 1 (echo. & echo SOME CHECKS FAILED - see above.) else (echo. & echo ALL CHECKS PASSED.)
pause
