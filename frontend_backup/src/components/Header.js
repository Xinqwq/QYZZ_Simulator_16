import React from 'react';
import { useTheme } from '../contexts/ThemeContext';
import './Header.css';

const themes = [
  { id: 'default', name: '默认', colors: ['#9AA3A0', '#C4B7A6', '#B7D0C5', '#E3C9A8', '#D9B8B6'] },
  { id: '16QwQ', name: '16QwQ', colors: ['#73CCFF', '#ACF06D', '#E8A469', '#F0DF6D', '#AC9076'] },
  { id: 'buxingshx', name: '步行', colors: ['#00E874', '#00B0F0', '#B6FF47', '#EEFF00', '#FF6B6B'] },
  { id: 'life', name: '生活', colors: ['#A5EAFF', '#9EC4F6', '#BEFFF8', '#E1DCFC', '#D2C0F9'] },
  { id: 'purple', name: '紫色', colors: ['#65BFBE', '#DEEDA1', '#BDE031', '#FFF200', '#008F75'] },
  { id: 'dark', name: '暗色', colors: ['#4a9eff', '#ff6b6b', '#51cf66', '#ffd43b', '#ff6b6b'] },
  { id: 'ocean', name: '海洋', colors: ['#3b82f6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444'] },
  { id: 'sunset', name: '日落', colors: ['#ea580c', '#f97316', '#22c55e', '#eab308', '#dc2626'] }
];

const Header = ({ onToggleResult, onToggleFloating, showResult, floatingResult }) => {
  const { currentTheme, setCurrentTheme } = useTheme();

  return (
    <header className="header">
      <div className="header-content">
        <div className="header-left">
          <h1 className="app-title">青云之志算分小助手</h1>
          <div className="tips-carousel">
            <div className="tips-content">
              进入关卡前和自摸时注意顺序哦
            </div>
          </div>
        </div>
        
        <div className="header-right">
          <div className="result-toggle">
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={showResult}
                onChange={onToggleResult}
              />
              <span className="toggle-slider"></span>
              <span className="toggle-label">计算结果</span>
            </label>
          </div>
          
          <div className="theme-selector">
            {themes.map(theme => (
              <div
                key={theme.id}
                className={`theme-option ${currentTheme === theme.id ? 'active' : ''}`}
                onClick={() => setCurrentTheme(theme.id)}
                title={theme.name}
              >
                <div className="theme-colors">
                  {theme.colors.map((color, index) => (
                    <div
                      key={index}
                      className="theme-color"
                      style={{ background: color }}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
