import React from 'react';
import { useResult } from '../contexts/ResultContext';
import { useConfig } from '../contexts/ConfigContext';
import './CalculateButton.css';

const CalculateButton = () => {
  const { calculateScore, isLoading } = useResult();
  const { getCurrentLevelConfig } = useConfig();

  const handleCalculate = async () => {
    try {
      const config = getCurrentLevelConfig();
      const sequence = {
        baseScore: '1000' // 默认基础分
      };
      const options = {};
      
      await calculateScore(config, sequence, options);
    } catch (error) {
      console.error('计算失败:', error);
    }
  };

  return (
    <div className="calculate-button-container">
      <button 
        className="btn btn-primary calculate-btn"
        onClick={handleCalculate}
        disabled={isLoading}
      >
        {isLoading ? '计算中...' : '计算得分'}
      </button>
    </div>
  );
};

export default CalculateButton;
