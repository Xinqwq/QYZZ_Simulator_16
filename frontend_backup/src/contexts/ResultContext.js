import React, { createContext, useContext, useState, useCallback } from 'react';

const ResultContext = createContext();

export const useResult = () => {
  const context = useContext(ResultContext);
  if (!context) {
    throw new Error('useResult must be used within a ResultProvider');
  }
  return context;
};

export const ResultProvider = ({ children }) => {
  const [calculationResult, setCalculationResult] = useState(null);
  const [predictionResult, setPredictionResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // 计算得分
  const calculateScore = useCallback(async (levelConfig, sequence, options) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/calc', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ levelConfig, sequence, options }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      setCalculationResult(result);
      return result;
    } catch (err) {
      setError(err.message);
      console.error('计算得分失败:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 预测关卡
  const predictLevels = useCallback(async (predictData) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/predict', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(predictData),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      setPredictionResult(result);
      return result;
    } catch (err) {
      setError(err.message);
      console.error('预测关卡失败:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 清除结果
  const clearResults = useCallback(() => {
    setCalculationResult(null);
    setPredictionResult(null);
    setError(null);
  }, []);

  const value = {
    calculationResult,
    predictionResult,
    isLoading,
    error,
    calculateScore,
    predictLevels,
    clearResults
  };

  return (
    <ResultContext.Provider value={value}>
      {children}
    </ResultContext.Provider>
  );
};
