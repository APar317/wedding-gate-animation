@echo off
echo ========================================================
echo  Starting Wedding Gate Animation Local Server
echo ========================================================
echo.
echo Opening in your browser at http://localhost:3000 ...
start http://localhost:3000
python -m http.server 3000
pause
