# 青云之志算分小助手 - Azure部署指南

## 🚀 完整部署步骤

### 第一步：准备环境

1. **安装Azure CLI**
   ```bash
   # Windows
   winget install Microsoft.AzureCLI
   
   # 或下载安装包
   # https://aka.ms/installazurecliwindows
   ```

2. **验证安装**
   ```bash
   az --version
   ```

### 第二步：登录Azure

```bash
az login
```

### 第三步：创建Azure资源

#### 3.1 创建资源组
```bash
az group create --name qyzz-simulator-rg --location eastus
```

#### 3.2 创建App Service计划
```bash
az appservice plan create --name qyzz-simulator-plan --resource-group qyzz-simulator-rg --sku F1 --is-linux
```

#### 3.3 创建Web应用
```bash
az webapp create --resource-group qyzz-simulator-rg --plan qyzz-simulator-plan --name qyzz-simulator-167 --runtime "NODE|18-lts"
```

### 第四步：配置应用设置

```bash
az webapp config appsettings set --resource-group qyzz-simulator-rg --name qyzz-simulator-167 --settings NODE_ENV=production
```

### 第五步：部署代码

#### 5.1 压缩项目文件
```bash
# Windows PowerShell
Compress-Archive -Path ".\*" -DestinationPath "qyzz-simulator.zip" -Force

# 或使用批处理脚本
deploy.bat
```

#### 5.2 部署到Azure
```bash
az webapp deployment source config-zip --resource-group qyzz-simulator-rg --name qyzz-simulator-167 --src qyzz-simulator.zip
```

### 第六步：配置自定义域名

#### 6.1 添加自定义域名
```bash
az webapp config hostname add --webapp-name qyzz-simulator-167 --resource-group qyzz-simulator-rg --hostname luloria.me
```

#### 6.2 配置SSL证书
1. 登录Azure门户
2. 进入你的Web应用
3. 选择"SSL/TLS设置"
4. 上传你的SSL证书文件
5. 绑定证书到域名

### 第七步：验证部署

1. **访问Azure域名**：`https://qyzz-simulator-167.azurewebsites.net`
2. **访问自定义域名**：`https://luloria.me`

## 🔧 配置文件说明

### package.json
- 定义了项目依赖和启动脚本
- 指定Node.js版本要求

### web.config
- Azure IIS配置，用于路由和静态文件服务
- 配置Node.js应用启动

### backend/index.js
- 修改了CORS配置，支持生产环境
- 配置了静态文件服务路径
- 支持Azure环境变量PORT

## 🌐 域名配置

### DNS设置
在你的域名注册商处配置DNS记录：

```
类型: CNAME
名称: www
值: qyzz-simulator-167.azurewebsites.net

类型: A
名称: @
值: [Azure提供的IP地址]
```

### SSL证书
1. 在Azure门户中上传你的SSL证书
2. 绑定到域名 `luloria.me`
3. 启用HTTPS重定向

## 📊 监控和维护

### 查看日志
```bash
az webapp log tail --resource-group qyzz-simulator-rg --name qyzz-simulator-167
```

### 重启应用
```bash
az webapp restart --resource-group qyzz-simulator-rg --name qyzz-simulator-167
```

### 更新代码
1. 修改代码后重新压缩
2. 运行部署命令

## 💰 成本估算

### Azure App Service 免费层
- ✅ 完全免费
- ✅ 1GB内存
- ✅ 1GB存储
- ✅ 每月165分钟CPU时间

### 自定义域名
- 域名注册：$10-15/年
- SSL证书：已购买
- Azure绑定：免费

## 🚨 故障排除

### 常见问题

1. **部署失败**
   - 检查Node.js版本兼容性
   - 确认所有依赖都已安装

2. **CORS错误**
   - 检查域名是否正确配置
   - 确认CORS设置包含你的域名

3. **静态文件404**
   - 检查web.config配置
   - 确认静态文件路径正确

4. **SSL证书问题**
   - 确认证书格式正确
   - 检查证书是否过期

### 调试命令

```bash
# 查看应用状态
az webapp show --resource-group qyzz-simulator-rg --name qyzz-simulator-167

# 查看应用设置
az webapp config appsettings list --resource-group qyzz-simulator-rg --name qyzz-simulator-167

# 查看部署历史
az webapp deployment list --resource-group qyzz-simulator-rg --name qyzz-simulator-167
```

## 🎯 部署完成后的访问地址

- **Azure域名**：`https://qyzz-simulator-167.azurewebsites.net`
- **自定义域名**：`https://luloria.me`

恭喜！你的青云之志算分小助手现在已经成功部署到Azure上了！🎉
