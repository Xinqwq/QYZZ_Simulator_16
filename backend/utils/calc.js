// Author: 16@Xinqwq
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
  
  // 如果前端传递了王之召唤计算好的乘数，直接使用，不再重复计算
  let finalMultiplier;
  if (options.finalMultiplierOverride != null) {
    // 前端已经计算好了王之召唤乘数，直接使用
    finalMultiplier = safeDecimal(options.finalMultiplierOverride, 1);
  } else {
    // 兼容旧逻辑：使用后端自己的王之召唤计算
    finalMultiplier = safeDecimal(levelConfig.kingCallInitialMultiplier || 1, 1);
    if (levelConfig.kingCallTriggers && levelConfig.kingCallBase) {
      finalMultiplier = finalMultiplier.mul(Decimal.pow(safeDecimal(levelConfig.kingCallBase, 1), levelConfig.kingCallTriggers));
    }
  }

  const muls = {
    daoyin: { value: safeDecimal(options.daoyinValue || 1, 1), triggers: 0 },
    fuzhong: { value: safeDecimal(options.fuzhongValue || 1, 1), triggers: 0 },
    yueguang: { value: safeDecimal(options.yueguangValue || 1, 1), triggers: 0 },
  };

  // 调试日志：检查护身符数值
  console.log('🔍 后端护身符数值调试:', {
    daoyinValue: options.daoyinValue,
    fuzhongValue: options.fuzhongValue,
    yueguangValue: options.yueguangValue,
    mulsDaoyinValue: muls.daoyin.value.toString(),
    mulsFuzhongValue: muls.fuzhong.value.toString(),
    mulsYueguangValue: muls.yueguang.value.toString()
  });

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
  
  console.log('🔍 实际得分乘数计算前:', {
    finalMultiplier: finalMultiplier.toString(),
    triggers: {
      daoyin: muls.daoyin.triggers,
      fuzhong: muls.fuzhong.triggers,
      yueguang: muls.yueguang.triggers
    },
    mulsValues: {
      daoyin: muls.daoyin.value.toString(),
      fuzhong: muls.fuzhong.value.toString(),
      yueguang: muls.yueguang.value.toString()
    }
  });
  
  totalMultiplier = totalMultiplier.mul(muls.daoyin.value.pow(muls.daoyin.triggers));
  totalMultiplier = totalMultiplier.mul(muls.fuzhong.value.pow(muls.fuzhong.triggers));
  totalMultiplier = totalMultiplier.mul(muls.yueguang.value.pow(muls.yueguang.triggers));
  
  console.log('🔍 实际得分乘数计算后:', {
    totalMultiplier: totalMultiplier.toString(),
    base: base.toString()
  });

  const totalScore = base.mul(totalMultiplier);
  
  console.log('🔍 实际总分计算:', {
    totalScore: totalScore.toString()
  });

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
      kingCall: Number(o.kingCall) || 0, // 添加王之召唤理论最大触发次数
    };
    
    // 如果护身符番数为0，则理论最大触发次数也应该为0（忽略该护身符）
    if (muls.daoyin.value.eq(0)) theoreticalMaxes.daoyin = 0;
    if (muls.fuzhong.value.eq(0)) theoreticalMaxes.fuzhong = 0;
    if (muls.yueguang.value.eq(0)) theoreticalMaxes.yueguang = 0;
    
    console.log('🔍 理论最大触发次数设置后:', {
      originalTheoreticalMaxes: {
        daoyin: Number(o.daoyin) || 0,
        fuzhong: Number(o.fuzhong) || 0,
        yueguang: Number(o.yueguang) || 0,
        kingCall: Number(o.kingCall) || 0
      },
      finalTheoreticalMaxes: theoreticalMaxes,
      mulsValues: {
        daoyin: muls.daoyin.value.toString(),
        fuzhong: muls.fuzhong.value.toString(),
        yueguang: muls.yueguang.value.toString()
      }
    });
  } else {
    const anyPlusLanXing = items.some(it => isLanXing(it) && it.isPlus);
    const anyLanXing = items.some(it => isLanXing(it));
    const availableRight = Math.max(0, items.length - 1); // 可传导的最远右侧步数
    const idx = Math.max(0, Math.min(availableRight - 1, (anyPlusLanXing ? plusPattern.length : nonPlusPattern.length) - 1));
    const theoVal = anyPlusLanXing ? plusPattern[idx] : (anyLanXing ? nonPlusPattern[idx] : 0);
    theoreticalMaxes = { daoyin: theoVal, fuzhong: theoVal, yueguang: theoVal, kingCall: 0 };
    
    // 如果护身符番数为0，则理论最大触发次数也应该为0（忽略该护身符）
    if (muls.daoyin.value.eq(0)) theoreticalMaxes.daoyin = 0;
    if (muls.fuzhong.value.eq(0)) theoreticalMaxes.fuzhong = 0;
    if (muls.yueguang.value.eq(0)) theoreticalMaxes.yueguang = 0;
  }

  let theoreticalMultiplier;
  
  // 王之召唤理论最大触发次数的处理
  console.log('🔍 后端理论最大分数计算调试:', {
    hasOverrideTheoreticalMaxes: !!options.overrideTheoreticalMaxes,
    overrideTheoreticalMaxes: options.overrideTheoreticalMaxes,
    kingCallTheoretical: options.overrideTheoreticalMaxes?.kingCall,
    theoreticalMaxesKingCall: theoreticalMaxes.kingCall,
    hasTheoreticalFinalMultiplierOverride: options.theoreticalFinalMultiplierOverride != null,
    theoreticalFinalMultiplierOverride: options.theoreticalFinalMultiplierOverride,
    finalMultiplier: finalMultiplier.toString()
  });
  
  if (options.overrideTheoreticalMaxes && options.overrideTheoreticalMaxes.kingCall !== undefined) {
    // 检查王之召唤是否真正开启（通过检查是否有王之召唤相关的配置）
    const kingCallEnabled = levelConfig.kingCallTriggers !== undefined && levelConfig.kingCallBase !== undefined;
    
    if (kingCallEnabled) {
      // 如果前端传递了王之召唤理论最大乘数，直接使用
      if (options.theoreticalFinalMultiplierOverride != null) {
        theoreticalMultiplier = safeDecimal(options.theoreticalFinalMultiplierOverride, 1);
        console.log('🎯 使用前端传递的王之召唤理论最大乘数:', theoreticalMultiplier.toString());
      } else if (theoreticalMaxes.kingCall > 0) {
        // 否则使用后端的简单计算逻辑
        const kingCallBase = safeDecimal(levelConfig.kingCallBase || 30, 30);
        const kingCallTriggers = theoreticalMaxes.kingCall;
        const kingCallInitialMultiplier = safeDecimal(levelConfig.kingCallInitialMultiplier || 1, 1);
        
        // 重新计算王之召唤乘数
        const kingCallMultiplier = kingCallInitialMultiplier.mul(Decimal.pow(kingCallBase, kingCallTriggers));
        theoreticalMultiplier = kingCallMultiplier;
        console.log('🎯 使用后端计算的王之召唤理论最大乘数:', theoreticalMultiplier.toString());
      } else {
        // 如果王之召唤理论最大触发次数为0，使用原始胡牌番数
        theoreticalMultiplier = safeDecimal(levelConfig.kingCallInitialMultiplier || 1, 1);
        console.log('🎯 王之召唤理论最大触发次数为0，使用原始胡牌番数:', theoreticalMultiplier.toString());
      }
    } else {
      // 王之召唤未开启，使用原始胡牌番数
      theoreticalMultiplier = finalMultiplier;
      console.log('🎯 王之召唤未开启，使用原始胡牌番数:', theoreticalMultiplier.toString());
    }
  } else {
    // 如果没有王之召唤理论最大触发次数设置，使用实际乘数
    theoreticalMultiplier = finalMultiplier;
    console.log('🎯 没有王之召唤理论最大触发次数设置，使用实际乘数:', theoreticalMultiplier.toString());
  }
  
  console.log('🔍 理论最大乘数计算前:', {
    theoreticalMultiplier: theoreticalMultiplier.toString(),
    theoreticalMaxes: theoreticalMaxes,
    mulsValues: {
      daoyin: muls.daoyin.value.toString(),
      fuzhong: muls.fuzhong.value.toString(),
      yueguang: muls.yueguang.value.toString()
    }
  });
  
  theoreticalMultiplier = theoreticalMultiplier.mul(muls.daoyin.value.pow(theoreticalMaxes.daoyin));
  theoreticalMultiplier = theoreticalMultiplier.mul(muls.fuzhong.value.pow(theoreticalMaxes.fuzhong));
  theoreticalMultiplier = theoreticalMultiplier.mul(muls.yueguang.value.pow(theoreticalMaxes.yueguang));
  
  console.log('🔍 理论最大乘数计算后:', {
    theoreticalMultiplier: theoreticalMultiplier.toString(),
    base: base.toString()
  });
  
  const theoreticalTotalScore = base.mul(theoreticalMultiplier);
  
  console.log('🔍 理论最大总分计算:', {
    theoreticalTotalScore: theoreticalTotalScore.toString()
  });

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


