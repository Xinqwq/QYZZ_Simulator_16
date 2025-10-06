# 青云之志算分小助手

> 开发与维护: [@Xinqwq](https://github.com/Xinqwq)

一个用于《青云之志》的本地/离线桌面应用，支持完整算分、未来关卡预测、中文大数单位显示，以及多主题外观。提供Windows终端exe可执行文件（Electron）。

---

## ✨ 功能 Features
- ⌚ 实时算分：盗印/负重/月光番数与触发次数的传导链计算
- 🔮 未来关卡预测：展示“通过/败北”关卡，紧凑徽章式显示
- 🔢 中国大数单位：科学计数法与中文大数字双显示（支持 e+1000）
- 🎨 UI 优化：可拖拽调整区块宽度、主题适配、统一表格样式
- 💾 历史配置：本地存储/读取多份配置，命名保存与删除
- 🖥️ 桌面版：Electron 本地后端 + 前端同源加载，离线可用

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

产物在 `dist/青云之志算分小助手 x.y.z.exe`。

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

## 📥 下载 Download
- Windows exe版：/青云之志算分小助手 1.0.0.exe

---

## 🖼️ 截图 Screenshots


---

## 🧭 使用要点
- 首次运行若遇防火墙/SmartScreen，请选择“允许访问/仍要运行”。
- 若按钮无响应，优先检查 4001 端口占用（`netstat -ano | findstr :4001` → `taskkill /PID <PID> /F`）。
- 双击多开已限制为单实例；再次启动会聚焦已打开窗口。

---

## 👩‍💻 作者 Author
- 开发与维护: [@Xinqwq](https://github.com/Xinqwq)

