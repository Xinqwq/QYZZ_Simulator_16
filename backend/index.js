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

// 轻量访问统计（JSON 持久化）
const DATA_DIR = path.join(__dirname, 'data');
const ANALYTICS_FILE = path.join(DATA_DIR, 'analytics.json');

function ensureAnalyticsStore() {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    if (!fs.existsSync(ANALYTICS_FILE)) {
      const initial = {
        totalVisits: 0,
        totalHits: 0,
        visitors: {}, // vid -> { firstSeen, lastSeen, visits }
        daily: {},    // 'YYYY-MM-DD' -> count
        dailyHits: {},// 'YYYY-MM-DD' -> hits count
        ips: {},      // ip -> hits
        paths: {}     // path -> hits（页面加载次数）
      };
      fs.writeFileSync(ANALYTICS_FILE, JSON.stringify(initial, null, 2));
    }
  } catch (e) {
    console.warn('[analytics] init failed:', e && e.message);
  }
}

function readAnalytics() {
  try {
    const raw = fs.readFileSync(ANALYTICS_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    // 兼容旧版本：补齐缺失字段
    if (parsed == null || typeof parsed !== 'object') {
      return { totalVisits: 0, totalHits: 0, visitors: {}, daily: {}, dailyHits: {}, ips: {}, paths: {} };
    }
    if (typeof parsed.totalVisits !== 'number') parsed.totalVisits = Number(parsed.totalVisits) || 0;
    if (typeof parsed.totalHits !== 'number') parsed.totalHits = Number(parsed.totalHits) || 0;
    if (!parsed.visitors || typeof parsed.visitors !== 'object') parsed.visitors = {};
    if (!parsed.daily || typeof parsed.daily !== 'object') parsed.daily = {};
    if (!parsed.dailyHits || typeof parsed.dailyHits !== 'object') parsed.dailyHits = {};
    if (!parsed.ips || typeof parsed.ips !== 'object') parsed.ips = {};
    if (!parsed.paths || typeof parsed.paths !== 'object') parsed.paths = {};
    return parsed;
  } catch (_) {
    return { totalVisits: 0, totalHits: 0, visitors: {}, daily: {}, dailyHits: {}, ips: {}, paths: {} };
  }
}

function writeAnalytics(data) {
  try {
    fs.writeFileSync(ANALYTICS_FILE, JSON.stringify(data, null, 2));
  } catch (e) {
    console.warn('[analytics] write failed:', e && e.message);
  }
}

ensureAnalyticsStore();

// 封装：记录一次页面命中（服务器侧）
function recordHit(ip, p) {
  try {
    const nowIso = new Date().toISOString();
    const day = nowIso.slice(0, 10);
    const data = readAnalytics();
    data.totalHits = (Number(data.totalHits) || 0) + 1;
    data.dailyHits[day] = (Number(data.dailyHits[day]) || 0) + 1;
    if (p) data.paths[p] = (Number(data.paths[p]) || 0) + 1;
    if (ip) data.ips[String(ip)] = (Number(data.ips[String(ip)]) || 0) + 1;
    writeAnalytics(data);
  } catch (_) {}
}

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
    // 服务器侧也记录一次命中，保证即使前端脚本未执行也有计数
    try { recordHit(_req.ip, '/'); } catch(_) {}
    const indexPath = path.join(staticDir, 'index.html');
    res.sendFile(indexPath);
  });
  // 兼容浏览器默认请求 /favicon.ico（优先使用前端内的 16.ico）
  app.get('/favicon.ico', (_req, res) => {
    try {
      const baseDir = STATIC_DIR || path.join(__dirname, '..', 'frontend_backup');
      const candidates = [
        path.join(baseDir, 'src', 'assets', '16.ico'),
        path.join(baseDir, 'favicon.ico')
      ];
      for (const p of candidates) {
        if (fs.existsSync(p)) {
          res.type('image/x-icon');
          return res.sendFile(p);
        }
      }
      // 没有可用图标时不报错，返回 204
      return res.status(204).end();
    } catch (_) {
      return res.status(204).end();
    }
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
  // 前端自动打点脚本
  const code = `(() => {
    try {
      const key = 'qyzz_vid';
      let vid = localStorage.getItem(key);
      if (!vid) {
        vid = Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
        localStorage.setItem(key, vid);
      }

      const dayKey = 'qyzz_ping_' + new Date().toISOString().slice(0, 10);

      // 每次加载都上报 hit
      try {
        fetch('/api/analytics/hit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ vid: vid, path: location.pathname, ts: Date.now() }),
          keepalive: true
        }).catch(() => {});
      } catch (e) {}

      // 每日一次上报 ping（独立访客/日）
      if (!localStorage.getItem(dayKey)) {
        localStorage.setItem(dayKey, '1');
        try {
          fetch('/api/analytics/ping', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ vid: vid, path: location.pathname, ts: Date.now() }),
            keepalive: true
          }).catch(() => {});
        } catch (e) {}
      }
    } catch (e) {}
  })();`;
  res.type('application/javascript').send(code);
});

