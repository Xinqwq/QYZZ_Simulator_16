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

// 动态CORS设置，支持自动端口切换和Azure部署
const corsOptions = {
  origin: function (origin, callback) {
    // 允许的源列表，包括本地开发和生产环境
    const allowedOrigins = [
      'https://luloria.me',
      'https://www.luloria.me',
      'https://qyzz-simulator-167.azurewebsites.net'
    ];
    
    // 允许所有本地端口访问（6001-6010范围）
    if (!origin) {
      // 允许无origin的请求（如Postman、移动应用等）
      return callback(null, true);
    }
    
    // 检查是否是本地端口范围内的请求
    const localPortRegex = /^https?:\/\/(localhost|127\.0\.0\.1):(600[1-9]|6010)$/;
    if (localPortRegex.test(origin)) {
      return callback(null, true);
    }
    
    // 检查是否是允许的域名
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    
    // 允许开发环境的其他端口
    if (process.env.NODE_ENV !== 'production') {
      return callback(null, true);
    }
    
    // 生产环境拒绝其他来源
    callback(new Error('Not allowed by CORS'));
  },
  methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: false,
  preflightContinue: false,
  optionsSuccessStatus: 204,
};

app.use(cors(corsOptions));
// 提升请求体上限，避免大预测请求在 Electron 下被提前断开
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// 静态托管前端（Azure部署版本）
try {
  // Azure部署使用public目录
  const publicDir = path.join(__dirname, '..', 'public');
  const staticDir = publicDir;
  
  app.use(express.static(staticDir));
  app.get('/', (_req, res) => {
    const indexPath = path.join(staticDir, 'index.html');
    res.sendFile(indexPath);
  });
  
  console.log(`[static] serving from: ${staticDir}`);
} catch (e) {
  console.warn('[static] failed to mount frontend static dir:', e && e.message);
}

app.get('/api/health', (_req, res) => {
  res.json({ 
    status: 'ok', 
    service: 'qyzz-backend',
    timestamp: new Date().toISOString(),
    port: _req.socket.localPort 
  });
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
      triggers,
      kingCallData // 新增：王之召唤相关数据
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
    
    // 从请求中获取触发次数
    const trigD = triggers.daoyin || 0;
    const trigF = triggers.fuzhong || 0;
    const trigY = triggers.yueguang || 0;
    
    // 王之召唤相关参数
    const kingEnabled = kingCallData && kingCallData.enabled;
    const kingTriggers = kingCallData && kingCallData.triggers ? Number(kingCallData.triggers) : 0;
    const kingMaxTriggers = kingCallData && kingCallData.maxTriggers ? Number(kingCallData.maxTriggers) : 0;
    const winCountFromSettings = kingCallData && kingCallData.winCount ? Number(kingCallData.winCount) : 1;
    
    // 根据type决定使用哪个触发次数
    const actualKingTriggers = type === 'current' ? kingTriggers : kingMaxTriggers;

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
      
      // 计算王之召唤乘数（如果王之召唤开启）
      let actualFinalMultiplier = normalizeValue(finalMultiplier);
      if (kingEnabled && levelInfo.kingValue && actualKingTriggers > 0) {
        const currentKingFan = Number(levelInfo.kingValue);
        if (currentKingFan > 0) {
          // 王之召唤计算：EffectiveFan = 14 * currentKingFan, FinalFan = EffectiveFan + 10 + winCount
          const effectiveFan = 14 * currentKingFan;
          const finalFan = effectiveFan + 10 + winCountFromSettings;
          
          // 连乘部分：FinalFan × (currentKingFan+1) × ... × (currentKingFan+actualKingTriggers)
          let kingMultiplier = finalFan;
          for (let k = currentKingFan + 1; k <= currentKingFan + actualKingTriggers; k++) {
            kingMultiplier *= k;
          }
          actualFinalMultiplier = normalizeValue(kingMultiplier);
          
          console.log(`🔍 未来关卡预测王之召唤调试 - ${levelKey} (${type}):`, {
            currentKingFan,
            actualKingTriggers,
            winCountFromSettings,
            kingMultiplier: kingMultiplier.toString(),
            type
          });
        }
      }

      // 计算得分：胡牌番数 * 小分分值 * 盗印番数^盗印触发次数 * 负重番数^负重触发次数 * 月光番数^月光触发次数
      const levelScore = actualFinalMultiplier
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

// 自动端口切换功能
const net = require('net');

// 检测端口是否可用
function checkPortAvailable(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.listen(port, '127.0.0.1', () => {
      server.once('close', () => resolve(true));
      server.close();
    });
    server.on('error', () => resolve(false));
  });
}

// 查找可用端口
async function findAvailablePort(startPort = 6001, maxAttempts = 10) {
  for (let i = 0; i < maxAttempts; i++) {
    const port = startPort + i;
    if (await checkPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available ports found in range ${startPort}-${startPort + maxAttempts - 1}`);
}

// 启动服务器
async function startServer() {
  try {
    // Azure部署使用环境变量PORT，本地开发使用自动端口检测
    const port = process.env.PORT || await findAvailablePort(6001);
    const host = process.env.NODE_ENV === 'production' ? '0.0.0.0' : '127.0.0.1';
    
    app.listen(port, host, () => {
      console.log(`[qyzz] backend listening on http://${host}:${port}`);
      if (process.env.PORT) {
        console.log(`[qyzz] Azure deployment mode, using PORT=${port}`);
      } else {
        console.log(`[qyzz] Local development mode, Port ${port} selected automatically`);
      }
    });
    
    return port;
  } catch (error) {
    console.error('[fatal] Failed to start server:', error.message);
    process.exit(1);
  }
}

// 启动服务器
startServer();


