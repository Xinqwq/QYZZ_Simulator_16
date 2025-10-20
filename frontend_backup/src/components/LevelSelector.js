import React from 'react';
import { useConfig } from '../contexts/ConfigContext';
import './LevelSelector.css';

// 生成关卡选项
const generateLevelOptions = () => {
  const options = [];
  
  // 1-1 到 1-20
  for (let i = 1; i <= 20; i++) {
    options.push(`1-${i}`);
  }
  
  // 2-1 到 2-20
  for (let i = 1; i <= 20; i++) {
    options.push(`2-${i}`);
  }
  
  // 3-1 到 3-20
  for (let i = 1; i <= 20; i++) {
    options.push(`3-${i}`);
  }
  
  // 4-1 到 4-20
  for (let i = 1; i <= 20; i++) {
    options.push(`4-${i}`);
  }
  
  // 5-1 到 5-20
  for (let i = 1; i <= 20; i++) {
    options.push(`5-${i}`);
  }
  
  // 6-1 到 6-20
  for (let i = 1; i <= 20; i++) {
    options.push(`6-${i}`);
  }
  
  // 7-1 到 7-20
  for (let i = 1; i <= 20; i++) {
    options.push(`7-${i}`);
  }
  
  // 8-1 到 8-20
  for (let i = 1; i <= 20; i++) {
    options.push(`8-${i}`);
  }
  
  // 9-1 到 9-20
  for (let i = 1; i <= 20; i++) {
    options.push(`9-${i}`);
  }
  
  // 10-1 到 10-20
  for (let i = 1; i <= 20; i++) {
    options.push(`10-${i}`);
  }
  
  // Ex1 到 Ex120
  for (let i = 1; i <= 120; i++) {
    options.push(`Ex${i}`);
  }
  
  return options;
};

const LevelSelector = () => {
  const { currentLevel, setCurrentLevel } = useConfig();
  const levelOptions = generateLevelOptions();
  const currentIndex = levelOptions.indexOf(currentLevel);

  const handlePrevLevel = () => {
    if (currentIndex > 0) {
      setCurrentLevel(levelOptions[currentIndex - 1]);
    }
  };

  const handleNextLevel = () => {
    if (currentIndex < levelOptions.length - 1) {
      setCurrentLevel(levelOptions[currentIndex + 1]);
    }
  };

  return (
    <div className="level-selector">
      <div className="level-controls">
        <button 
          className="btn btn-small"
          onClick={handlePrevLevel}
          disabled={currentIndex <= 0}
        >
          ◀ 上一关
        </button>
        
        <select
          className="level-select"
          value={currentLevel}
          onChange={(e) => setCurrentLevel(e.target.value)}
        >
          {levelOptions.map(level => (
            <option key={level} value={level}>
              {level}
            </option>
          ))}
        </select>
        
        <button 
          className="btn btn-small"
          onClick={handleNextLevel}
          disabled={currentIndex >= levelOptions.length - 1}
        >
          下一关 ▶
        </button>
      </div>
      
      <div className="level-info">
        <p>当前关卡: <strong>{currentLevel}</strong></p>
        <p>关卡进度: {currentIndex + 1} / {levelOptions.length}</p>
      </div>
    </div>
  );
};

export default LevelSelector;