// 兼容路径：/api/fetch-rewrite.js 也返回同样脚本
app.get('/api/fetch-rewrite.js', (_req, res) => {
  res.redirect(301, '/fetch-rewrite.js');
});

// 访问统计：上报
app.post('/api/analytics/ping', (req, res) => {
  try {
    const { vid, path: p } = req.body || {};
    const nowIso = new Date().toISOString();
    const day = nowIso.slice(0, 10);

    // 兜底 vid：基于 ip + ua 的弱标识（仅在未提供 vid 时）
    const fallbackVid = `${req.ip || '0'}-${(req.headers['user-agent'] || '').slice(0, 60)}`;
    const visitorId = String(vid || fallbackVid);

    const data = readAnalytics();
    data.totalVisits = (Number(data.totalVisits) || 0) + 1;

    if (!data.visitors[visitorId]) {
      data.visitors[visitorId] = { firstSeen: nowIso, lastSeen: nowIso, visits: 1 };
    } else {
      data.visitors[visitorId].lastSeen = nowIso;
      data.visitors[visitorId].visits = (Number(data.visitors[visitorId].visits) || 0) + 1;
    }

    data.daily[day] = (Number(data.daily[day]) || 0) + 1;
    if (p) data.paths[p] = (Number(data.paths[p]) || 0) + 1;

    writeAnalytics(data);
    // 返回汇总（不包含明细）
    const uniqueVisitors = Object.keys(data.visitors).length;
    return res.json({ ok: true, totalVisits: data.totalVisits, uniqueVisitors });
  } catch (e) {
    console.error('[analytics] ping error:', e && e.message);
    return res.json({ ok: false });
  }
});

// 访问统计：每次加载计数（含 IP）
app.post('/api/analytics/hit', (req, res) => {
  try {
    const { vid, path: p } = req.body || {};
    const nowIso = new Date().toISOString();
    const day = nowIso.slice(0, 10);
    const ip = (req.ip || '').toString();

    const data = readAnalytics();
    data.totalHits = (Number(data.totalHits) || 0) + 1;
    data.dailyHits[day] = (Number(data.dailyHits[day]) || 0) + 1;
    if (p) data.paths[p] = (Number(data.paths[p]) || 0) + 1;
    if (ip) data.ips[ip] = (Number(data.ips[ip]) || 0) + 1;

    writeAnalytics(data);
    const uniqueIps = Object.keys(data.ips || {}).length;
    res.json({ ok: true, totalHits: data.totalHits, uniqueIps });
  } catch (e) {
    console.error('[analytics] hit error:', e && e.message);
    return res.json({ ok: false });
  }
});

// 访问统计：汇总（不返回明细，保护隐私）
app.get('/api/analytics/stats', (_req, res) => {
  try {
    const data = readAnalytics();
    const uniqueVisitors = Object.keys(data.visitors || {}).length;
    const uniqueIps = Object.keys(data.ips || {}).length;
    res.json({
      totalVisits: Number(data.totalVisits) || 0,
      totalHits: Number(data.totalHits) || 0,
      uniqueVisitors,
      uniqueIps,
      daily: data.daily || {},
      dailyHits: data.dailyHits || {},
      paths: data.paths || {}
    });
  } catch (e) {
    res.json({ totalVisits: 0, totalHits: 0, uniqueVisitors: 0, uniqueIps: 0, daily: {}, dailyHits: {}, paths: {} });
  }
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


