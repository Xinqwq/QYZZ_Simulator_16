import React, { useState, useEffect } from 'react';
import './App.css';
import { api } from './utils/api';

function App() {
  const [backendStatus, setBackendStatus] = useState<string>('检查中...');
  const [isConnected, setIsConnected] = useState<boolean>(false);

  useEffect(() => {
    // 测试后端连接
    api.health()
      .then((result) => {
        setBackendStatus('后端连接正常 ✅');
        setIsConnected(true);
      })
      .catch((error) => {
        setBackendStatus('后端连接失败 ❌');
        setIsConnected(false);
      });
  }, []);

  return (
    <div className="App">
      <header className="App-header">
        <h1>🚀 青云之志算分小助手</h1>
        <h2>React + Vite 前端测试页面</h2>
        
        <div style={{ margin: '20px 0' }}>
          <p>前端状态: <strong>运行正常 ✅</strong></p>
          <p>后端状态: <strong>{backendStatus}</strong></p>
          <p>连接状态: <strong>{isConnected ? '已连接' : '未连接'}</strong></p>
        </div>

        <div style={{ margin: '20px 0' }}>
          <h3>访问地址:</h3>
          <p>React前端: <a href="http://localhost:8080" target="_blank">http://localhost:8080</a></p>
          <p>后端API: <a href="http://localhost:6001" target="_blank">http://localhost:6001</a></p>
        </div>

        <div style={{ margin: '20px 0', padding: '20px', backgroundColor: '#f0f0f0', borderRadius: '10px' }}>
          <h3>🎉 React + Vite重构成功!</h3>
          <p>✅ TypeScript支持</p>
          <p>✅ Vite开发服务器</p>
          <p>✅ API代理配置</p>
          <p>✅ 热重载开发</p>
          <p>✅ 现代化构建工具</p>
        </div>
      </header>
    </div>
  );
}

export default App;
