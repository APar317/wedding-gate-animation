@echo off
setlocal
echo ========================================================
echo  Wedding Gate Animation - Pushing to GitHub
echo  Account: APar317
echo  Repository: https://github.com/APar317/wedding-gate-animation
echo ========================================================
echo.
cd /d "%~dp0"
"%~dp0..\mingit\cmd\git.exe" push origin main

if %errorlevel% equ 0 (
    echo.
    echo ========================================================
    echo  SUCCESS! Pushed latest changes to:
    echo  https://github.com/APar317/wedding-gate-animation
    echo ========================================================
) else (
    echo.
    echo An error occurred while pushing.
)
echo.
pause
