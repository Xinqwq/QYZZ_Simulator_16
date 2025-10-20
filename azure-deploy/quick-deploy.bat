@echo off
echo ========================================
echo 青云之志算分小助手 - 快速部署脚本
echo ========================================

echo.
echo 正在压缩项目文件...
powershell Compress-Archive -Path ".\*" -DestinationPath "qyzz-simulator.zip" -Force

echo.
echo 正在部署到Azure...
az webapp deployment source config-zip --resource-group qyzz-simulator-rg --name qyzz-simulator-167 --src qyzz-simulator.zip

echo.
echo 清理临时文件...
del qyzz-simulator.zip

echo.
echo ✅ 部署完成！
echo 🌐 Azure地址: https://qyzz-simulator-167.azurewebsites.net
echo 🌐 自定义域名: https://luloria.me
echo.
pause
