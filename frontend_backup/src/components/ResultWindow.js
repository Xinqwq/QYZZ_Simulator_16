import React from 'react';
import { useResult } from '../contexts/ResultContext';
import './ResultWindow.css';

const ResultWindow = ({ isFloating = false }) => {
  const { calculationResult, isLoading, error } = useResult();

  if (isLoading) {
    return (
      <div className={`result-window ${isFloating ? 'floating' : ''}`}>
        <div className="result-header">
          <h3>计算结果</h3>
        </div>
        <div className="result-content">
          <div className="loading">计算中...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`result-window ${isFloating ? 'floating' : ''}`}>
        <div className="result-header">
          <h3>计算结果</h3>
        </div>
        <div className="result-content">
          <div className="error">错误: {error}</div>
        </div>
      </div>
    );
  }

  if (!calculationResult) {
    return (
      <div className={`result-window ${isFloating ? 'floating' : ''}`}>
        <div className="result-header">
          <h3>计算结果</h3>
        </div>
        <div className="result-content">
          <div className="no-result">暂无计算结果</div>
        </div>
      </div>
    );
  }

  const { totalScore, theoreticalTotalScore, targetScore, breakdown } = calculationResult;

  return (
    <div className={`result-window ${isFloating ? 'floating' : ''}`}>
      <div className="result-header">
        <h3>计算结果</h3>
      </div>
      <div className="result-content">
        <div className="score-summary">
          <div className="score-item">
            <label>当前总得分:</label>
            <span className="score-value">{totalScore || '0'}</span>
          </div>
          
          {theoreticalTotalScore && (
            <div className="score-item">
              <label>理论最高得分:</label>
              <span className="score-value theoretical">{theoreticalTotalScore}</span>
            </div>
          )}
          
          {targetScore && (
            <div className="score-item">
              <label>目标分:</label>
              <span className="score-value target">{targetScore}</span>
            </div>
          )}
        </div>

        {breakdown && (
          <div className="breakdown">
            <h4>得分详情</h4>
            <div className="breakdown-items">
              {breakdown.daoyin && (
                <div className="breakdown-item">
                  <span className="breakdown-label">盗印:</span>
                  <span className="breakdown-value">{breakdown.daoyin.value}</span>
                  <span className="breakdown-count">({breakdown.daoyin.count}次)</span>
                </div>
              )}
              
              {breakdown.fuzhong && (
                <div className="breakdown-item">
                  <span className="breakdown-label">负重:</span>
                  <span className="breakdown-value">{breakdown.fuzhong.value}</span>
                  <span className="breakdown-count">({breakdown.fuzhong.count}次)</span>
                </div>
              )}
              
              {breakdown.yueguang && (
                <div className="breakdown-item">
                  <span className="breakdown-label">月光:</span>
                  <span className="breakdown-value">{breakdown.yueguang.value}</span>
                  <span className="breakdown-count">({breakdown.yueguang.count}次)</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ResultWindow;
