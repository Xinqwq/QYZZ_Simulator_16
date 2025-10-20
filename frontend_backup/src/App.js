import React, { useState, useEffect } from 'react';
import { ThemeProvider } from './contexts/ThemeContext';
import { ConfigProvider } from './contexts/ConfigContext';
import { ResultProvider } from './contexts/ResultContext';
import Header from './components/Header';
import ConfigPanel from './components/ConfigPanel';
import LevelTargetManager from './components/LevelTargetManager';
import ResultWindow from './components/ResultWindow';
import PredictPanel from './components/PredictPanel';
import CalculateButton from './components/CalculateButton';
import './App.css';

function App() {
  const [currentTheme, setCurrentTheme] = useState('default');
  const [showResult, setShowResult] = useState(false);
  const [floatingResult, setFloatingResult] = useState(false);

  // 应用主题类名到body
  useEffect(() => {
    document.body.className = `theme-${currentTheme}`;
  }, [currentTheme]);

  return (
    <ThemeProvider value={{ currentTheme, setCurrentTheme }}>
      <ConfigProvider>
        <ResultProvider>
          <div className="app">
            <Header 
              onToggleResult={() => setShowResult(!showResult)}
              onToggleFloating={() => setFloatingResult(!floatingResult)}
              showResult={showResult}
              floatingResult={floatingResult}
            />
            
            <div className="main-content">
            <div className="config-section">
              <ConfigPanel />
              <CalculateButton />
              <LevelTargetManager />
            </div>
              
              <div className="result-section">
                {showResult && <ResultWindow />}
                <PredictPanel />
              </div>
            </div>

            {floatingResult && (
              <div className="floating-result">
                <ResultWindow isFloating={true} />
              </div>
            )}
          </div>
        </ResultProvider>
      </ConfigProvider>
    </ThemeProvider>
  );
}

export default App;
