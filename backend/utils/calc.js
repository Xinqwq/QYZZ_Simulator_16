const Decimal = require('decimal.js');

function isLanXing(item) {
  // 约定：item.type === 'lanxing' 表示岚星；实际可由前端/库统一
  return item && (item.type === 'lanxing' || item.isLanXing === true);
}

function assignTrigger(target, count, muls) {
  if (!target || !target.stampId) return;
  if (target.stampId === 'daoyin') muls.daoyin.triggers += count;
  if (target.stampId === 'fuzhong') muls.fuzhong.triggers += count;
  if (target.stampId === 'yueguang') muls.yueguang.triggers += count;
}

function safeDecimal(input, fallback = 0) {
  try { return new Decimal(input); } catch { return new Decimal(fallback); }
}

function calculate(sequence, levelConfig, options = {}) {
  const base = safeDecimal(sequence.baseScore || 0, 0);
  let finalMultiplier = safeDecimal(levelConfig.kingCallInitialMultiplier || 1, 1);

  if (levelConfig.kingCallTriggers && levelConfig.kingCallBase) {
    finalMultiplier = finalMultiplier.mul(Decimal.pow(safeDecimal(levelConfig.kingCallBase, 1), levelConfig.kingCallTriggers));
  }

  // 允许用 options.finalMultiplierOverride 覆盖/叠乘最终番数
  if (options.finalMultiplierOverride != null) {
    finalMultiplier = finalMultiplier.mul(safeDecimal(options.finalMultiplierOverride, 1));
  }

  const muls = {
    daoyin: { value: safeDecimal(options.daoyinValue || 1, 1), triggers: 0 },
    fuzhong: { value: safeDecimal(options.fuzhongValue || 1, 1), triggers: 0 },
    yueguang: { value: safeDecimal(options.yueguangValue || 1, 1), triggers: 0 },
  };

  const items = Array.isArray(sequence.items) ? sequence.items : [];

  if (options.overrideTriggers && typeof options.overrideTriggers === 'object') {
    const o = options.overrideTriggers;
    if (o.daoyin != null) muls.daoyin.triggers = Number(o.daoyin) || 0;
    if (o.fuzhong != null) muls.fuzhong.triggers = Number(o.fuzhong) || 0;
    if (o.yueguang != null) muls.yueguang.triggers = Number(o.yueguang) || 0;
  } else {
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (isLanXing(item)) {
        const seq = item.isPlus ? [4,4,5,6,7,8,9] : [3,3,4,5,6];
        for (let j = 0; j < seq.length && (i + 1 + j) < items.length; j++) {
          const target = items[i + 1 + j];
          assignTrigger(target, seq[j], muls);
        }
      }
    }
  }

  let totalMultiplier = finalMultiplier;
  totalMultiplier = totalMultiplier.mul(muls.daoyin.value.pow(muls.daoyin.triggers));
  totalMultiplier = totalMultiplier.mul(muls.fuzhong.value.pow(muls.fuzhong.triggers));
  totalMultiplier = totalMultiplier.mul(muls.yueguang.value.pow(muls.yueguang.triggers));

  const totalScore = base.mul(totalMultiplier);

  const target = safeDecimal(levelConfig.targetScore || 0, 0);
  const status = totalScore.gte(target.mul(5)) ? 'over5x' : totalScore.gte(target) ? 'ok' : 'under';

  // 理论最大次数（近似：按可到达的最远右侧位置取对应序列值）
  const plusPattern = [4,4,5,6,7,8,9];
  const nonPlusPattern = [3,3,4,5,6];
  let theoreticalMaxes;
  if (options.overrideTheoreticalMaxes && typeof options.overrideTheoreticalMaxes === 'object') {
    const o = options.overrideTheoreticalMaxes;
    theoreticalMaxes = {
      daoyin: Number(o.daoyin) || 0,
      fuzhong: Number(o.fuzhong) || 0,
      yueguang: Number(o.yueguang) || 0,
    };
  } else {
    const anyPlusLanXing = items.some(it => isLanXing(it) && it.isPlus);
    const anyLanXing = items.some(it => isLanXing(it));
    const availableRight = Math.max(0, items.length - 1); // 可传导的最远右侧步数
    const idx = Math.max(0, Math.min(availableRight - 1, (anyPlusLanXing ? plusPattern.length : nonPlusPattern.length) - 1));
    const theoVal = anyPlusLanXing ? plusPattern[idx] : (anyLanXing ? nonPlusPattern[idx] : 0);
    theoreticalMaxes = { daoyin: theoVal, fuzhong: theoVal, yueguang: theoVal };
  }

  let theoreticalMultiplier = finalMultiplier;
  theoreticalMultiplier = theoreticalMultiplier.mul(muls.daoyin.value.pow(theoreticalMaxes.daoyin));
  theoreticalMultiplier = theoreticalMultiplier.mul(muls.fuzhong.value.pow(theoreticalMaxes.fuzhong));
  theoreticalMultiplier = theoreticalMultiplier.mul(muls.yueguang.value.pow(theoreticalMaxes.yueguang));
  const theoreticalTotalScore = base.mul(theoreticalMultiplier);

  return {
    totalScore: totalScore.toString(),
    totalMultiplier: totalMultiplier.toString(),
    breakdown: muls,
    status,
    theoreticalMaxes,
    theoreticalTotalScore: theoreticalTotalScore.toString(),
    theoreticalTotalMultiplier: theoreticalMultiplier.toString(),
  };
}

module.exports = { calculate };


