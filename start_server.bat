@echo off
echo ============================================================
echo   ANGOR AGRO STAR PORTAL — Node.js Server Ishga Tushirish
echo ============================================================
echo.

cd /d "%~dp0server"

set PATH=%PATH%;C:\Program Files\nodejs

where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [XATO] Node.js topilmadi!
    echo Iltimos Node.js o'rnatilganligini tekshiring.
    pause
    exit /b 1
)

echo [OK] Node.js server 3000-portda ishga tushirilmoqda...
echo.
echo Dashboard sahifasi: http://localhost:3000
echo.

start http://localhost:3000
node index.js
pause
