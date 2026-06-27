@echo off
chcp 65001 >nul
title MH71 - May chu noi bo
cd /d "%~dp0"

echo.
echo  ============================================
echo    MH71 - Quan ly nha tro
echo  ============================================
echo.

if not exist "node_modules" echo  [*] Lan dau chay - dang cai dat thu vien (cho vai phut)...
if not exist "node_modules" call npm install

if not exist ".env.local" echo  [!] CHUA CO file .env.local - hay tao theo README truoc khi chay.

echo  [*] Dang khoi dong may chu MH71...
echo  [*] Trinh duyet se tu mo http://localhost:3000 sau vai giay.
echo  [*] GIU CUA SO NAY MO khi dang dung. Dong cua so = tat may chu.
echo.

start "" /min cmd /c "timeout /t 6 >nul && start http://localhost:3000"
call npm run dev

echo.
echo  [!] May chu da dung. Nhan phim bat ky de dong cua so.
pause >nul
