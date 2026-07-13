@echo off
REM ============================================================
REM  Build StudyWithSoobin.exe - a single-file, no-console app
REM  (PyInstaller). Run from the repo root: build-exe.bat
REM  Output: StudyWithSoobin.exe (repo root, so it's front and
REM  center on GitHub). dist\ is the Vite frontend build that
REM  gets bundled INTO the exe - not the exe output dir.
REM ============================================================
setlocal
cd /d "%~dp0"
title Building StudyWithSoobin.exe

set "PY=python"
where py >nul 2>&1 && set "PY=py"

echo Building the frontend...
if not exist "node_modules" call npm install || goto :error
call npm run build || goto :error

echo Installing build dependencies (pywebview, pyinstaller)...
%PY% -m pip install -r requirements-desktop.txt pyinstaller || goto :error

echo Building StudyWithSoobin.exe (this can take a minute)...
%PY% -m PyInstaller --onefile --windowed --name StudyWithSoobin ^
  --distpath . ^
  --workpath build ^
  --add-data "dist;dist" ^
  desktop.py || goto :error

echo.
echo Done! StudyWithSoobin.exe (repo root) is ready to share/run standalone.
pause
goto :eof

:error
echo.
echo Something went wrong during the build.
pause
endlocal
