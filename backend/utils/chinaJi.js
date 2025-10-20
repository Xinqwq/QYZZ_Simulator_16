// Author: 16@Xinqwq
const Decimal = require('decimal.js');

const units = ["万","亿","兆","京","垓","秭","穰","沟","涧","正","载","极"];
const unitExponents = [4,8,12,16,20,24,28,32,36,40,44,48];

function chinaJiFormat(input, digits = 2) {
  const d = new Decimal(input);
  if (d.isZero()) return '0';
  // 计算以 10 为底的指数位
  const expo = Math.floor(Decimal.log10 ? Decimal.log10(d).toNumber() : d.log(10).toNumber());
  const jiCount = Math.floor(expo / 48);
  let remainingExpo = expo % 48;
  const coeff = d.div(Decimal.pow(10, expo));
  let unit = '';
  let coeffAdjusted = new Decimal(coeff);
  for (let i = unitExponents.length - 1; i >= 0; i--) {
    if (remainingExpo >= unitExponents[i]) {
      const shift = remainingExpo - unitExponents[i];
      coeffAdjusted = coeffAdjusted.mul(Decimal.pow(10, shift));
      remainingExpo = unitExponents[i];
      unit = units[i];
      break;
    }
  }
  if (unit === '' && remainingExpo > 0) {
    coeffAdjusted = coeffAdjusted.mul(Decimal.pow(10, remainingExpo));
  }
  return `${coeffAdjusted.toFixed(digits)}${unit}${'极'.repeat(jiCount)}`;
}

// 将包含中文单位（万/亿/兆/…/载）与“极”重复后缀的字符串解析为科学计数法字符串（如 1.25e52）
function parseChinaJiToExpString(input) {
  if (input == null) return undefined;
  const raw = String(input).trim();
  if (!raw) return undefined;
  // 已是科学计数法或纯数字，直接返回
  if (/^[-+]?\d+(?:\.\d+)?(?:e[-+]?\d+)?$/i.test(raw)) return raw;

  // 支持任意“极”重复，且允许前面出现任一基础单位（万/亿/兆/.../载）
  const m = raw.match(/^\s*([-+]?\d+(?:\.\d+)?)\s*([万亿兆京垓秭穰沟涧正载]?)(极*)\s*$/);
  if (!m) return undefined;
  const coeff = m[1];
  const baseUnit = m[2] || '';
  const jiRepeats = (m[3] || '').length; // 极 的重复次数

  let baseExp = 0;
  if (baseUnit) {
    const idx = units.indexOf(baseUnit);
    if (idx >= 0) baseExp = unitExponents[idx];
  }
  const totalExp = baseExp + jiRepeats * 48;
  return `${coeff}e${totalExp}`;
}

module.exports = { chinaJiFormat, parseChinaJiToExpString, units, unitExponents };


