@echo off
setlocal
title NexusAdmin 打包工具

set "ROOT_DIR=%~dp0"
set "FRONTEND_DIR=%ROOT_DIR%frontend"
set "BACKEND_DIR=%ROOT_DIR%backend"
set "RELEASE_DIR=%ROOT_DIR%release"

echo ==========================================
echo    正在构建绿色免安装发行版...
echo ==========================================

:: 1. 编译前端
echo [1/4] 正在编译前端代码 (这可能需要十几秒)...
pushd "%FRONTEND_DIR%"
call npm run build
if %errorlevel% neq 0 (
    echo [错误] 前端编译失败。
    popd
    pause
    exit /b 1
)
popd

:: 2. 复制前端产物到后端目录以供内嵌
echo [2/4] 将前端资源嵌入后端...
if exist "%BACKEND_DIR%\dist" rmdir /s /q "%BACKEND_DIR%\dist"
xcopy /E /I /Y "%FRONTEND_DIR%\dist" "%BACKEND_DIR%\dist" >nul

:: 3. 编译后端
echo [3/4] 编译系统核心可执行文件...
pushd "%BACKEND_DIR%"
:: 减小体积的编译指令
set GOOS=windows
set GOARCH=amd64
go build -ldflags="-w -s" -o optics-server.exe .
if %errorlevel% neq 0 (
    echo [错误] 后端编译失败。
    popd
    pause
    exit /b 1
)
popd

:: 4. 组装 release 文件夹
echo [4/4] 整理发布文件夹...
if exist "%RELEASE_DIR%" rmdir /s /q "%RELEASE_DIR%"
mkdir "%RELEASE_DIR%"
mkdir "%RELEASE_DIR%\backend"

copy "%BACKEND_DIR%\optics-server.exe" "%RELEASE_DIR%\backend\" >nul
copy "%BACKEND_DIR%\database\test_data.sql" "%RELEASE_DIR%\backend\" >nul
copy "%ROOT_DIR%启动系统.bat" "%RELEASE_DIR%\" >nul
copy "%ROOT_DIR%停止系统.bat" "%RELEASE_DIR%\" >nul
copy "%ROOT_DIR%README.md" "%RELEASE_DIR%\" >nul

echo.
echo ==========================================
echo    打包成功！
echo    
echo    请查看项目目录下的 "release" 文件夹。
echo    您可以直接将这个 "release" 文件夹压缩
echo    发给任何人，或者拷贝到别的电脑上，
echo    双击里面的 "启动系统.bat" 即可直接运行！
echo ==========================================
pause
