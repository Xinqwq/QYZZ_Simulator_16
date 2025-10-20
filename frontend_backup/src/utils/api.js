// API工具函数
const API_BASE_URL = process.env.NODE_ENV === 'production' ? '' : 'http://localhost:5001';

export const api = {
  // 健康检查
  health: async () => {
    const response = await fetch(`${API_BASE_URL}/api/health`);
    return response.json();
  },

  // 计算得分
  calculate: async (levelConfig, sequence, options) => {
    const response = await fetch(`${API_BASE_URL}/api/calc`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ levelConfig, sequence, options }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  },

  // 预测关卡
  predict: async (predictData) => {
    const response = await fetch(`${API_BASE_URL}/api/predict`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(predictData),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  }
};

export default api;
