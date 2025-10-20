import React from 'react';
import { useResult } from '../contexts/ResultContext';
import './PredictPanel.css';

const PredictPanel = () => {
  const { predictionResult, isLoading } = useResult();

  return (
    <div className="predict-panel card">
      <h3>未来关卡预测</h3>
      
      {isLoading && (
        <div className="loading">预测中...</div>
      )}
      
      {predictionResult ? (
        <div className="prediction-result">
          <div className="prediction-item">
            <label>最后能通过关卡:</label>
            <span>{predictionResult.lastValidLevel}</span>
          </div>
          
          {predictionResult.firstFailedLevel && (
            <div className="prediction-item">
              <label>第一个无法通过关卡:</label>
              <span>{predictionResult.firstFailedLevel}</span>
            </div>
          )}
        </div>
      ) : (
        <p>暂无预测结果</p>
      )}
      
      <button className="btn btn-secondary" disabled>
        开始预测
      </button>
    </div>
  );
};

export default PredictPanel;
