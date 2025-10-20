import React, { createContext, useContext, useState, useCallback } from 'react';

const ConfigContext = createContext();

export const useConfig = () => {
  const context = useContext(ConfigContext);
  if (!context) {
    throw new Error('useConfig must be used within a ConfigProvider');
  }
  return context;
};

export const ConfigProvider = ({ children }) => {
  // 关卡配置状态
  const [levelConfigs, setLevelConfigs] = useState({});
  const [currentLevel, setCurrentLevel] = useState('1-1');
  
  // 区块显示状态
  const [blockVisibility, setBlockVisibility] = useState({
    level: true,
    score: true,
    multiplier: true,
    triggers: true,
    display: true,
    tech: true,
    target: true,
    predict: true
  });

  // 更新关卡配置
  const updateLevelConfig = useCallback((level, config) => {
    setLevelConfigs(prev => ({
      ...prev,
      [level]: { ...prev[level], ...config }
    }));
  }, []);

  // 切换区块显示
  const toggleBlockVisibility = useCallback((blockName) => {
    setBlockVisibility(prev => ({
      ...prev,
      [blockName]: !prev[blockName]
    }));
  }, []);

  // 获取当前关卡配置
  const getCurrentLevelConfig = useCallback(() => {
    return levelConfigs[currentLevel] || {};
  }, [levelConfigs, currentLevel]);

  const value = {
    levelConfigs,
    currentLevel,
    setCurrentLevel,
    blockVisibility,
    toggleBlockVisibility,
    updateLevelConfig,
    getCurrentLevelConfig
  };

  return (
    <ConfigContext.Provider value={value}>
      {children}
    </ConfigContext.Provider>
  );
};
