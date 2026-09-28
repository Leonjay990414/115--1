@echo off
chcp 65001 >nul
title 智光商工 62週年校慶 - 後台整合伺服器 (ZG Shop)
echo ========================================================================
echo   智光商工 115學年度 第62屆校慶園遊會 - 後台整合伺服器
echo ========================================================================
echo   [1] 本機後台管理主頁: http://localhost:8080/index.html
echo   [2] 顧客前台商城網站: http://localhost:8080/front/index.html
echo   [3] 跨裝置同步 API:   http://localhost:8080/api/sync
echo   [4] 即時資料庫 API:   http://localhost:8080/api/db
echo ========================================================================
echo 正在啟動後台伺服器 (server.py)...
echo.
python server.py
pause
