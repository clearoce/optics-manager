@echo off
setlocal
title NexusAdmin 停止器

echo 正在停止 NexusAdmin 系统...

taskkill /f /im optics-server.exe >nul 2>&1

if %errorlevel% equ 0 (
    echo [成功] 系统已停止。
) else (
    echo [提示] 系统原本就未运行。
)

echo.
timeout /t 2
exit
