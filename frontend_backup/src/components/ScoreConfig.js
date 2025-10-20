import React, { useState } from 'react';
import { useConfig } from '../contexts/ConfigContext';
import './ScoreConfig.css';

const ScoreConfig = () => {
  const { updateLevelConfig, getCurrentLevelConfig, currentLevel } = useConfig();
  const config = getCurrentLevelConfig();
  
  const [targetScore, setTargetScore] = useState(config.targetScore || '');
  const [daoyinValue, setDaoyinValue] = useState(config.daoyinValue || '1');
  const [fuzhongValue, setFuzhongValue] = useState(config.fuzhongValue || '1');
  const [yueguangValue, setYueguangValue] = useState(config.yueguangValue || '1');
  const [finalMultiplier, setFinalMultiplier] = useState(config.finalMultiplier || '1');

  const handleSave = () => {
    updateLevelConfig(currentLevel, {
      targetScore,
      daoyinValue,
      fuzhongValue,
      yueguangValue,
      finalMultiplier
    });
  };

  return (
    <div className="score-config">
      <div className="config-grid">
        <div className="config-item">
          <label>目标分:</label>
          <input
            type="text"
            className="input"
            value={targetScore}
            onChange={(e) => setTargetScore(e.target.value)}
            placeholder="输入目标分数"
          />
        </div>
        
        <div className="config-item">
          <label>盗印番数:</label>
          <input
            type="text"
            className="input"
            value={daoyinValue}
            onChange={(e) => setDaoyinValue(e.target.value)}
            placeholder="盗印番数"
          />
        </div>
        
        <div className="config-item">
          <label>负重番数:</label>
          <input
            type="text"
            className="input"
            value={fuzhongValue}
            onChange={(e) => setFuzhongValue(e.target.value)}
            placeholder="负重番数"
          />
        </div>
        
        <div className="config-item">
          <label>月光番数:</label>
          <input
            type="text"
            className="input"
            value={yueguangValue}
            onChange={(e) => setYueguangValue(e.target.value)}
            placeholder="月光番数"
          />
        </div>
        
        <div className="config-item">
          <label>最终番数:</label>
          <input
            type="text"
            className="input"
            value={finalMultiplier}
            onChange={(e) => setFinalMultiplier(e.target.value)}
            placeholder="最终番数"
          />
        </div>
      </div>
      
      <button className="btn btn-secondary" onClick={handleSave}>
        保存配置
      </button>
    </div>
  );
};

export default ScoreConfig;
