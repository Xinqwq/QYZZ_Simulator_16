// 格式化工具函数

// 格式化大数字为中文单位
export const formatChinaJi = (num) => {
  if (!num || num === 0) return '0';
  
  const units = ['', '万', '亿', '兆', '京', '垓', '秭', '穰', '沟', '涧', '正', '载', '极'];
  const numStr = num.toString();
  
  if (numStr.includes('e+')) {
    const [base, exp] = numStr.split('e+');
    const exponent = parseInt(exp);
    
    if (exponent >= 48) {
      const unitIndex = Math.floor(exponent / 4);
      if (unitIndex < units.length) {
        const value = parseFloat(base) * Math.pow(10, exponent % 4);
        return `${value}${units[unitIndex]}`;
      }
    }
  }
  
  // 普通数字格式化
  if (num >= 10000) {
    const unitIndex = Math.floor(Math.log10(num) / 4);
    if (unitIndex < units.length) {
      const value = num / Math.pow(10000, unitIndex);
      return `${value.toFixed(2)}${units[unitIndex]}`;
    }
  }
  
  return num.toString();
};

// 格式化科学计数法
export const formatScientific = (num) => {
  if (!num || num === 0) return '0';
  return num.toExponential(2);
};

// 格式化数字显示
export const formatNumber = (num, format = 'auto') => {
  if (!num || num === 0) return '0';
  
  switch (format) {
    case 'china':
      return formatChinaJi(num);
    case 'scientific':
      return formatScientific(num);
    case 'auto':
    default:
      if (num >= 1e12) {
        return formatScientific(num);
      } else if (num >= 10000) {
        return formatChinaJi(num);
      } else {
        return num.toString();
      }
  }
};

export default {
  formatChinaJi,
  formatScientific,
  formatNumber
};
