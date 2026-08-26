@echo off
echo ================================================
echo   ANGOR AGRO STAR PORTAL - O'rnatish
echo ================================================
echo.

:: PHP mavjudligini tekshirish
php -v >nul 2>&1
if %errorlevel% neq 0 (
    echo [XATO] PHP topilmadi!
    echo Iltimos Laragon yoki XAMPP o'rnating:
    echo   Laragon: https://laragon.org
    echo.
    pause
    exit /b 1
)

echo [OK] PHP topildi
php -v

:: Composer mavjudligini tekshirish
composer -V >nul 2>&1
if %errorlevel% neq 0 (
    echo [XATO] Composer topilmadi!
    echo Iltimos o'rnating: https://getcomposer.org
    pause
    exit /b 1
)

echo [OK] Composer topildi
echo.

:: Laravel o'rnatish
echo Laravel o'rnatilmoqda...
composer create-project laravel/laravel laravel-app --prefer-dist

if %errorlevel% neq 0 (
    echo [XATO] Laravel o'rnatishda xatolik!
    pause
    exit /b 1
)

echo.
echo [OK] Laravel o'rnatildi!
echo.
echo Keyingi qadam: .env faylni sozlang
echo   DB_CONNECTION=pgsql
echo   DB_HOST=127.0.0.1
echo   DB_PORT=5432
echo   DB_DATABASE=angor_portal
echo   DB_USERNAME=postgres
echo   DB_PASSWORD=your_password
echo.
pause
