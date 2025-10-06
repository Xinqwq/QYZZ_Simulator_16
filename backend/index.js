// Author: 16@Xinqwq
const express = require('express');
const cors = require('cors');
const Decimal = require('decimal.js');
const path = require('path');

// 捕获未处理异常，避免进程直接退出导致前端 ERR_EMPTY_RESPONSE
process.on('uncaughtException', (err) => {
  console.error('[fatal] uncaughtException:', err);
});
process.on('unhandledRejection', (reason) => {
  console.error('[fatal] unhandledRejection:', reason);
});

const { chinaJiFormat, parseChinaJiToExpString } = require('./utils/chinaJi');
const { calculate } = require('./utils/calc');

const app = express();

// 更严格、显式的 CORS 设置，保证预检后允许 POST 继续
const corsOptions = {
  origin: '*',
  methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: false,
  preflightContinue: false,
  optionsSuccessStatus: 204,
};

app.use(cors(corsOptions));
// 提升请求体上限，避免大预测请求在 Electron 下被提前断开
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// 静态托管前端（开发与打包均可用）：让 Electron 通过 http://127.0.0.1:4001 加载同源页面
try {
  const staticDir = path.join(__dirname, '..', 'frontend');
  app.use(express.static(staticDir));
  app.get('/', (_req, res) => {
    res.sendFile(path.join(staticDir, 'index.html'));
  });
} catch (e) {
  console.warn('[static] failed to mount frontend static dir:', e && e.message);
}

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'qyzz-backend' });
});

app.post('/api/calc', (req, res) => {
  try {
    const { levelConfig, sequence, options } = req.body || {};
    if (!levelConfig || !sequence) {
      return res.status(400).json({ error: 'missing levelConfig or sequence' });
    }
    // 若目标分是中文单位（或"极"叠加），预处理为科学计数法字符串
    const normalizedLevel = { ...levelConfig };
    if (typeof normalizedLevel.targetScore === 'string') {
      const parsed = parseChinaJiToExpString(normalizedLevel.targetScore);
      if (parsed) normalizedLevel.targetScore = parsed;
    }

    // 解析 options 中可能含中文单位的番数（盗印/负重/月光）
    const normalizedOptions = { ...(options || {}) };
    // 尝试解析 options 中所有字符串为科学计数
    Object.keys(normalizedOptions).forEach((k) => {
      const v = normalizedOptions[k];
      if (typeof v === 'string') {
        const parsed = parseChinaJiToExpString(v);
        if (parsed) normalizedOptions[k] = parsed;
      }
    });
    // 规范 overrideTriggers 为数值
    if (normalizedOptions.overrideTriggers && typeof normalizedOptions.overrideTriggers === 'object') {
      ['daoyin','fuzhong','yueguang'].forEach((k) => {
        if (normalizedOptions.overrideTriggers[k] != null) {
          normalizedOptions.overrideTriggers[k] = Number(normalizedOptions.overrideTriggers[k]) || 0;
        }
      });
    }

    // 解析 baseScore 若含中文单位
    const normalizedSeq = { ...(sequence || {}) };
    if (typeof normalizedSeq.baseScore === 'string') {
      const parsed = parseChinaJiToExpString(normalizedSeq.baseScore);
      if (parsed) normalizedSeq.baseScore = parsed;
    }

    const result = calculate(normalizedSeq, normalizedLevel, normalizedOptions);

    // 附带格式化后的中国大数显示
    const formatted = {
      totalScoreChinaJi: chinaJiFormat(result.totalScore),
      theoreticalTotalScoreChinaJi: result.theoreticalTotalScore ? chinaJiFormat(result.theoreticalTotalScore) : undefined,
      targetScoreChinaJi: normalizedLevel.targetScore ? chinaJiFormat(normalizedLevel.targetScore) : undefined,
      daoyinValueChinaJi: result.breakdown?.daoyin?.value ? chinaJiFormat(result.breakdown.daoyin.value) : undefined,
      fuzhongValueChinaJi: result.breakdown?.fuzhong?.value ? chinaJiFormat(result.breakdown.fuzhong.value) : undefined,
      yueguangValueChinaJi: result.breakdown?.yueguang?.value ? chinaJiFormat(result.breakdown.yueguang.value) : undefined,
    };

    res.json({ ...result, formatted });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'internal_error', message: String(err && err.message || err) });
  }
});

