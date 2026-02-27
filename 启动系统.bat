@echo off
setlocal
title NexusAdmin 启动器

set "ROOT_DIR=%~dp0"
set "BACKEND_DIR=%ROOT_DIR%backend"

echo ==========================================
echo    NexusAdmin 现代眼镜店管理系统
echo ==========================================
echo.

:: 检查是否已经运行，如运行则先关闭旧进程
taskkill /f /im optics-server.exe >nul 2>&1

:: 若不存在可执行文件，尝试自动构建（适配源码目录直接双击启动）
if not exist "%BACKEND_DIR%\optics-server.exe" (
    echo [提示] 未检测到 optics-server.exe，正在尝试自动构建...

    if exist "%ROOT_DIR%frontend\package.json" (
        echo [准备] 构建前端资源...
        pushd "%ROOT_DIR%frontend"
        call npm run build
        if %errorlevel% neq 0 (
            echo [错误] 前端构建失败，请检查 Node.js/npm 环境。
            popd
            pause
            exit /b 1
        )
        popd

        if exist "%BACKEND_DIR%\dist" rmdir /s /q "%BACKEND_DIR%\dist"
        xcopy /E /I /Y "%ROOT_DIR%frontend\dist" "%BACKEND_DIR%\dist" >nul
    )

    echo [准备] 构建后端可执行文件...
    pushd "%BACKEND_DIR%"
    go build -o optics-server.exe .
    if %errorlevel% neq 0 (
        echo [错误] 后端构建失败，请检查 Go 环境。
        popd
        pause
        exit /b 1
    )
    popd
)

echo [1/2] 正在后台启动服务器...
:: 检查服务器文件是否存在
if not exist "%BACKEND_DIR%\optics-server.exe" (
    echo [错误] 未找到服务器核心文件 optics-server.exe，请确保文件完整。
    pause
    exit /b 1
)

:: 使用 PowerShell 隐藏窗口并在后台运行服务器
powershell -NoProfile -WindowStyle Hidden -Command "Start-Process -FilePath '%BACKEND_DIR%\optics-server.exe' -WorkingDirectory '%BACKEND_DIR%' -WindowStyle Hidden"

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
