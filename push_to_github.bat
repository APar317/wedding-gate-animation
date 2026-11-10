@echo off
setlocal
echo ========================================================
echo  Pushing Wedding Gate Animation to GitHub
echo  Account: APar317 (aparsaran2006@gmail.com)
echo ========================================================
echo.
set /p REPO_NAME="Enter your GitHub repository name (e.g., wedding-gate-animation): "
if "%REPO_NAME%"=="" set REPO_NAME=wedding-gate-animation

echo.
echo Adding remote https://github.com/APar317/%REPO_NAME%.git ...
"%~dp0..\mingit\cmd\git.exe" remote remove origin 2>nul
"%~dp0..\mingit\cmd\git.exe" remote add origin https://github.com/APar317/%REPO_NAME%.git
"%~dp0..\mingit\cmd\git.exe" branch -M main

echo.
echo Pushing branch 'main' to GitHub...
"%~dp0..\mingit\cmd\git.exe" push -u origin main

if %errorlevel% equ 0 (
    echo.
    echo ========================================================
    echo  SUCCESS! Code pushed to:
    echo  https://github.com/APar317/%REPO_NAME%
    echo ========================================================
) else (
    echo.
    echo Note: If prompted for password, use a GitHub Personal Access Token (PAT).
)
echo.
pause
