@echo off
title He thong Gui Bao Luong - CDC Da Nang
echo Dang kiem tra moi truong...

node -v >nul 2>&1
if %errorlevel% neq 0 (
    echo [LOI] May tinh nay chua cai dat Node.js!
    echo Vui long tai va cai dat tai: https://nodejs.org/ (Chon ban LTS)
    pause
    exit
)

if not exist "node_modules\" (
    echo Dang tai thu vien (chi chay lan dau, vui long doi)...
    npm install
)

echo Dang khoi dong ung dung...
echo Sau khi hien dong "Ready in ...", hay mo trinh duyet va truy cap: http://localhost:3000
npm run dev
pause
