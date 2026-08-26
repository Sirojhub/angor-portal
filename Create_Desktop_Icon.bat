@echo off
chcp 65001 >nul
echo ============================================================
echo   ANGOR AGRO STAR PORTAL — Rabochiy Stol Ikonkasini O'rnatish
echo ============================================================
echo.

cd /d "%~dp0"

echo [1/2] Professional ikonka (.ico) yaratilmoqda...
powershell -ExecutionPolicy Bypass -File "%~dp0scripts\generate_icon.ps1"

echo.
echo [2/2] Rabochiy stolga "Angor Agro Star Portal" ikonkasi joylanmoqda...
powershell -ExecutionPolicy Bypass -File "%~dp0scripts\create_desktop_shortcut.ps1"

echo.
echo ============================================================
echo   [OK] MUVAFFAQIYATLI O'RNATILDI!
echo   Rabochiy stolda "Angor Agro Star Portal" ikonkasi paydo bo'ldi.
echo ============================================================
echo.
pause
