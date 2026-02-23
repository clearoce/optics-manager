@echo off
setlocal
title NexusAdmin 启动器

echo ==========================================
echo    NexusAdmin 现代眼镜店管理系统
echo ==========================================
echo.

:: 检查是否已经运行，如果运行则先关闭旧进程
taskkill /f /im optics-server.exe >nul 2>&1

echo [1/2] 正在后台启动服务器...
cd backend
:: 检查服务器文件是否存在
if not exist optics-server.exe (
    echo [错误] 未找到服务器核心文件 optics-server.exe，请确保文件完整。
    pause
    exit /b
)
:: 使用 PowerShell 隐藏窗口并在后台运行服务器
powershell -WindowStyle Hidden -Command "Start-Process .\optics-server.exe -WindowStyle Hidden"
cd ..

:: 等待服务器启动
timeout /t 2 /nobreak >nul
echo [2/2] 正在启动管理界面...
start http://localhost:8080

echo.
echo ==========================================
echo    启动成功！系统已在后台运行。
echo.
echo    提示：如果想关闭系统，请运行「停止系统.bat」。
echo ==========================================
echo.
timeout /t 3
exit
