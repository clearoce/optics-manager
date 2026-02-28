@echo off
setlocal
:: 统一到 UTF-8 代码页，避免在 GBK/CMD 终端下中文提示乱码
chcp 65001 >nul
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
