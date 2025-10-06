# 青云之志算分小助手

一个用于《青云之志》的本地/离线桌面应用，支持完整算分、未来关卡预测、中文大数单位显示，以及多主题外观。提供Windows终端exe可执行文件（Electron）。

---

## ✨ 功能

1. 🎨**配色方案**
   - 支持7种主题
2. 🔮**关卡配置与印章设置**
   - 9个可折叠配置区块，支持显示/隐藏
   - 区块选择器与关卡选择（1-1 到 Ex120）
   - 最终番数、小分分值、盗印/负重/月光番数配置
   - 数据表格统一样式，支持三种数值显示格式（纯数字/科学计数法/大数字）
   - 支持 e+1000 超大数字显示与计算
3. 🔢**关卡目标分管理**
   - 分页展示，每页6项
   - 单行/两栏布局切换
   - 手动输入番数，沿用/取消沿用上一关数据
   - 配置管理：历史配置下拉存储、删除、反馈提示
4. ⌚**悬浮计算结果窗**
   - 独立悬浮窗模式，可自由拖拽、显示/隐藏
   - 显示当前总得分、理论最高得分、目标分对比
   - 分解显示番数与触发次数
5. 💾**未来关卡预测功能**
   - 智能预测未来关卡能否通过（测试阶段，有问题及时反馈）
   - 支持超大数字计算与科学计数法/大数字显示
   - 实时更新预测结果，显示最后能通过关卡与第一个无法通过关卡
---

## 📦 安装与运行

### 桌面版（Electron）
1. 安装依赖（Node 20）：
```
npm i -D electron electron-builder @electron/get concurrently
```
2. 开发调试：
```
npm run dev:electron
```

---

## 🗂️ 目录结构
```
QYZZ_Simulator_16/
  backend/        # Node + Express 后端（含 /api/calc /api/predict 与静态托管）
  frontend/       # 单页前端 index.html（包含样式与脚本）
  electron/       # Electron 主进程（main.js）
  dist/           # 打包输出
  .gitignore
  package.json
  README.md
```

---

## 📥 下载
Windows exe版：青云之志算分小助手[QYZZ_Simulator_16_1.0.0.exe](https://github.com/Xinqwq/QYZZ_Simulator_16/releases/download/v1.0.0/QYZZ_Simulator_16_1.0.0.exe)
Windows zip版：青云之志算分小助手[QYZZ_Simulator_16_1.0.0.zip](https://github.com/Xinqwq/QYZZ_Simulator_16/releases/download/v1.0.0/QYZZ_Simulator_16_1.0.0.zip)

##### 可选
校验值：
```PowerShell
Get-FileHash "QYZZ_Simulator_16_1.0.0.exe" -Algorithm SHA256
```
---

## 🖼️ 截图 


---

## 🧭 使用要点
- 首次运行若遇防火墙/SmartScreen，请选择“允许访问/仍要运行”。
- 若按钮无响应，优先检查 4001 端口占用（`netstat -ano | findstr :4001` → `taskkill /PID <PID> /F`）。
- 双击多开已限制为单实例；再次启动会聚焦已打开窗口。

---

## 👩‍💻 作者
- 开发与维护: [@Xinqwq](https://github.com/Xinqwq)
- 感谢《青云之志》玩家qq群各位的反馈与建议