// 新增预测计算API
app.post('/api/predict', (req, res) => {
  try {
    const { 
      baseScore, 
      finalMultiplier, 
      currentLevel,
      levelData,
      type,
      triggers
    } = req.body || {};
    
    if (!baseScore || !finalMultiplier || !currentLevel || !levelData || !triggers) {
      return res.status(400).json({ error: 'missing required parameters' });
    }

    // 解析可能包含中文单位的数值
    const normalizeValue = (value) => {
      if (typeof value === 'string') {
        const parsed = parseChinaJiToExpString(value);
        return parsed ? new Decimal(parsed) : new Decimal(value);
      }
      return new Decimal(value);
    };

    const base = normalizeValue(baseScore);
    const final = normalizeValue(finalMultiplier);

    // 从请求中获取触发次数
    const trigD = triggers.daoyin || 0;
    const trigF = triggers.fuzhong || 0;
    const trigY = triggers.yueguang || 0;

    let lastValidLevel = currentLevel; // 初始化为当前关卡
    let lastValidScore = null;
    let lastValidTarget = null;
    let hasPassedAnyLevel = false; // 标记是否通过了任何关卡

    // 遍历所有关卡进行预测
    for (const [levelKey, levelInfo] of Object.entries(levelData)) {
      const targetScoreStr = levelInfo.targetScore;
      const targetScore = normalizeValue(targetScoreStr);
      
      const levelDaoyin = normalizeValue(levelInfo.daoyinValue || 1);
      const levelFuzhong = normalizeValue(levelInfo.fuzhongValue || 1);
      const levelYueguang = normalizeValue(levelInfo.yueguangValue || 1);

      // 计算得分：胡牌番数 * 小分分值 * 盗印番数^盗印触发次数 * 负重番数^负重触发次数 * 月光番数^月光触发次数
      const levelScore = final
        .mul(base)
        .mul(levelDaoyin.pow(trigD))
        .mul(levelFuzhong.pow(trigF))
        .mul(levelYueguang.pow(trigY));

      // 检查当前关卡是否能够通过
      if (levelScore.gte(targetScore)) {
        // 能够通过当前关卡，记录为最后一个有效的关卡
        lastValidLevel = levelKey;
        lastValidScore = levelScore;
        lastValidTarget = targetScore;
        hasPassedAnyLevel = true;
        // 继续检查下一个关卡
      } else {
        // 无法通过当前关卡，返回结果
        const result = {
          canPass: false,
          lastValidLevel: hasPassedAnyLevel ? lastValidLevel : currentLevel,
          lastValidScore: hasPassedAnyLevel && lastValidScore ? lastValidScore.toString() : null,
          lastValidTarget: hasPassedAnyLevel && lastValidTarget ? lastValidTarget.toString() : null,
          firstFailedLevel: levelKey,
          firstFailedScore: levelScore.toString(),
          firstFailedTarget: targetScore.toString(),
          triggerText: type === 'current' ? '当前触发次数' : '理论最大次数'
        };
        
        return res.json(result);
      }
    }

    // 如果可以超过所有关卡
    res.json({
      canPass: true,
      lastValidLevel: hasPassedAnyLevel ? lastValidLevel : currentLevel,
      lastValidScore: hasPassedAnyLevel && lastValidScore ? lastValidScore.toString() : null,
      lastValidTarget: hasPassedAnyLevel && lastValidTarget ? lastValidTarget.toString() : null,
      triggerText: type === 'current' ? ' ' : '理论最大次数'
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'internal_error', message: String(err && err.message || err) });
  }
});

// 统一错误处理中间件，保证返回 500 JSON 而不是直接断开
app.use((err, _req, res, _next) => {
  console.error('[error] request failed:', err);
  if (!res.headersSent) {
    res.status(500).json({ error: 'internal_error', message: String(err && err.message || err) });
  }
});

const port = process.env.PORT || 4001;
const host = '127.0.0.1';
app.listen(port, host, () => {
  console.log(`[qyzz] backend listening on http://${host}:${port}`);
});


