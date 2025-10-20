@echo off
echo ========================================
echo 青云之志算分小助手 - Azure部署脚本
echo ========================================

echo.
echo 正在准备部署文件...

REM 检查Azure CLI是否安装
where az >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [错误] 未找到Azure CLI，请先安装Azure CLI
    echo 下载地址: https://aka.ms/installazurecliwindows
    pause
    exit /b 1
)

echo.
echo 请先登录Azure账户...
az login

echo.
echo 请选择部署方式:
echo 1. 创建新的Azure App Service
echo 2. 部署到现有的Azure App Service
set /p choice="请输入选择 (1 或 2): "

if "%choice%"=="1" (
    call :create_new_app
) else if "%choice%"=="2" (
    call :deploy_existing_app
) else (
    echo 无效选择，请重新运行脚本
    pause
    exit /b 1
)

echo.
echo 部署完成！
echo 你的应用地址: https://qyzz-simulator-167.azurewebsites.net
echo 自定义域名: https://luloria.me
echo.
pause

:create_new_app
echo.
echo 正在创建新的Azure App Service...

REM 创建资源组
echo 创建资源组...
az group create --name qyzz-simulator-rg --location eastus

REM 创建App Service计划
echo 创建App Service计划...
az appservice plan create --name qyzz-simulator-plan --resource-group qyzz-simulator-rg --sku F1 --is-linux

REM 创建Web应用
echo 创建Web应用...
az webapp create --resource-group qyzz-simulator-rg --plan qyzz-simulator-plan --name qyzz-simulator-167 --runtime "NODE|18-lts"

REM 配置应用设置
echo 配置应用设置...
az webapp config appsettings set --resource-group qyzz-simulator-rg --name qyzz-simulator-167 --settings NODE_ENV=production

REM 部署代码
echo 部署代码...
powershell Compress-Archive -Path ".\*" -DestinationPath "qyzz-simulator.zip" -Force
az webapp deployment source config-zip --resource-group qyzz-simulator-rg --name qyzz-simulator-167 --src qyzz-simulator.zip

REM 清理临时文件
del qyzz-simulator.zip

goto :eof

:deploy_existing_app
echo.
echo 正在部署到现有的Azure App Service...

REM 部署代码
echo 部署代码...
powershell Compress-Archive -Path ".\*" -DestinationPath "qyzz-simulator.zip" -Force
az webapp deployment source config-zip --resource-group qyzz-simulator-rg --name qyzz-simulator-167 --src qyzz-simulator.zip

REM 清理临时文件
del qyzz-simulator.zip

goto :eof
