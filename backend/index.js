// Author: 16@Xinqwq
const express = require('express');
const cors = require('cors');
const Decimal = require('decimal.js');
const path = require('path');
const fs = require('fs');

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
// 在反向代理（如 Azure App Service）后正确获取协议/源
app.set('trust proxy', 1);

// 动态CORS设置：开发放开，生产仅允许同源/白名单域
const corsOptions = {
  origin: function (origin, callback) {
    // 允许无 origin 的请求（如 curl / Postman）
    if (!origin) return callback(null, true);

    // 开发环境：允许本机端口 6001-6010 或任意来源
    if (process.env.NODE_ENV !== 'production') {
      const localPortRegex = /^https?:\/\/(localhost|127\.0\.0\.1):(600[1-9]|6010)$/;
      if (localPortRegex.test(origin)) return callback(null, true);
      return callback(null, true);
    }

    // 生产环境：允许自定义域名与 Azure 默认域名
    const allowedProdOrigins = [
      /^https:\/\/(www\.)?luloria\.me$/,            // 你的自定义域名
      /^https:\/\/[a-z0-9-]+\.azurewebsites\.net$/ // Azure App Service 默认域名
    ];
    if (allowedProdOrigins.some((re) => re.test(origin))) {
      return callback(null, true);
    }
    return callback(new Error('Not allowed by CORS'));
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

// 静态托管前端（开发与打包均可用）：让 Electron 通过 http://127.0.0.1:5001 加载同源页面
let STATIC_DIR = null;
try {
  // 优先使用React构建文件，回退到备份的HTML文件
  const buildDir = path.join(__dirname, '..', 'frontend', 'build');
  const backupDir = path.join(__dirname, '..', 'frontend_backup');
  const staticDir = require('fs').existsSync(buildDir) ? buildDir : backupDir;
  
  app.use(express.static(staticDir));
  STATIC_DIR = staticDir;
  // 额外开放 /assets 静态目录（用于 favicon 等资源）
  const publicAssets = path.join(__dirname, '..', 'assets');
  app.use('/assets', express.static(publicAssets));
  app.get('/', (_req, res) => {
    const indexPath = path.join(staticDir, 'index.html');
    res.sendFile(indexPath);
  });
  // 兼容浏览器默认请求 /favicon.ico
  app.get('/favicon.ico', (_req, res) => {
    res.type('image/x-icon');
    res.sendFile(path.join(publicAssets, '16.ico'));
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

// 提供一个兜底的 fetch-rewrite.js（若页面引用了该脚本，不会 404，也不会改变逻辑）
app.get('/fetch-rewrite.js', (_req, res) => {
  res.type('application/javascript').send('(function(){/* noop */})();');
});

// 兼容 Linux 大小写：将 /src/assets/music/*.MP3 映射到同名的 .mp3（若存在）
app.get(['/src/assets/music/:filename', '/assets/music/:filename'], (req, res, next) => {
  try {
    const rawName = String(req.params.filename || '');
    const safeName = path.basename(rawName); // 防路径穿越
    const musicDir = path.join(
      STATIC_DIR || path.join(__dirname, '..', 'frontend_backup'),
      'src', 'assets', 'music'
    );

    const candidates = [safeName];
    if (/\.MP3$/.test(safeName)) candidates.push(safeName.replace(/\.MP3$/, '.mp3'));
    if (/\.mp3$/.test(safeName)) candidates.push(safeName.replace(/\.mp3$/, '.MP3'));

    for (const name of candidates) {
      const p = path.join(musicDir, name);
      if (fs.existsSync(p)) return res.sendFile(p);
    }
    return next(); // 交给后续静态或 404 处理
  } catch (e) {
    return next();
  }
});

// 提供 manifest.json（优先使用仓库中的文件，不存在则返回最小清单）
app.get('/manifest.json', (_req, res) => {
  try {
    const baseDir = STATIC_DIR || path.join(__dirname, '..', 'frontend_backup');
    const candidates = [
      path.join(baseDir, 'public', 'manifest.json'),
      path.join(baseDir, 'manifest.json')
    ];
    for (const p of candidates) {
      if (fs.existsSync(p)) return res.sendFile(p);
    }
  } catch (_) {}
  res.type('application/json').send(JSON.stringify({
    name: 'QYZZ Simulator',
    short_name: 'QYZZ',
    start_url: '/',
    display: 'standalone'
  }));
});

// 列出前端 music 目录下的音频文件
app.get('/api/music/list', (_req, res) => {
  try {
    const musicDir = path.join(STATIC_DIR || path.join(__dirname, '..', 'frontend_backup'), 'src', 'assets', 'music');
    const files = fs.readdirSync(musicDir)
      .filter(fn => /\.(mp3|wav|ogg|m4a)$/i.test(fn))
      .sort();
    res.json({ files });
  } catch (err) {
    console.error('music list error:', err.message);
    res.json({ files: [] });
  }
});

// 检查对应 LRC 是否存在，避免前端为了检测而触发 404
app.get('/api/music/has-lrc', (req, res) => {
  try {
    const base = String(req.query.base || ''); // 例如: 'src/assets/music/动森BGM'
    if (!base.startsWith('src/assets/music/')) return res.json({ exists: false });
    const nameOnly = path.basename(base); // 安全：只取文件名
    const musicDir = path.join(STATIC_DIR || path.join(__dirname, '..', 'frontend_backup'), 'src', 'assets', 'music');
    const lrcPath = path.join(musicDir, `${nameOnly}.lrc`);
    return res.json({ exists: fs.existsSync(lrcPath) });
  } catch (err) {
    console.error('has-lrc error:', err.message);
    return res.json({ exists: false });
  }
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
    // Azure App Service 会注入 PORT 环境变量；本地则自动寻找 6001-6010
    const envPort = process.env.PORT && Number(process.env.PORT);
    const port = envPort || await findAvailablePort(6001);
    // Azure 需要监听 0.0.0.0；本地可用 127.0.0.1
    const host = envPort ? '0.0.0.0' : '127.0.0.1';

    app.listen(port, host, () => {
      console.log(`[qyzz] backend listening on http://${host}:${port}`);
      if (!envPort) console.log(`[qyzz] Port ${port} selected automatically`);
    });
    
    return port;
  } catch (error) {
    console.error('[fatal] Failed to start server:', error.message);
    process.exit(1);
  }
}

// 启动服务器
startServer();


