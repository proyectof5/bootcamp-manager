import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Op } from 'sequelize';
import multer from 'multer';
import xlsx from 'xlsx';
import 'dotenv/config';

// ── Tiny logger: only prints in development, silent in production ─────────────
const IS_DEV = process.env.NODE_ENV !== 'production';
const log = {
  info:  (...a) => IS_DEV && console.log(...a),
  warn:  (...a) => console.warn(...a),      // always show warnings
  error: (...a) => console.error(...a),     // always show errors
  debug: (...a) => IS_DEV && console.log('[debug]', ...a),
};

// SQL Models (Sequelize)
import {
    db,
    Teacher,
    Student,
    Promotion,
    QuickLink,
    Section,
    ExtendedInfo,
    Attendance,
    BootcampTemplate,
    Competence,
    Indicator,
    Tool,
    Area,
    Level,
    Resource,
    CompetenceIndicator,
    CompetenceTool,
    CompetenceArea
} from './backend/models/sql/index.js';
import { sendPasswordEmail, sendReportEmail } from './backend/utils/email.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this';

// External auth base URL — driven by NODE_ENV in .env
// NODE_ENV=development → uses EXTERNAL_AUTH_URL_DEV (local Symfony)
// NODE_ENV=production  → uses EXTERNAL_AUTH_URL_PROD (users.coderf5.es)
const IS_PRODUCTION = process.env.NODE_ENV === 'production';
const EXTERNAL_AUTH_BASE = IS_PRODUCTION
  ? (process.env.EXTERNAL_AUTH_URL_PROD || 'https://users.coderf5.es')
  : (process.env.EXTERNAL_AUTH_URL_DEV  || 'http://localhost:8000');

console.log(`[config] NODE_ENV=${process.env.NODE_ENV || 'development'} → EXTERNAL_AUTH_BASE=${EXTERNAL_AUTH_BASE}`);

// Public key of the external auth server (https://users.coderf5.es) — used to verify RS256 tokens
// Priority: EXTERNAL_JWT_PUBLIC_KEY env var > backend/keys/public.pem file (legacy fallback)
let EXTERNAL_JWT_PUBLIC_KEY = null;
if (process.env.EXTERNAL_JWT_PUBLIC_KEY) {
  // Replace literal \n with actual newlines in case the key is stored as a single line in the env var
  EXTERNAL_JWT_PUBLIC_KEY = process.env.EXTERNAL_JWT_PUBLIC_KEY.replace(/\\n/g, '\n');
  log.debug('[auth] Loaded external JWT public key from EXTERNAL_JWT_PUBLIC_KEY env var');
} else {
  // Legacy fallback: load from file
  try {
    let keyPath = join(__dirname, 'backend', 'keys', 'public.pem');
    try {
      EXTERNAL_JWT_PUBLIC_KEY = readFileSync(keyPath, 'utf8');
    } catch {
      // Try with uppercase Keys folder (Windows case sensitivity issue)
      keyPath = join(__dirname, 'backend', 'Keys', 'public.pem');
      EXTERNAL_JWT_PUBLIC_KEY = readFileSync(keyPath, 'utf8');
    }
    log.debug('[auth] Loaded external JWT public key from file: ' + keyPath);
    console.warn('[auth] Consider setting EXTERNAL_JWT_PUBLIC_KEY as an environment variable instead of using a key file.');
  } catch (e) {
    console.warn('[auth] Could not load public key — external tokens will be rejected:', e.message);
    console.warn('[auth] Set EXTERNAL_JWT_PUBLIC_KEY in your .env file or make sure backend/keys/public.pem exists.');
  }
}

// SQL Database Connection (Sequelize)
db.authenticate()
  .then(async () => {
    log.debug('[db] SQL connection established');
    // Sync all tables (create if not exist, alter to add missing columns)
    await db.sync({ alter: { drop: false } });
    log.debug('[db] All tables synced');
    await initializeDefaultTemplates();
  })
  .catch(err => console.error('[db] SQL connection error:', err));

// Middleware
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept only Excel files
    if (file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
      file.mimetype === 'application/vnd.ms-excel' ||
      file.originalname.match(/\.(xlsx|xls)$/)) {
      cb(null, true);
    } else {
      cb(new Error('Only Excel files are allowed!'), false);
    }
  }
});

// CORS configuration
const allowedOrigins = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:5500',
  'http://localhost:5500',
  'https://alexandrazambrano.github.io',
  'https://roadmap-manager-latest.onrender.com'
];

app.use(cors({
  origin: function (origin, callback) {
    // allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) === -1) {
      var msg = 'The CORS policy for this site does not allow access from the specified Origin.';
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  },
  credentials: true
}));

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok' }));

// Public config endpoint — exposes safe runtime variables to the frontend
// Never put secrets here, only public URLs
app.get('/api/config', (req, res) => {
  res.json({
    externalAuthUrl: EXTERNAL_AUTH_BASE,
    env: IS_PRODUCTION ? 'production' : 'development'
  });
});

// Serve static files from public directory
app.use(express.static(join(__dirname, 'public')));

// Explicit routes for main pages to ensure they're properly served
app.get('/', (req, res) => {
  res.sendFile(join(__dirname, 'public', 'index.html'));
});

app.get('/public-promotion.html', (req, res) => {
  res.sendFile(join(__dirname, 'public', 'public-promotion.html'));
});

app.get('/login.html', (req, res) => {
  res.sendFile(join(__dirname, 'public', 'login.html'));
});

app.get('/dashboard.html', (req, res) => {
  res.sendFile(join(__dirname, 'public', 'dashboard.html'));
});

app.get('/promotion-detail.html', (req, res) => {
  res.sendFile(join(__dirname, 'public', 'promotion-detail.html'));
});

app.get('/admin.html', (req, res) => {
  res.sendFile(join(__dirname, 'public', 'admin.html'));
});

app.get('/student-dashboard.html', (req, res) => {
  res.sendFile(join(__dirname, 'public', 'student-dashboard.html'));
});

app.get('/auth.html', (req, res) => {
  res.sendFile(join(__dirname, 'public', 'auth.html'));
});

// --- Initialization ---

/**
 * Teacher accounts are created exclusively via POST /api/admin/teachers which
 * registers in the external auth system (users.coderf5.es) first.
 * Students are not authenticated in this platform.
 * Local admin accounts have been removed — superadmin access is granted via
 * ROLE_SUPER_ADMIN on the external JWT.
 * No local test accounts are initialised.
 */

/**
 * sqlSave(instance) — wraps Sequelize's .save() and marks all JSON columns as changed.
 * Sequelize does NOT detect mutations to nested JSON objects automatically,
 * so we must call instance.changed('field', true) for every JSON column before saving.
 */
const JSON_COLUMNS = {
    Promotion:       ['modules','employability','ownerModules','collaborators','collaboratorModules','passwordChangeHistory','holidays'],
    Student:         ['progress','projectsAssignments','withdrawal','accessLog','technicalTracking','transversalTracking','extendedInfo'],
    ExtendedInfo:    ['schedule','team','resources','pildoras','modulesPildoras','competences','projectCompetences','projectEvaluations','virtualClassroom','sharedNotes','promotionResources'],
    BootcampTemplate:['modules','resources','employability','competences','schedule','modulesPildoras'],
};
async function sqlSave(instance) {
    const modelName = instance.constructor.name;
    const jsonCols  = JSON_COLUMNS[modelName] || [];
    for (const col of jsonCols) {
        instance.changed(col, true);
    }
    return instance.save();
}

// --- Auth Middleware ---

const verifyToken = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });

  // 1. Try verifying with the external RS256 public key (tokens from users.coderf5.es)
  if (EXTERNAL_JWT_PUBLIC_KEY) {
    try {
      const decoded = jwt.verify(token, EXTERNAL_JWT_PUBLIC_KEY, { algorithms: ['RS256'] });
      // Map external payload to our internal user shape:
      // External: { userId, email, roles: ['ROLE_USER'] }
      // Internal: { id, email, role }
      const roles = decoded.roles || [];
      let role = 'teacher'; // default for external users
      if (roles.includes('ROLE_SUPER_ADMIN') || roles.includes('ROLE_SUPERADMIN')) role = 'superadmin';
      else if (roles.includes('ROLE_ADMIN') && roles.includes('ROLE_USER')) role = 'superadmin'; // ROLE_ADMIN+ROLE_USER → admin button
      else if (roles.includes('ROLE_ADMIN')) role = 'teacher'; // ROLE_ADMIN alone → teacher only
      else if (roles.includes('ROLE_STUDENT')) role = 'student';

      // External token may store email under different field names
      const externalEmail = decoded.email || decoded.sub || decoded.username || decoded.mail || null;

      // Resolve local MongoDB teacher id by email so existing promotion references keep working.
      // The external userId is different from the local UUID stored in Teacher.id / teacherId.
      try {
        if (!externalEmail) throw new Error(`No email field found in token. Token keys: ${JSON.stringify(Object.keys(decoded))}`);

        let localTeacher = await Teacher.findOne({ where: { email: externalEmail.toLowerCase(), deletedAt: null } });
        if (!localTeacher) {
          // Auto-provision: create a minimal teacher record so the user can see/create promotions
          localTeacher = await Teacher.create({
            id: uuidv4(),
            name: decoded.name || decoded.username || externalEmail.split('@')[0],
            email: externalEmail.toLowerCase()
          });
        }
        req.user = {
          id: localTeacher.id, // ← local UUID, matches teacherId / collaborators fields
          email: externalEmail.toLowerCase(),
          role,
          _externalToken: true
        };
      } catch (dbErr) {
        console.error('[verifyToken] DB lookup failed, using external id as fallback:', dbErr.message);
        req.user = {
          id: String(decoded.userId || decoded.sub || decoded.id),
          email: externalEmail || '',
          role,
          _externalToken: true
        };
      }
      return next();
    } catch (err) {
      console.error('[verifyToken] RS256 verification failed:', err.message);
      // Not a valid external token — fall through to internal check
    }
  } else {
    console.warn('[verifyToken] EXTERNAL_JWT_PUBLIC_KEY not loaded, skipping external token verification');
  }

  // 2. Try verifying with our internal HS256 secret (legacy fallback only)
  // No local admin or student accounts exist anymore — all authentication is external.
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch (error) {
    console.error('[verifyToken] Token verification failed - both external RS256 and internal HS256 failed:', error.message);
    res.status(401).json({ error: 'Invalid token' });
  }
};

const canEditPromotion = (promotion, userId) => {
  if (!promotion) return false;
  return promotion.teacherId === userId || (promotion.collaborators && promotion.collaborators.includes(userId));
};

// ==================== EVALUATION API PROXY ====================
// Proxies requests to https://evaluation.coderf5.es/v1/ forwarding the user's JWT token.
// Supported: GET /api/eval/competences, /api/eval/areas, /api/eval/tools,
//            /api/eval/indicators, /api/eval/levels, /api/eval/resources
// Also supports query params and sub-paths (e.g. /api/eval/competences/search?query=x)

const EVAL_API_BASE = 'https://evaluation.coderf5.es/v1';

async function proxyToEvalApi(req, res, evalPath) {
  try {
    const token = req.headers.authorization; // pass through as-is (Bearer <token>)
    const qs = req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '';
    const targetUrl = `${EVAL_API_BASE}${evalPath}${qs}`;

    const fetchOpts = {
      method: req.method,
      headers: { 'Content-Type': 'application/json', Authorization: token || '' }
    };
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      fetchOpts.body = JSON.stringify(req.body);
    }

    const extRes = await fetch(targetUrl, fetchOpts);
    const text = await extRes.text();
    let data;
    try { data = JSON.parse(text); } catch { data = text; }

    // For GET requests that return paginated DRF responses, aggregate all pages and return flat array
    if (req.method === 'GET' && data && !Array.isArray(data) && data.results && data.next) {
      let allResults = [...data.results];
      let nextUrl = data.next;
      while (nextUrl) {
        const nextRes = await fetch(nextUrl, { headers: { Authorization: token || '' } });
        if (!nextRes.ok) break;
        const nextJson = await nextRes.json();
        allResults = allResults.concat(nextJson.results || []);
        nextUrl = nextJson.next || null;
      }
      return res.status(extRes.status).json({ count: data.count, results: allResults, next: null, previous: null });
    }

    res.status(extRes.status).json(data);
  } catch (err) {
    console.error('[eval proxy] Error:', err.message);
    res.status(502).json({ error: 'Evaluation API unreachable', detail: err.message });
  }
}

// Mount eval proxy routes (verifyToken ensures only authenticated users can call them)
app.get('/api/eval/competences*', verifyToken, (req, res) => {
  const sub = req.path.replace('/api/eval/competences', '') || '/';
  proxyToEvalApi(req, res, `/competences${sub === '/' ? '/' : sub}`);
});
app.get('/api/eval/areas*', verifyToken, (req, res) => {
  const sub = req.path.replace('/api/eval/areas', '') || '/';
  proxyToEvalApi(req, res, `/areas${sub === '/' ? '/' : sub}`);
});
app.get('/api/eval/tools*', verifyToken, (req, res) => {
  const sub = req.path.replace('/api/eval/tools', '') || '/';
  proxyToEvalApi(req, res, `/tools${sub === '/' ? '/' : sub}`);
});
app.get('/api/eval/indicators*', verifyToken, (req, res) => {
  const sub = req.path.replace('/api/eval/indicators', '') || '/';
  proxyToEvalApi(req, res, `/indicators${sub === '/' ? '/' : sub}`);
});
app.get('/api/eval/levels*', verifyToken, (req, res) => {
  const sub = req.path.replace('/api/eval/levels', '') || '/';
  proxyToEvalApi(req, res, `/levels${sub === '/' ? '/' : sub}`);
});
app.get('/api/eval/resources*', verifyToken, (req, res) => {
  const sub = req.path.replace('/api/eval/resources', '') || '/';
  proxyToEvalApi(req, res, `/resources${sub === '/' ? '/' : sub}`);
});

// ==================== COMPETENCES CATALOG ====================

// Helper: call evaluation API using the authenticated user's token.
// The token is the RS256 JWT issued by users.coderf5.es — the same one the user
// logged in with. It is valid for evaluation.coderf5.es as both services share
// the same auth provider.
// Supports Django REST pagination — fetches all pages automatically.
async function evalApiGet(path, userToken) {
  if (!userToken) throw new Error('No user token available for eval API call');

  const baseUrl = `${EVAL_API_BASE}${path}`;
  // Add page_size=200 to get all results in one shot (avoids pagination for small catalogs)
  const sep = baseUrl.includes('?') ? '&' : '?';
  const url = `${baseUrl}${sep}page_size=200`;

  log.debug(`[evalApiGet] 🔄 Fetching: ${url}`);
  log.debug(`[evalApiGet] Token (first 20 chars): ${userToken.substring(0, 20)}...`);

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${userToken}`, 'Content-Type': 'application/json' }
  });

  if (!res.ok) {
    const errText = await res.text();
    // Log as info/debug, not error — this is expected when external API is unavailable
    log.debug(`[evalApiGet] ❌ External API ${path} returned ${res.status}`);
    log.debug(`[evalApiGet] Response body: ${errText.substring(0, 500)}`);
    throw new Error(`Eval API ${path} → ${res.status}`);
  }

  const json = await res.json();
  log.debug(`[evalApiGet] ✓ Successfully fetched ${path} from Eval API`);

  // Handle Django REST paginated response: { count, next, results: [] }
  if (!Array.isArray(json) && json.results) {
    let allResults = [...json.results];

    // Fetch remaining pages if any
    let nextUrl = json.next;
    while (nextUrl) {
      const nextRes = await fetch(nextUrl, {
        headers: { Authorization: `Bearer ${userToken}`, 'Content-Type': 'application/json' }
      });
      if (!nextRes.ok) break;
      const nextJson = await nextRes.json();
      allResults = allResults.concat(nextJson.results || []);
      nextUrl = nextJson.next || null;
    }

    return allResults;
  }

  // Plain array response
  const rows = Array.isArray(json) ? json : [];
  return rows;
}

// Normalise a raw competence object from the external Eval API into the internal shape
// expected by program-competences.js / promotion-detail.js.
//
// Real API shape (evaluation.coderf5.es/v1/competences/):
// {
//   id, name, description,
//   area: ["Fullstack", "IA", ...],          ← array of strings, NOT objects
//   tools: [{
//     id, name, description,
//     indicators: [{id, name, description, levelId}],  ← levelId is a number
//     referents: [...],
//     resources: [...]
//   }]
// }
//
// Internal shape expected by frontend:
// {
//   id, name, description,
//   areas: [{id, name, icon}],               ← built from area strings
//   tools: [{id, name, description}],
//   levels: [{levelId, levelName, levelDescription, indicators:[{id, name, description}]}],
//   indicators: { initial: [...], medio: [...], advance: [...] }  ← competence indicators by level
// }
function normaliseEvalCompetence(comp) {
  // area is an array of strings in the real API
  const areaStrings = Array.isArray(comp.area) ? comp.area : [];
  const areas = areaStrings.map((name, idx) => ({ id: idx + 1, name, icon: '' }));

  // tools array — extract tool objects with their indicators (for tool-based evaluation)
  const toolsRaw = comp.tools || [];
  log.debug('❌❌😉😉💜💜💜📌📌  toolsRaw:', toolsRaw);
  const tools = toolsRaw.map(t => ({ id: t.id, name: t.name, description: t.description, indicators: t.indicators, referents: t.referents, resources: t.resources|| '' }));

  // Build levels by collecting indicators from ALL tools and grouping by levelId
  // Each tool has its own indicators with a numeric levelId field
  const levelMap = {};
  toolsRaw.forEach(tool => {
    (tool.indicators || []).forEach(ind => {
      const lvlId = ind.levelId ?? ind.level_id ?? ind.level ?? 0;
      const lvlName = lvlId === 1 ? 'Inicial' : lvlId === 2 ? 'Medio' : lvlId === 3 ? 'Avanzado' : `Nivel ${lvlId}`;
      if (!levelMap[lvlId]) {
        levelMap[lvlId] = { levelId: lvlId, levelName: lvlName, levelDescription: '', indicators: [] };
      }
      // Avoid duplicate indicators (same indicator may appear in multiple tools)
      const alreadyAdded = levelMap[lvlId].indicators.some(i => i.id === ind.id);
      if (!alreadyAdded) {
        levelMap[lvlId].indicators.push({
          id: ind.id,
          name: ind.name,
          description: ind.description || '',
          toolName: tool.name  // track which tool this indicator belongs to
        });
      }
    });
  });
  const levels = Object.values(levelMap).sort((a, b) => a.levelId - b.levelId);

  // Extract competence indicators grouped by level (initial/medio/advance)
  // These come directly from comp.indicators and are used to determine competence level
  const competenceIndicators = {
    initial: (comp.indicators?.initial || []).map(ind => ({
      id: ind.id,
      name: ind.name || '',
      description: ind.description || ''
    })),
    medio: (comp.indicators?.medio || []).map(ind => ({
      id: ind.id,
      name: ind.name || '',
      description: ind.description || ''
    })),
    advance: (comp.indicators?.advance || []).map(ind => ({
      id: ind.id,
      name: ind.name || '',
      description: ind.description || ''
    }))
  };

  return {
    id: comp.id,
    name: comp.name,
    description: comp.description || '',
    areas,          // [{id, name, icon}] built from area string array
    areaNames: areaStrings,  // keep original string array for easy filtering
    tools,          // [{id, name, description}]
    levels,         // [{levelId, levelName, levelDescription, indicators:[...]}]
    indicators: competenceIndicators  // {initial: [...], medio: [...], advance: [...]} for competence level assessment
  };
}

// GET /api/areas — tries external evaluation API first, falls back to local DB
app.get('/api/areas', verifyToken, async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    try {
      const rows = await evalApiGet('/areas/', token);
      log.debug('[GET /api/areas] ✓ Fetched from external API:', rows.length, 'areas');
      return res.json(rows);
    } catch (evalErr) {
      log.debug('[GET /api/areas] Using local DB fallback (external API unavailable)');
    }
    // Fallback to local database
    const areas = await Area.findAll({ order: [["id","ASC"]] });
    log.debug('[GET /api/areas] ✓ Fallback returned', areas.length, 'areas from local DB');
    res.json(areas);
  } catch (error) {
    console.error('[GET /api/areas] Server error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/tools — tries external evaluation API first, falls back to local DB
app.get('/api/tools', verifyToken, async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    try {
      const rows = await evalApiGet('/tools/', token);
      log.debug('[GET /api/tools] ✓ Fetched from external API:', rows.length, 'tools');
      return res.json(rows);
    } catch (evalErr) {
      log.debug('[GET /api/tools] Using local DB fallback (external API unavailable)');
    }
    const tools = await Tool.findAll({ order: [["id","ASC"]] });
    log.debug('[GET /api/tools] ✓ Fallback returned', tools.length, 'tools from local DB');
    res.json(tools);
  } catch (error) {
    console.error('[GET /api/tools] Server error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/indicators — tries external evaluation API first, falls back to local DB
app.get('/api/indicators', verifyToken, async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    try {
      const rows = await evalApiGet('/indicators/', token);
      log.debug('[GET /api/indicators] ✓ Fetched from external API:', rows.length, 'indicators');
      return res.json(rows);
    } catch (evalErr) {
      log.debug('[GET /api/indicators] Using local DB fallback (external API unavailable)');
    }
    const indicators = await Indicator.findAll();
    log.debug('[GET /api/indicators] ✓ Fallback returned', indicators.length, 'indicators from local DB');
    res.json(indicators);
  } catch (error) {
    console.error('[GET /api/indicators] Server error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/levels — tries external evaluation API first, falls back to local DB
app.get('/api/levels', verifyToken, async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    try {
      const rows = await evalApiGet('/levels/', token);
      log.debug('[GET /api/levels] ✓ Fetched from external API:', rows.length, 'levels');
      return res.json(rows);
    } catch (evalErr) {
      log.debug('[GET /api/levels] Using local DB fallback (external API unavailable)');
    }
    const levels = await Level.findAll();
    log.debug('[GET /api/levels] ✓ Fallback returned', levels.length, 'levels from local DB');
    res.json(levels);
  } catch (error) {
    console.error('[GET /api/levels] Server error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/resources — tries external evaluation API first, falls back to local DB
app.get('/api/resources', verifyToken, async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    try {
      const rows = await evalApiGet('/resources/', token);
      log.debug('[GET /api/resources] ✓ Fetched from external API:', rows.length, 'resources');
      return res.json(rows);
    } catch (evalErr) {
      log.debug('[GET /api/resources] Using local DB fallback (external API unavailable)');
    }
    const resources = await Resource.findAll();
    log.debug('[GET /api/resources] ✓ Fallback returned', resources.length, 'resources from local DB');
    res.json(resources);
  } catch (error) {
    console.error('[GET /api/resources] Server error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/competences — tries external evaluation API first (normalised), falls back to local DB
app.get('/api/competences', verifyToken, async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    try {
      log.debug('[GET /api/competences] 🔄 Attempting to fetch from external API: https://evaluation.coderf5.es/v1/competences/');
      const rows = await evalApiGet('/competences/', token);
      log.debug('[GET /api/competences] ✓ Successfully fetched', rows, 'raw competences from external API');
      const normalised = rows.map(normaliseEvalCompetence);
      log.debug('❌❌😉😉💜💜💜📌📌[GET /api/competences] ✓ Normalised data includes:', normalised[0].tools, 'competences with areas, tools, indicators');
      if (normalised.length > 0) {
        log.debug('[GET /api/competences] ✓ Sample competence structure:', JSON.stringify({ id: normalised[0].id, name: normalised[0].name, areas: normalised[0].areas.slice(0, 1), tools: normalised[0].tools.slice(0, 1), indicators: normalised[0].indicators }, null, 2));
      }
      return res.json(normalised);
    } catch (evalErr) {
      console.log('[GET /api/competences] ⚠️ External API unavailable, using local DB fallback. Error:', evalErr.message);
    }

    // ── Local DB fallback (full enrichment) ──────────────────────────────────
    const [
      competences, indicators, tools, areas, levels,
      compIndicators, compTools, compAreas
    ] = await Promise.all([
      Competence.findAll({ order: [["id","ASC"]] }),
      Indicator.findAll(),
      Tool.findAll(),
      Area.findAll(),
      Level.findAll(),
      CompetenceIndicator.findAll(),
      CompetenceTool.findAll(),
      CompetenceArea.findAll()
    ]);

    log.debug('[GET /api/competences] Local DB fallback:', competences.length, 'competences');

    const indicatorMap = Object.fromEntries(indicators.map(i => [i.id, i]));
    const toolMap      = Object.fromEntries(tools.map(t => [t.id, t]));
    const areaMap      = Object.fromEntries(areas.map(a => [a.id, a]));
    const levelMap     = Object.fromEntries(levels.map(l => [l.id, l]));

    const indsByComp  = {};
    compIndicators.forEach(ci => { (indsByComp[ci.id_competence] ??= []).push(ci.id_indicator); });
    const toolsByComp = {};
    compTools.forEach(ct => { (toolsByComp[ct.id_competence] ??= []).push(ct.id_tool); });
    const areasByComp = {};
    compAreas.forEach(ca => { (areasByComp[ca.id_competence] ??= []).push(ca.id_area); });

    const enriched = competences.map(comp => {
      const compAreasList = (areasByComp[comp.id] || [])
        .map(aId => areaMap[aId]).filter(Boolean)
        .map(a => ({ id: a.id, name: a.name, icon: a.icon }));

      const rawIndicators = (indsByComp[comp.id] || []).map(iId => indicatorMap[iId]).filter(Boolean);
      const indicatorsByLevel = {};
      rawIndicators.forEach(ind => {
        const lvl = ind.levelId || 0;
        if (!indicatorsByLevel[lvl]) {
          indicatorsByLevel[lvl] = { levelId: lvl, levelName: levelMap[lvl]?.name || `Nivel ${lvl}`, levelDescription: levelMap[lvl]?.description || '', indicators: [] };
        }
        indicatorsByLevel[lvl].indicators.push({ id: ind.id, name: ind.name, description: ind.description });
      });
      const levels_grouped = Object.values(indicatorsByLevel).sort((a, b) => a.levelId - b.levelId);

      const compToolsList = (toolsByComp[comp.id] || [])
        .map(tId => toolMap[tId]).filter(Boolean)
        .map(t => ({ id: t.id, name: t.name, description: t.description }));

      return { id: comp.id, name: comp.name, description: comp.description, areas: compAreasList, levels: levels_grouped, tools: compToolsList };
    });

    log.debug(`[GET /api/competences] Returning ${enriched.length} competences from local DB fallback`);
    res.json(enriched);
  } catch (error) {
    console.error('[GET /api/competences] Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ==================== PROMOTION PASSWORD ACCESS ====================

// Get promotion access password (teacher only)
app.get('/api/promotions/:promotionId/access-password', verifyToken, async (req, res) => {
  try {
    const promotion = await Promotion.findOne({ where: { id: req.params.promotionId } });
    if (!promotion) return res.status(404).json({ error: 'Promotion not found' });
    if (!canEditPromotion(promotion, req.user.id)) return res.status(403).json({ error: 'Unauthorized' });

    log.debug('[GET access-password] Promotion found:', promotion.id, 'Password:', promotion.accessPassword);
    res.json({ accessPassword: promotion.accessPassword || null });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Verify promotion access password (public, no authentication required)
app.post('/api/promotions/:promotionId/verify-password', async (req, res) => {
  try {
    const { password } = req.body;
    if (!password) return res.status(400).json({ error: 'Password is required' });

    const promotion = await Promotion.findOne({ where: { id: req.params.promotionId } });
    if (!promotion) return res.status(404).json({ error: 'Promotion not found' });

    if (promotion.accessPassword !== password) {
      return res.status(401).json({ error: 'Invalid password' });
    }

    // Create a session token (valid only for this promotion access)
    const accessToken = jwt.sign(
      { promotionId: req.params.promotionId, accessType: 'promotion-guest' },
      JWT_SECRET,
      { expiresIn: '8h' }
    );

    res.json({ message: 'Password verified', accessToken, promotion: { id: promotion.id, name: promotion.name } });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Set or change promotion access password (teacher only)
app.post('/api/promotions/:promotionId/access-password', verifyToken, async (req, res) => {
  try {
    const { password } = req.body;
    if (!password) return res.status(400).json({ error: 'Password is required' });

    const promotion = await Promotion.findOne({ where: { id: req.params.promotionId } });
    if (!promotion) return res.status(404).json({ error: 'Promotion not found' });
    if (!canEditPromotion(promotion, req.user.id)) return res.status(403).json({ error: 'Unauthorized' });

    // Store old password in history
    if (promotion.accessPassword) {
      if (!promotion.passwordChangeHistory) promotion.passwordChangeHistory = [];
      promotion.passwordChangeHistory.push({
        oldPassword: promotion.accessPassword,
        newPassword: password,
        changedAt: new Date()
      });
    }

    promotion.accessPassword = password;
    await sqlSave(promotion);

    res.json({ message: 'Access password updated', accessPassword: password });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Remove promotion access password (teacher only)
app.delete('/api/promotions/:promotionId/access-password', verifyToken, async (req, res) => {
  try {
    const promotion = await Promotion.findOne({ where: { id: req.params.promotionId } });
    if (!promotion) return res.status(404).json({ error: 'Promotion not found' });
    if (!canEditPromotion(promotion, req.user.id)) return res.status(403).json({ error: 'Unauthorized' });

    // Store in history before removing
    if (promotion.accessPassword) {
      if (!promotion.passwordChangeHistory) promotion.passwordChangeHistory = [];
      promotion.passwordChangeHistory.push({
        oldPassword: promotion.accessPassword,
        newPassword: null,
        changedAt: new Date()
      });
    }

    promotion.accessPassword = undefined;
    await sqlSave(promotion);

    res.json({ message: 'Access password removed' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== TEACHING CONTENT ENDPOINTS ====================

// Get teaching content URL (teacher only)
app.get('/api/promotions/:promotionId/teaching-content', verifyToken, async (req, res) => {
  try {
    const promotion = await Promotion.findOne({ where: { id: req.params.promotionId } });
    if (!promotion) return res.status(404).json({ error: 'Promotion not found' });
    if (!canEditPromotion(promotion, req.user.id)) return res.status(403).json({ error: 'Unauthorized' });

    res.json({ teachingContentUrl: promotion.teachingContentUrl || null });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Set teaching content URL (teacher only)
app.post('/api/promotions/:promotionId/teaching-content', verifyToken, async (req, res) => {
  try {
    const { teachingContentUrl } = req.body;
    if (!teachingContentUrl) return res.status(400).json({ error: 'Teaching content URL is required' });

    const promotion = await Promotion.findOne({ where: { id: req.params.promotionId } });
    if (!promotion) return res.status(404).json({ error: 'Promotion not found' });
    if (!canEditPromotion(promotion, req.user.id)) return res.status(403).json({ error: 'Unauthorized' });

    promotion.teachingContentUrl = teachingContentUrl;
    await sqlSave(promotion);

    res.json({ message: 'Teaching content URL updated', teachingContentUrl });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Remove teaching content URL (teacher only)
app.delete('/api/promotions/:promotionId/teaching-content', verifyToken, async (req, res) => {
  try {
    const promotion = await Promotion.findOne({ where: { id: req.params.promotionId } });
    if (!promotion) return res.status(404).json({ error: 'Promotion not found' });
    if (!canEditPromotion(promotion, req.user.id)) return res.status(403).json({ error: 'Unauthorized' });

    promotion.teachingContentUrl = undefined;
    await sqlSave(promotion);

    res.json({ message: 'Teaching content URL removed' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== ASANA WORKSPACE ACCESS ====================
// Configuration for Asana workspace link (follows same pattern as Teaching Content)

// Get Asana workspace URL for this promotion
app.get('/api/promotions/:promotionId/asana-workspace', verifyToken, async (req, res) => {
  try {
    const promotion = await Promotion.findOne({ where: { id: req.params.promotionId } });
    if (!promotion) return res.status(404).json({ error: 'Promotion not found' });
    if (!canEditPromotion(promotion, req.user.id)) return res.status(403).json({ error: 'Unauthorized' });

    res.json({ asanaWorkspaceUrl: promotion.asanaWorkspaceUrl || null });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Set Asana workspace URL (teacher only)
app.post('/api/promotions/:promotionId/asana-workspace', verifyToken, async (req, res) => {
  try {
    const { asanaWorkspaceUrl } = req.body;
    if (!asanaWorkspaceUrl) return res.status(400).json({ error: 'Asana workspace URL is required' });

    const promotion = await Promotion.findOne({ where: { id: req.params.promotionId } });
    if (!promotion) return res.status(404).json({ error: 'Promotion not found' });
    if (!canEditPromotion(promotion, req.user.id)) return res.status(403).json({ error: 'Unauthorized' });

    promotion.asanaWorkspaceUrl = asanaWorkspaceUrl;
    await sqlSave(promotion);

    res.json({ message: 'Asana workspace URL updated', asanaWorkspaceUrl });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Remove Asana workspace URL (teacher only)
app.delete('/api/promotions/:promotionId/asana-workspace', verifyToken, async (req, res) => {
  try {
    const promotion = await Promotion.findOne({ where: { id: req.params.promotionId } });
    if (!promotion) return res.status(404).json({ error: 'Promotion not found' });
    if (!canEditPromotion(promotion, req.user.id)) return res.status(403).json({ error: 'Unauthorized' });

    promotion.asanaWorkspaceUrl = undefined;
    await sqlSave(promotion);

    res.json({ message: 'Asana workspace URL removed' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== BOOTCAMP TEMPLATES ====================

// Initialize default templates if they don't exist
async function initializeDefaultTemplates() {
  const defaultTemplates = [
    {
      id: 'ia-bootcamp',
      name: 'IA School Bootcamp',
      description: 'Inteligencia Artificial y Machine Learning — bootcamp completo de 36 semanas',
      weeks: 36,
      hours: 1250,
      hoursPerWeek: Math.round(1250 / 36),
      isCustom: false,
      // ── Acta de Inicio ─────────────────────────────────────────────────────
      school: 'Madrid',
      projectType: 'Bootcamp',
      totalHours: '1.250 horas',
      modality: 'Híbrido (Presencial + Online)',
      materials: 'No son necesarios recursos adicionales.',
      internships: false,
      funders: 'SAGE.\nJP Morgan.\nEn colaboración con Microsoft y Somos F5.',
      funderDeadlines: '',
      okrKpis: 'PIPO3.R1 Satisfacción 4,2/5 de coders sobre la excelencia del equipo formativo de la formación\nISEC2.R1 Jornadas de selección con un 40% de personas participantes con el proceso 100% finalizado.\nISEC3.R2 Resultado 78% salida positiva.\nISECR2 Finalizar cada programa con un máximo de bajas de 10%.',
      funderKpis: 'SAGE.: 50% mujeres\n30% jóvenes menores de 30 años\n15% inmigrantes o refugiados\n5% personas con discapacidad.',
      projectMeetings: 'Ver el calendario de reuniones en Asana.',
      teamMeetings: 'Semanal - jueves (14:30-15:00)',
      trainerDayOff: '',
      cotrainerDayOff: '',
      // ── Schedule ───────────────────────────────────────────────────────────
      schedule: {
        online: {
          entry: '08:15',
          start: '08:25',
          break: '11:00',
          lunch: 'No tomamos almuerzo',
          finish: '15:45'
        },
        presential: {
          entry: '09:59',
          start: '09:25',
          break: '11:00',
          lunch: '13:30',
          finish: '16:30'
        },
        notes: ''
      },
      // ── Evaluation ─────────────────────────────────────────────────────────
      evaluation: `Evaluación del Proyecto\n\nSe brindará retroalimentación oral el mismo día de la presentación del proyecto, mientras que la autoevaluación (en proyectos individuales) y evaluación grupal (en proyectos grupales) se realizará al día siguiente y posteriormente, el equipo formativo compartirá las impresiones finales. Todo ello deberá almacenarse en Google Classroom.\n\nSe tendrán en cuenta los siguientes aspectos:\n\n• Análisis de los commits realizados por los coders, valorando tanto la cantidad como la calidad\n• Participación individual en la presentación del proyecto\n• Capacidad de responder preguntas específicas de manera clara y fundamentada\n• Desarrollo y demostración de las competencias adquiridas durante el proyecto\n\nEvaluación de las Píldoras\n\nLas píldoras se asignarán la primera semana, se apuntarán en el calendario y se valorarán los siguientes aspectos:\n• Que tenga un poco de inglés (hablado, no solo en la presentación)\n• Que tenga parte teórica y parte práctica. Énfasis en la práctica\n• Tiempo mínimo 1 hora\n• Crear un repositorio en Github y/o publicar un artículo en Medium\n\nEvaluación Global al Final del Bootcamp\n\n• Valoración de los proyectos entregados\n• Valoración de los cursos realizados\n• Valoración de las píldoras realizadas\n• Valoración de competencias transversales`,
      // ── Resources ──────────────────────────────────────────────────────────
      resources: [
        { title: 'CodigoMaquina', category: 'Youtube', url: 'https://www.youtube.com/@CodigoMaquina' },
        { title: '3blue1brown', category: 'Youtube', url: 'https://www.youtube.com/c/3blue1brown' },
        { title: 'Practical AI', category: 'Podcast', url: 'https://practicalai.fm/' },
        { title: '180 proyectos de data science y machine learning con python', category: 'Technical', url: 'https://noeliagorod.com/2022/02/09/180-proyectos-de-data-science-y-machine-learning-con-python-2/' },
        { title: 'Khan Academy', category: 'Technical', url: 'https://www.khanacademy.org/' }
      ],
      // ── Employability ──────────────────────────────────────────────────────
      employability: [
        { name: 'Sesión 1: Introducción a la búsqueda de trabajo', url: '', startMonth: 2, duration: 1 },
        { name: 'Sesión 2: Introducción a LinkedIn', url: '', startMonth: 3, duration: 1 },
        { name: 'Sesión 3: Autoconocimiento (DAFO/Elevator/Objetivo profesional)', url: '', startMonth: 4, duration: 1 },
        { name: 'Sesión 4: Autoconocimiento (Perfil profesional)', url: '', startMonth: 5, duration: 1 }
      ],
      // ── Modules (Roadmap) ──────────────────────────────────────────────────
      modules: [
        {
          name: 'Bases del desarrollo web',
          duration: 7,
          courses: [
            { name: 'Python Essentials - Cisco', url: 'https://www.netacad.com/courses/python-essentials-1?courseLang=en-US', duration: 7, startOffset: 0 }
          ],
          projects: [
            { name: 'App con Python', url: '', duration: 2, startOffset: 0 },
            { name: 'CRUD con Python', url: '', duration: 3, startOffset: 2 },
            { name: 'Web Scraping', url: '', duration: 2, startOffset: 5 }
          ]
        },
        {
          name: 'Machine Learning',
          duration: 8,
          courses: [
            { name: 'Data Science Fundamentals - Saturdays AI', url: 'https://ti.to/saturdaysai/data-science-fundamentals/', duration: 8, startOffset: 0 }
          ],
          projects: [
            { name: 'Exploratory Data Analisys', url: '', duration: 1, startOffset: 0 },
            { name: 'Problema de Regresión', url: '', duration: 2, startOffset: 1 },
            { name: 'Problema de clasificación', url: '', duration: 2, startOffset: 3 },
            { name: 'Problema de clasificación multiclase con Modelos Ensemble', url: '', duration: 2, startOffset: 5 },
            { name: 'Aprendizaje no supervizado', url: '', duration: 1, startOffset: 7 }
          ]
        },
        {
          name: 'Deep Learning',
          duration: 17,
          courses: [
            { name: 'Ingeniero Asociado de IA de Azure', url: 'https://learn.microsoft.com/es-es/credentials/certifications/azure-ai-engineer/?practice-assessment-type=certification', duration: 13, startOffset: 0 }
          ],
          projects: [
            { name: 'Tiempo Flexible', url: '', duration: 4, startOffset: 0 },
            { name: 'Tracks: Data Engineer (Spark, Redis, Kafka, etc.), Data Analyst (Power BI, Tableau, Dash, etc.), AI Developer (Keras, MLops, etc.)', url: '', duration: 4, startOffset: 4 },
            { name: 'Natural Language Procesing', url: '', duration: 3, startOffset: 8 },
            { name: 'LLM (Rag + agentes)', url: '', duration: 3, startOffset: 11 },
            { name: 'Computer Vision', url: '', duration: 3, startOffset: 14 }
          ]
        },
        {
          name: 'Proyectos finales',
          duration: 4,
          courses: [],
          projects: []
        }
      ],
      // ── Competences ────────────────────────────────────────────────────────
      competences: [
        {
          id: '1',
          area: 'web',
          name: 'DEMO: Configurar el entorno de trabajo',
          description: 'Montar y mantener un entorno de desarrollo completo, incluyendo herramientas, frameworks y sistemas de control de versiones.',
          levels: [
            {
              level: 1,
              description: 'initial',
              indicators: [
                'Organiza directorios de proyecto',
                'Busca información técnica',
                'Consulta documentación en inglés',
                'Instala aplicaciones y extensiones'
              ]
            },
            {
              level: 2,
              description: 'medio',
              indicators: [
                'Usa líneas de comandos básicas',
                'Declara funciones y variables en el entorno',
                'Integra control de versiones'
              ]
            },
            {
              level: 3,
              description: 'advance',
              indicators: [
                'Establece un flujo de trabajo profesional',
                'Utiliza herramientas de contenización',
                'Automatiza el entorno con scripts'
              ]
            }
          ],
          allTools: ['Docker', 'Git', 'GitHub', 'IDE', 'Terminal (CLI)', 'devcontainer'],
          selectedTools: ['Docker', 'Git', 'GitHub', 'IDE', 'Terminal (CLI)'],
          startModule: { id: '', name: 'Bases del desarrollo web' }
        }
      ],
      // ── Píldoras por módulo ────────────────────────────────────────────────
      modulesPildoras: [
        {
          moduleName: 'Bases del desarrollo web',
          pildoras: [
            { title: 'Píldora: Clean code', mode: 'Virtual' },
            { title: 'Píldora: Streamlit', mode: 'Presencial' },
            { title: 'Píldora: Hilos en python', mode: 'Presencial' },
            { title: 'Píldora: Protocolos de comunicación (http, IP)', mode: 'Virtual' },
            { title: 'Píldora: API Rest y CRUD', mode: 'Virtual' },
            { title: 'Píldora: Fastapi', mode: 'Virtual' },
            { title: 'Píldora: Django', mode: 'Presencial' },
            { title: 'Píldora: Bases de datos relacionales', mode: 'Presencial' },
            { title: 'Píldora: Bases de datos no relacionales', mode: 'Virtual' },
            { title: 'Píldora: Test de unitarios y de integración', mode: 'Virtual' },
            { title: 'Píldora: TDD con Python', mode: 'Virtual' },
            { title: 'Píldora: Versionado de APIs y gestión de endpoints', mode: 'Virtual' },
            { title: 'Píldora: Docker (Contenedores, imágenes y volúmenes)', mode: 'Presencial' },
            { title: 'Píldora: SOLID', mode: 'Presencial' },
            { title: 'Píldora: Docker compose y microservicios', mode: 'Virtual' },
            { title: 'Píldora: HTML & JS', mode: 'Virtual' },
            { title: 'Píldora: Beautifulsoup', mode: 'Virtual' },
            { title: 'Píldora: Scrapy', mode: 'Presencial' },
            { title: 'Píldora: Selenium', mode: 'Presencial' },
            { title: 'Píldora: Cronjob', mode: 'Virtual' },
            { title: 'Píldora: Creación de Macros para la documentación de un proyecto', mode: 'Virtual' },
            { title: 'Píldora Crea una documentación atractiva en github', mode: 'Virtual' },
            { title: 'Píldora: Temas legales y seguridad IT', mode: 'Presencial' }
          ]
        },
        {
          moduleName: 'Machine Learning',
          pildoras: [
            { title: 'Gestores de paquetes (uv, pipenv, poetry)', mode: 'Virtual' },
            { title: 'Data cleaning con Python', mode: 'Virtual' },
            { title: 'Story telling con Datos', mode: 'Virtual' },
            { title: 'Etapas de Un proyecto de Machine Learning', mode: 'Presencial' },
            { title: 'ML Supervisado: Algoritmos de Regresión', mode: 'Presencial' },
            { title: 'Evaluación de modelos y métricas de rendimiento', mode: 'Presencial' },
            { title: 'División de datos: entrenamiento, validación y prueba', mode: 'Virtual' },
            { title: 'Overfitting, Underfitting y técnicas de regularización', mode: 'Virtual' },
            { title: 'Pipeline básico de Machine Learning y uso de pickle (conexión de un  modelo de ML con tu aplicación web)', mode: 'Presencial' },
            { title: 'ML Supervisado: Algoritmos de Clasificación', mode: 'Virtual' },
            { title: 'Ingenieria de Caracteristicas', mode: 'Virtual' },
            { title: 'Manejo de datos desbalanceados en clasificación', mode: 'Presencial' },
            { title: 'Modelos Ensemble', mode: 'Virtual' },
            { title: 'Selección de modelos y comparación de algoritmos', mode: 'Presencial' },
            { title: 'Reducción de la Dimensionalidad', mode: 'Presencial' },
            { title: 'ML No Supervisado: Algoritmos Clustering', mode: 'Presencial' },
            { title: 'Detección de data leakage en proyectos de Machine Learning', mode: 'Virtual' },
            { title: 'Herramientas de Business Intelligence (Power BI, Tableau, etc.)', mode: 'Virtual' },
            { title: 'ETLs, Extracción, transformación y carga de datos para procesos de ML', mode: 'Presencial' },
            { title: 'Analisis de Series temporales', mode: 'Virtual' }
          ]
        },
        {
          moduleName: 'Deep Learning',
          pildoras: []
        },
        {
          moduleName: 'Proyectos finales',
          pildoras: []
        }
      ]
    },
    {
      id: 'fullstack-bootcamp',
      name: 'Full Stack Bootcamp',
      description: 'Full stack web development bootcamp',
      weeks: 24,
      hours: 320,
      hoursPerWeek: 35,
      isCustom: false,
      modules: []
    },
    {
      id: 'cybersecurity-bootcamp',
      name: 'Cyber Security Bootcamp',
      description: 'Cyber Security and Ethical Hacking bootcamp',
      weeks: 20,
      hours: 280,
      hoursPerWeek: 35,
      isCustom: false,
      modules: []
    },
    {
      id: 'datascience-bootcamp',
      name: 'Data Science Bootcamp',
      description: 'Data Science and Analytics bootcamp',
      weeks: 30,
      hours: 420,
      hoursPerWeek: 35,
      isCustom: false,
      modules: []
    },
    {
      id: 'frontend-bootcamp',
      name: 'Frontend Bootcamp',
      description: 'Frontend development with React, Vue, or Angular',
      weeks: 16,
      hours: 224,
      hoursPerWeek: 35,
      isCustom: false,
      modules: []
    },
    {
      id: 'backend-bootcamp',
      name: 'Backend Bootcamp',
      description: 'Backend development with Node.js, Python, or Java',
      weeks: 20,
      hours: 280,
      hoursPerWeek: 35,
      isCustom: false,
      modules: []
    }
  ];

  for (const template of defaultTemplates) {
    await BootcampTemplate.upsert({
      id:              template.id,
      name:            template.name,
      description:     template.description || '',
      type:            template.type || 'bootcamp',
      language:        template.language || 'es',
      modules:         template.modules || [],
      resources:       template.resources || [],
      employability:   template.employability || [],
      competences:     template.competences || [],
      schedule:        template.schedule || {},
      modulesPildoras: template.modulesPildoras || [],
      isDefault:       true,
    });
  }
}

// Get all templates (system + custom)
app.get('/api/bootcamp-templates', verifyToken, async (req, res) => {
  try {
    const templates = await BootcampTemplate.findAll();
    res.json(templates);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create custom template
app.post('/api/bootcamp-templates', verifyToken, async (req, res) => {
  try {
    const { name, description, type, language, modules, schedule, resources, employability, competences, modulesPildoras } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }

    const template = await BootcampTemplate.create({
      id:              `custom-${uuidv4()}`,
      name,
      description:     description || '',
      type:            type || 'bootcamp',
      language:        language || 'es',
      modules:         modules || [],
      schedule:        schedule || {},
      resources:       resources || [],
      employability:   employability || [],
      competences:     competences || [],
      modulesPildoras: modulesPildoras || [],
      isDefault:       false,
    });

    res.status(201).json(template);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get template by ID
app.get('/api/bootcamp-templates/:templateId', verifyToken, async (req, res) => {
  try {
    const template = await BootcampTemplate.findOne({ where: { id: req.params.templateId } });
    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }
    res.json(template);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete custom template
app.delete('/api/bootcamp-templates/:templateId', verifyToken, async (req, res) => {
  try {
    const template = await BootcampTemplate.findOne({ where: { id: req.params.templateId } });

    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }

    const isAdmin = req.user.role === 'superadmin';

    if (!template.isCustom && !isAdmin) {
      return res.status(403).json({ error: 'Cannot delete system templates' });
    }

    if (!isAdmin && template.createdBy !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    await BootcampTemplate.destroy({ where: { id: req.params.templateId } });
    res.json({ message: 'Template deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update custom template
app.put('/api/bootcamp-templates/:templateId', verifyToken, async (req, res) => {
  try {
    const template = await BootcampTemplate.findOne({ where: { id: req.params.templateId } });

    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }

    const isAdmin = req.user.role === 'superadmin';

    if (!template.isCustom && !isAdmin) {
      return res.status(403).json({ error: 'Cannot edit system templates' });
    }

    if (!isAdmin && template.createdBy !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const { name, description, type, language, modules, resources, employability,
            competences, schedule, modulesPildoras } = req.body;

    if (name !== undefined) template.name = name;
    if (description !== undefined) template.description = description;
    if (type !== undefined) template.type = type;
    if (language !== undefined) template.language = language;
    if (modules !== undefined) template.modules = modules;
    if (resources !== undefined) template.resources = resources;
    if (employability !== undefined) template.employability = employability;
    if (competences !== undefined) template.competences = competences;
    if (schedule !== undefined) template.schedule = schedule;
    if (modulesPildoras !== undefined) template.modulesPildoras = modulesPildoras;
    await sqlSave(template);
    const updated = template;

    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== AUTHENTICATION ====================

// Proxy to external auth API — avoids CORS issues when called from the browser
app.post('/api/auth/external-login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });

    const extRes = await fetch(`${EXTERNAL_AUTH_BASE}/infouser`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    // Read as text first — Symfony may return an HTML debug page instead of JSON
    // (e.g. when APP_DEBUG=true and a dump() call is present in the controller)
    const rawText = await extRes.text();
    let extData = {};
    try {
      extData = JSON.parse(rawText);
    } catch {
      // Response was not JSON (HTML debug page, plain text error, etc.)
      console.error('[external-login proxy] Symfony returned non-JSON response. First 200 chars:', rawText.substring(0, 200));
      return res.status(502).json({ error: 'Auth server returned an unexpected response. Check Symfony logs (remove any dump() calls).' });
    }

    if (extData.data?.token) {
      // Decode without verify just to log the roles
      const payload = JSON.parse(Buffer.from(extData.data.token.split('.')[1], 'base64').toString());
    }

    if (extRes.ok && extData.success && extData.data?.token) {
      return res.json({ success: true, data: extData.data });
    }

    // External API returned a failure — pass status and message through so the client knows
    // whether it was wrong credentials (401) or user not found (404) vs other errors
    const statusToReturn = extRes.status === 404 ? 404 : 401;
    const errorMsg = extData.message || extData.error || 'Credenciales incorrectas';
    return res.status(statusToReturn).json({ success: false, status: extRes.status, message: errorMsg });
  } catch (error) {
    console.error('[external-login proxy] Error:', error.message);
    res.status(502).json({ error: 'External auth server unreachable' });
  }
});

// Proxy to external change-password verification
app.post('/api/auth/external-verify', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });

    const extRes = await fetch(`${EXTERNAL_AUTH_BASE}/infouser`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    const extData = await extRes.json();
    if (extRes.ok && extData.success) {
      return res.json({ success: true });
    }
    return res.status(401).json({ success: false, message: extData.message || 'Contraseña incorrecta' });
  } catch (error) {
    res.status(502).json({ error: 'External auth server unreachable' });
  }
});

// Proxy to external reset-password API — changes password via users.coderf5.es
// Body: { email, currentPassword, newPassword }
app.post('/api/auth3000password', verifyToken, async (req, res) => {
  try {
    const { email, currentPassword, newPassword } = req.body;
    if (!email || !currentPassword || !newPassword) {
      return res.status(400).json({ error: 'email, currentPassword and newPassword are required' });
    }

    const extRes = await fetch(`${EXTERNAL_AUTH_BASE}/reset-password/api-request-reset`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, currentPassword, newPassword })
    });

    const extData = await extRes.json();
    if (extRes.ok && (extData.success !== false)) {
      return res.json({ success: true, message: extData.message || 'Contraseña actualizada correctamente' });
    }
    const statusToReturn = extRes.status >= 400 ? extRes.status : 400;
    return res.status(statusToReturn).json({ success: false, message: extData.message || extData.error || 'Error al cambiar la contraseña' });
  } catch (error) {
    console.error('[reset-password proxy] Error:', error.message);
    res.status(502).json({ error: 'External auth server unreachable' });
  }
});

// Public proxy for forgot-password (no token required) — calls external reset-password API
// Body: { email }
app.post('/api/auth/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'El correo electrónico es obligatorio.' });

    const extRes = await fetch(`${EXTERNAL_AUTH_BASE}/reset-password/api-request-reset`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });

    let data = {};
    const text = await extRes.text();
    try { data = JSON.parse(text); } catch { /* no JSON body */ }

    if (extRes.ok) {
      return res.json({ success: true, message: data.message || 'En breves recibirás un correo con el enlace para restablecer tu contraseña.' });
    }
    return res.status(extRes.status >= 400 ? extRes.status : 400).json({
      success: false,
      message: data.message || data.error || 'No se pudo enviar el correo. Comprueba la dirección e inténtalo de nuevo.'
    });
  } catch (error) {
    console.error('[forgot-password proxy] Error:', error.message);
    res.status(502).json({ error: 'Servidor de autenticación no disponible. Inténtalo más tarde.' });
  }
});

// Local register is disabled — user registration is handled exclusively by admins
// via POST /api/admin/teachers, which registers in the external auth system (users.coderf5.es).
app.post('/api/auth/register', (req, res) => {
  res.status(410).json({
    error: 'El registro de usuarios no está disponible públicamente. Un administrador debe crear la cuenta desde el panel de administración.'
  });
});

// Local login is disabled — authentication is handled exclusively via the external auth API.
// Use POST /api/auth/external-login instead.
app.post('/api/auth/login', (req, res) => {
  res.status(410).json({
    error: 'El login local no está disponible. Por favor, inicia sesión con tus credenciales de users.coderf5.es.'
  });
});

// ==================== PROFILE MANAGEMENT ====================

// Get current user profile
app.get('/api/profile', verifyToken, async (req, res) => {
  try {
    const { role } = req.user;

    // Only teachers and superadmins have a local profile record.
    // Students are not authenticated in this platform.
    if (role !== 'teacher' && role !== 'superadmin') {
      return res.status(403).json({ error: 'Profile not available for this role' });
    }

    const user = await Teacher.findOne({ where: { id: req.user.id, deletedAt: null } });
    if (!user) return res.status(404).json({ error: 'User not found' });

    res.json({
      id: user.id,
      name: user.name,
      lastName: user.lastName || '',
      email: user.email,
      location: user.location || '',
      role,
      userRole: user.userRole || 'Formador/a',
      createdAt: user.createdAt
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update user profile
app.put('/api/profile', verifyToken, async (req, res) => {
  try {
    const { name, lastName, location } = req.body;
    const { role } = req.user;

    if (role !== 'teacher' && role !== 'superadmin') {
      return res.status(403).json({ error: 'Profile update not available for this role' });
    }

    const user = await Teacher.findOne({ where: { id: req.user.id, deletedAt: null } });
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (name !== undefined) user.name = name;
    if (lastName !== undefined) user.lastName = lastName;
    if (location !== undefined) user.location = location;
    await sqlSave(user);

    res.json({
      message: 'Profile updated successfully',
      profile: {
        id: user.id,
        name: user.name,
        lastName: user.lastName || '',
        email: user.email,
        location: user.location || '',
        role,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Change password — proxied entirely to the external auth API.
// Students don't authenticate; admins are superadmins from external JWT.
app.post('/api/change-password', verifyToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current and new password are required' });
    }
    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    const teacher = await Teacher.findOne({ where: { id: req.user.id, deletedAt: null } });
    if (!teacher) return res.status(404).json({ error: 'User not found' });

    try {
      const extRes = await fetch(`${EXTERNAL_AUTH_BASE}/reset-password/api-request-reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: teacher.email, currentPassword, newPassword })
      });
      const extData = await extRes.json().catch(() => ({}));
      if (extRes.ok && extData.success !== false) {
        return res.json({ message: 'Password changed successfully' });
      }
      return res.status(extRes.status >= 400 ? extRes.status : 400).json({
        error: extData.message || extData.error || 'Error al cambiar la contraseña en el servidor externo'
      });
    } catch (extErr) {
      return res.status(502).json({ error: 'External auth server unreachable' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== STUDENT MANAGEMENT ====================

app.get('/api/promotions/:promotionId/students', verifyToken, async (req, res) => {
  try {
    const promotion = await Promotion.findOne({ where: { id: req.params.promotionId } });
    if (!promotion) return res.status(404).json({ error: 'Promotion not found' });
    if (!canEditPromotion(promotion, req.user.id)) return res.status(403).json({ error: 'Unauthorized' });

    const students = await Student.findAll({ where: { promotionId: req.params.promotionId } });

    // Normalize the response to ensure consistent ID field
    const normalizedStudents = students.map(student => ({
      id: student.id || student.id.toString(), // Prefer custom id, fallback to string version of _id
      _id: student.id, // Keep _id for internal operations
      name: student.name,
      lastname: student.lastname,
      email: student.email,
      age: student.age,
      nationality: student.nationality,
      profession: student.profession,
      address: student.address,
      promotionId: student.promotionId,
      isWithdrawn: !!student.isWithdrawn,
      withdrawal: student.withdrawal || {}
    }));

    res.json(normalizedStudents);
  } catch (error) {
    console.error('Error fetching students:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get attendance for a specific month
app.get('/api/promotions/:promotionId/attendance', verifyToken, async (req, res) => {
  try {
    const { month } = req.query; // Format: YYYY-MM
    if (!month) return res.status(400).json({ error: 'Month is required (YYYY-MM)' });

    const promotion = await Promotion.findOne({ where: { id: req.params.promotionId } });
    if (!promotion) return res.status(404).json({ error: 'Promotion not found' });
    if (!canEditPromotion(promotion, req.user.id)) return res.status(403).json({ error: 'Unauthorized' });

    // Fetch all attendance for this promotion in the given month
    const attendance = await Attendance.findAll({
      where: {
        promotionId: req.params.promotionId,
        date: { [Op.like]: `${month}-%` }
      }
    });

    res.json(attendance);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update or create attendance record
app.put('/api/promotions/:promotionId/attendance', verifyToken, async (req, res) => {
  try {
    const { studentId, date, status, note } = req.body;
    if (!studentId || !date) return res.status(400).json({ error: 'studentId and date are required' });

    const promotion = await Promotion.findOne({ where: { id: req.params.promotionId } });
    if (!promotion) return res.status(404).json({ error: 'Promotion not found' });
    if (!canEditPromotion(promotion, req.user.id)) return res.status(403).json({ error: 'Unauthorized' });


    const updateData = { status };
    if (note !== undefined && note !== null) updateData.note = note;

    let attendance = await Attendance.findOne({ where: { promotionId: req.params.promotionId, studentId, date } });
    if (attendance) {
      Object.assign(attendance, updateData);
      await sqlSave(attendance);
    } else {
      attendance = await Attendance.create({ promotionId: req.params.promotionId, studentId, date, ...updateData });
    }

    res.json(attendance);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Export attendance for entire promotion period as Excel
// Export students to Excel
app.get('/api/promotions/:promotionId/students/export', verifyToken, async (req, res) => {
  try {
    const promotion = await Promotion.findOne({ where: { id: req.params.promotionId } });
    if (!promotion) return res.status(404).json({ error: 'Promotion not found' });
    if (!canEditPromotion(promotion, req.user.id)) return res.status(403).json({ error: 'Unauthorized' });

    let whereClause = { promotionId: req.params.promotionId };
    
    // Filter by IDs if provided (comma-separated list)
    if (req.query.ids) {
      const ids = req.query.ids.split(',');
      whereClause.id = { [Op.in]: ids };
    }

    const students = await Student.findAll({
      where: whereClause,
      order: [['isWithdrawn', 'ASC'], ['name', 'ASC'], ['lastname', 'ASC']]
    });

    if (students.length === 0) {
      return res.status(400).json({ error: 'No se encontraron estudiantes para exportar' });
    }

    // Build worksheet data using array of arrays
    const headers = [
      'Nombre', 'Apellidos', 'Email', 'Teléfono', 'Edad', 'Género',
      'Situación Administrativa', 'Nacionalidad', 'Documento ID',
      'Nivel Inglés', 'Nivel Educativo', 'Profesión', 'Comunidad', 'Estado'
    ];
    
    const worksheetData = [headers];

    students.forEach(s => {
      worksheetData.push([
        s.name,
        s.lastname,
        s.email,
        s.phone,
        s.age,
        s.gender,
        s.administrativeSituation,
        s.nationality,
        s.identificationDocument,
        s.englishLevel,
        s.educationLevel,
        s.profession,
        s.community,
        s.isWithdrawn ? 'BAJA' : 'Activo'
      ]);
    });

    const worksheet = xlsx.utils.aoa_to_sheet(worksheetData);
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, worksheet, 'Estudiantes');

    // Set column widths
    worksheet['!cols'] = [
      { wch: 20 }, { wch: 20 }, { wch: 30 }, { wch: 15 }, { wch: 8 }, { wch: 10 },
      { wch: 25 }, { wch: 20 }, { wch: 15 }, { wch: 12 }, { wch: 20 }, { wch: 20 },
      { wch: 20 }, { wch: 10 }
    ];

    const buffer = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=estudiantes-${promotion.name.replace(/\s+/g, '-')}.xlsx`);
    res.send(buffer);

  } catch (error) {
    console.error('Error exporting students:', error);
    res.status(500).json({ error: `Error al exportar estudiantes: ${error.message}` });
  }
});

app.get('/api/promotions/:promotionId/attendance/export', verifyToken, async (req, res) => {
  try {
    const promotion = await Promotion.findOne({ where: { id: req.params.promotionId } });
    if (!promotion) return res.status(404).json({ error: 'Promotion not found' });
    if (!canEditPromotion(promotion, req.user.id)) return res.status(403).json({ error: 'Unauthorized' });

    const startDate = promotion.startDate;
    const endDate = promotion.endDate;
    
    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'La promoción debe tener fechas de inicio y fin válidas' });
    }


    // Get all students for this promotion
    const students = await Student.findAll({
      where: { promotionId: req.params.promotionId },
      order: [['name', 'ASC'], ['lastname', 'ASC']]
    });
    
    if (students.length === 0) {
      return res.status(400).json({ error: 'No se encontraron estudiantes en esta promoción' });
    }

    // Get all attendance records for the entire promotion period
    const attendance = await Attendance.findAll({
      where: {
        promotionId: req.params.promotionId,
        date: { [Op.between]: [startDate, endDate] }
      },
      order: [['date', 'ASC']]
    });


    // Generate all dates between start and end date
    const allDates = [];
    const currentDate = new Date(startDate);
    const endDateTime = new Date(endDate);
    
    while (currentDate <= endDateTime) {
      // Only include weekdays (Monday to Friday)
      const dayOfWeek = currentDate.getDay();
      if (dayOfWeek >= 1 && dayOfWeek <= 5) {
        allDates.push(currentDate.toISOString().split('T')[0]);
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }


    // Group dates by month
    const datesByMonth = {};
    allDates.forEach(date => {
      const monthKey = date.substring(0, 7); // YYYY-MM format
      if (!datesByMonth[monthKey]) {
        datesByMonth[monthKey] = [];
      }
      datesByMonth[monthKey].push(date);
    });

    // Create workbook
    const workbook = xlsx.utils.book_new();

    // Create a worksheet for each month
    Object.keys(datesByMonth).sort().forEach(monthKey => {
      const monthDates = datesByMonth[monthKey];
      const monthName = new Date(monthKey + '-01').toLocaleDateString('es-ES', { 
        year: 'numeric', 
        month: 'long' 
      });
      const shortMonthName = new Date(monthKey + '-01').toLocaleDateString('es-ES', { 
        year: '2-digit', 
        month: 'short' 
      }).replace('.', '');

      // Create worksheet data for this month
      const worksheetData = [];
      
      // Header row with dates
      const headerRow = ['Estudiante', ...monthDates.map(date => {
        const d = new Date(date);
        return d.getDate().toString().padStart(2, '0');
      })];
      worksheetData.push(headerRow);

      // Data rows for each student
      students.forEach(student => {
        const studentName = `${student.name || ''} ${student.lastname || ''}`.trim();
        const row = [studentName];
        
        monthDates.forEach(date => {
          const attendanceRecord = attendance.find(a => 
            a.studentId === student.id && a.date === date
          );
          
          let status = '';
          if (attendanceRecord) {
            switch (attendanceRecord.status) {
              case 'Presente': status = 'P'; break;
              case 'Ausente': status = 'A'; break;
              case 'Con retraso': status = 'T'; break;
              case 'Justificado': status = 'J'; break;
              case 'Sale antes': status = 'S'; break;
              default: status = '';
            }
          }
          row.push(status);
        });
        
        worksheetData.push(row);
      });

      // Add empty row before legend
      worksheetData.push([]);
      
      // Add legend at the bottom of each month
      worksheetData.push(['Leyenda:']);
      worksheetData.push(['P = Presente']);
      worksheetData.push(['A = Ausente']);
      worksheetData.push(['T = Con retraso']);
      worksheetData.push(['J = Justificado']);
      worksheetData.push(['S = Sale antes']);

      // Create worksheet
      const worksheet = xlsx.utils.aoa_to_sheet(worksheetData);
      
      // Set column widths
      const colWidths = [{ width: 25 }]; // Student name column
      monthDates.forEach(() => colWidths.push({ width: 6 })); // Date columns (smaller for day numbers)
      worksheet['!cols'] = colWidths;

      // Add worksheet to workbook with month name as tab
      xlsx.utils.book_append_sheet(workbook, worksheet, shortMonthName);
    });

    // If no months found, create a summary sheet
    if (Object.keys(datesByMonth).length === 0) {
      const summaryData = [
        ['No hay registros de asistencia para exportar'],
        [''],
        ['Período consultado:'],
        [`Desde: ${startDate}`],
        [`Hasta: ${endDate}`],
        [`Estudiantes: ${students.length}`]
      ];
      
      const summarySheet = xlsx.utils.aoa_to_sheet(summaryData);
      xlsx.utils.book_append_sheet(workbook, summarySheet, 'Resumen');
    }

    // Generate Excel file
    const excelBuffer = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    // Create safe filename using promotion name
    const safeName = promotion.name.replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '_');
    const filename = `${safeName}_asistencia.xlsx`;

    // Set response headers
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    
    res.send(excelBuffer);
  } catch (error) {
    console.error('Error exporting attendance:', error);
    res.status(500).json({ error: `Error al exportar asistencia: ${error.message}` });
  }
});

// Send report by email
app.post('/api/reports/send-email', verifyToken, async (req, res) => {
  try {
    const { to, subject, body, filename, base64Data } = req.body;

    if (!to || !base64Data) {
      return res.status(400).json({ error: 'Recipient and PDF data are required' });
    }

    const attachments = [{
      filename: filename || 'informe.pdf',
      content: base64Data.split('base64,').pop(),
      encoding: 'base64'
    }];

    const success = await sendReportEmail(to, subject || 'Informe de Asistencia', body || 'Se adjunta el informe solicitado.', attachments);

    if (success) {
      res.json({ message: 'Email enviado correctamente' });
    } else {
      res.status(500).json({ error: 'Error al enviar el email' });
    }
  } catch (error) {
    console.error('Error in send-email route:', error);
    res.status(500).json({ error: error.message });
  }
});

// ── Holidays (festivos) for a promotion ──────────────────────────────────────
// GET — return the holiday list for the promotion
app.get('/api/promotions/:promotionId/holidays', verifyToken, async (req, res) => {
  try {
    const promotion = await Promotion.findOne({ where: { id: req.params.promotionId } });
    if (!promotion) return res.status(404).json({ error: 'Promotion not found' });
    res.json({ holidays: promotion.holidays || [] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT — replace the full holiday list for the promotion
app.put('/api/promotions/:promotionId/holidays', verifyToken, async (req, res) => {
  try {
    const promotion = await Promotion.findOne({ where: { id: req.params.promotionId } });
    if (!promotion) return res.status(404).json({ error: 'Promotion not found' });
    if (!canEditPromotion(promotion, req.user.id)) return res.status(403).json({ error: 'Unauthorized' });
    const { holidays } = req.body; // array of YYYY-MM-DD strings
    if (!Array.isArray(holidays)) return res.status(400).json({ error: 'holidays must be an array' });
    const _promo = await Promotion.findOne({ where: { id: req.params.promotionId } });
    if (_promo) { _promo.holidays = holidays; await sqlSave(_promo); }
    res.json({ holidays });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add student manually (teacher adds student for tracking)
app.post('/api/promotions/:promotionId/students', verifyToken, async (req, res) => {
  try {
    const promotion = await Promotion.findOne({ where: { id: req.params.promotionId } });
    if (!promotion) return res.status(404).json({ error: 'Promotion not found' });
    if (!canEditPromotion(promotion, req.user.id)) return res.status(403).json({ error: 'Unauthorized' });

    const {
      name, lastname, email, phone, age, administrativeSituation,
      nationality, identificationDocument, gender, englishLevel, educationLevel,
      profession, community
    } = req.body;

    if (!email || !name || !lastname) return res.status(400).json({ error: 'Email, name, and lastname are required' });

    // Check if student already exists
    const existing = await Student.findOne({ email, promotionId: req.params.promotionId });
    if (existing) return res.status(400).json({ error: 'Student already added to this promotion' });

    const student = await Student.create({
      id: uuidv4(),
      name,
      lastname,
      email,
      phone: phone || '',
      age: age || null,
      administrativeSituation: administrativeSituation || '',
      nationality: nationality || '',
      identificationDocument: identificationDocument || '',
      gender: gender || '',
      englishLevel: englishLevel || '',
      educationLevel: educationLevel || '',
      profession: profession || '',
      community: community || '',
      promotionId: req.params.promotionId,
      isManuallyAdded: true,
      notes: ''
    });

    res.status(201).json({
      message: 'Student added successfully',
      student: {
        id: student.id,
        name: student.name,
        lastname: student.lastname,
        email: student.email,
        phone: student.phone,
        age: student.age,
        administrativeSituation: student.administrativeSituation,
        nationality: student.nationality,
        identificationDocument: student.identificationDocument,
        gender: student.gender,
        englishLevel: student.englishLevel,
        educationLevel: student.educationLevel,
        profession: student.profession,
        community: student.community
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Import students from Excel
// Expected columns (Spanish headers matching the student form):
//   Nombre*, Apellidos*, Email*, Teléfono*, Edad*, Situación Administrativa*,
//   Nacionalidad, Documento (DNI/NIE/Pasaporte), Sexo,
//   Nivel Inglés, Nivel Educativo, Profesión, Comunidad
// (* = required)
app.post('/api/promotions/:promotionId/students/upload-excel', verifyToken, upload.single('excelFile'), async (req, res) => {
  try {
    const promotion = await Promotion.findOne({ where: { id: req.params.promotionId } });
    if (!promotion) return res.status(404).json({ error: 'Promotion not found' });
    if (!canEditPromotion(promotion, req.user.id)) return res.status(403).json({ error: 'Unauthorized' });

    if (!req.file) return res.status(400).json({ error: 'No Excel file provided' });

    const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(worksheet, { defval: '' });

    if (data.length === 0) return res.status(400).json({ error: 'El archivo Excel está vacío' });

    // Column name aliases (Spanish headers as defined in the template)
    const col = (row, ...keys) => {
      for (const k of keys) {
        if (row[k] !== undefined && row[k] !== '') return String(row[k]).trim();
      }
      return '';
    };

    const ADMIN_SITUATIONS = ['nacional', 'solicitante_asilo', 'ciudadano_europeo', 'permiso_trabajo', 'no_permiso_trabajo', 'otro'];
    const GENDER_VALUES    = ['mujer', 'hombre', 'no_binario', 'no_especifica'];
    const ENGLISH_LEVELS   = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
    const EDUCATION_LEVELS = ['sin_estudios', 'eso', 'bachillerato', 'fp_medio', 'fp_superior', 'grado', 'postgrado', 'doctorado'];

    const created = [], skipped = [], errors = [];

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const rowNum = i + 2; // 1-based + header row

      const name     = col(row, 'Nombre');
      const lastname = col(row, 'Apellidos');
      const email    = col(row, 'Email');
      const phone    = col(row, 'Teléfono', 'Telefono');
      const ageRaw   = col(row, 'Edad');
      const adminSit = col(row, 'Situación Administrativa', 'Situacion Administrativa');
      const nationality         = col(row, 'Nacionalidad');
      const identificationDocument = col(row, 'Documento', 'DNI/NIE/Pasaporte');
      const gender              = col(row, 'Sexo');
      const englishLevel        = col(row, 'Nivel Inglés', 'Nivel Ingles');
      const educationLevel      = col(row, 'Nivel Educativo');
      const profession          = col(row, 'Profesión', 'Profesion');
      const community           = col(row, 'Comunidad');

      // Required field validation
      if (!name || !lastname || !email) {
        errors.push(`Fila ${rowNum}: Nombre, Apellidos y Email son obligatorios`);
        continue;
      }

      // Duplicate check
      const existing = await Student.findOne({ email, promotionId: req.params.promotionId });
      if (existing) {
        skipped.push(`Fila ${rowNum}: ${email} ya existe en esta promoción`);
        continue;
      }

      const age = ageRaw ? parseInt(ageRaw) || null : null;

      // Normalise enum values (case-insensitive)
      const normalise = (val, allowed) => {
        const v = val.toLowerCase().replace(/\s+/g, '_');
        return allowed.find(a => a === v) || val || '';
      };

      try {
        const student = await Student.create({
          id: uuidv4(),
          name,
          lastname,
          email,
          phone,
          age,
          administrativeSituation: normalise(adminSit, ADMIN_SITUATIONS),
          nationality,
          identificationDocument,
          gender:       normalise(gender, GENDER_VALUES),
          englishLevel: ENGLISH_LEVELS.includes(englishLevel) ? englishLevel : (englishLevel || ''),
          educationLevel: normalise(educationLevel, EDUCATION_LEVELS),
          profession,
          community,
          promotionId: req.params.promotionId,
          isManuallyAdded: true,
          notes: ''
        });
        created.push({ id: student.id, name: student.name, lastname: student.lastname, email: student.email });
      } catch (e) {
        errors.push(`Fila ${rowNum}: ${e.message}`);
      }
    }

    const parts = [];
    if (created.length) parts.push(`${created.length} estudiante(s) importado(s)`);
    if (skipped.length) parts.push(`${skipped.length} omitido(s) (ya existían)`);
    if (errors.length)  parts.push(`${errors.length} error(es)`);

    res.json({
      message: parts.join(', '),
      created,
      skipped,
      errors
    });
  } catch (error) {
    console.error('Error importing students from Excel:', error);
    res.status(500).json({ error: error.message });
  }
});


// Update student information
app.put('/api/promotions/:promotionId/students/:studentId', verifyToken, async (req, res) => {
  try {

    const promotion = await Promotion.findOne({ where: { id: req.params.promotionId } });
    if (!promotion) {
      return res.status(404).json({ error: 'Promotion not found' });
    }
    if (!canEditPromotion(promotion, req.user.id)) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const { name, lastname, email, phone, age, administrativeSituation,
            nationality, identificationDocument, gender, englishLevel, educationLevel,
            profession, community } = req.body;

    if (!email || !name || !lastname) return res.status(400).json({ error: 'Email, name, and lastname are required' });

    // First, let's find the student to see what we're working with
    let existingStudent = await Student.findOne({ where: { id: req.params.studentId, promotionId: req.params.promotionId } });

    if (!existingStudent) {
      // Try by MongoDB _id
      try {
        existingStudent = await Student.findOne({ _id: req.params.studentId, promotionId: req.params.promotionId });
      } catch (mongoError) {
      }
    }

    if (!existingStudent) {
      return res.status(404).json({ error: 'Student not found' });
    }

    // Check if email is being changed and if it conflicts with another student
    const emailConflict = await Student.findOne({
      email,
      promotionId: req.params.promotionId,
      $and: [
        { _id: { [Op.ne]: existingStudent.id } }
      ]
    });

    if (emailConflict) {
      return res.status(400).json({ error: 'Email already exists for another student in this promotion' });
    }

    // Update the student using the _id (which is always available)
    Object.assign(existingStudent, {
      name,
      lastname,
      email,
      phone: phone || '',
      age: age || null,
      administrativeSituation: administrativeSituation || '',
      nationality: nationality || '',
      identificationDocument: identificationDocument || '',
      gender: gender || '',
      englishLevel: englishLevel || '',
      educationLevel: educationLevel || '',
      profession: profession || '',
      community: community || ''
    });
    await sqlSave(existingStudent);
    const student = existingStudent;

    if (!student) return res.status(404).json({ error: 'Failed to update student' });

    res.json({
      message: 'Student updated successfully',
      student: {
        id: student.id || student.id,
        name: student.name,
        lastname: student.lastname,
        email: student.email,
        phone: student.phone,
        age: student.age,
        administrativeSituation: student.administrativeSituation,
        nationality: student.nationality,
        identificationDocument: student.identificationDocument,
        gender: student.gender,
        englishLevel: student.englishLevel,
        educationLevel: student.educationLevel,
        profession: student.profession,
        community: student.community
      }
    });
  } catch (error) {
    console.error('Error updating student:', error);
    res.status(500).json({ error: error.message });
  }
});

// Auto-track student when they access promotion with password
app.post('/api/promotions/:promotionId/track-student', async (req, res) => {
  try {
    const { email } = req.body;
    // Email is optional for first access
    const tempEmail = email || `guest-${uuidv4()}@promotion.local`;

    const promotion = await Promotion.findOne({ where: { id: req.params.promotionId } });
    if (!promotion) return res.status(404).json({ error: 'Promotion not found' });

    // Check if student already exists
    let student = await Student.findOne({ where: { email: tempEmail, promotionId: req.params.promotionId } });

    if (!student) {
      // Create new tracked student
      student = await Student.create({
        id: uuidv4(),
        email: tempEmail,
        promotionId: req.params.promotionId,
        isManuallyAdded: false
      });
    }

    // Update last accessed and access log
    student.progress.lastAccessed = new Date();
    if (!student.accessLog) student.accessLog = [];

    student.accessLog.push({
      accessedAt: new Date(),
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.headers['user-agent']
    });

    await sqlSave(student);

    res.json({ message: 'Student tracked', student: { id: student.id, email: student.email, name: student.name } });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add or update student notes
app.put('/api/promotions/:promotionId/students/:studentId/notes', verifyToken, async (req, res) => {
  try {
    const { notes } = req.body;

    const promotion = await Promotion.findOne({ where: { id: req.params.promotionId } });
    if (!promotion) return res.status(404).json({ error: 'Promotion not found' });
    if (!canEditPromotion(promotion, req.user.id)) return res.status(403).json({ error: 'Unauthorized' });

    const student = await Student.findOne({ where: { id: req.params.studentId, promotionId: req.params.promotionId } });
    if (student) { student.notes = notes || ''; await sqlSave(student); }

    if (!student) return res.status(404).json({ error: 'Student not found' });
    res.json({ message: 'Student notes updated', student });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update student progress
app.put('/api/promotions/:promotionId/students/:studentId/progress', verifyToken, async (req, res) => {
  try {

    const { modulesViewed, sectionsCompleted, modulesCompleted, lastAccessed } = req.body;

    const promotion = await Promotion.findOne({ where: { id: req.params.promotionId } });
    if (!promotion) return res.status(404).json({ error: 'Promotion not found' });
    if (!canEditPromotion(promotion, req.user.id)) return res.status(403).json({ error: 'Unauthorized' });

    const student = await Student.findOne({ where: { id: req.params.studentId, promotionId: req.params.promotionId } });
    if (!student) return res.status(404).json({ error: 'Student not found' });

    // Update modules completed if provided
    if (modulesCompleted !== undefined) {
      student.progress.modulesCompleted = Math.max(0, parseInt(modulesCompleted) || 0);
    }

    // Add new modules viewed (avoid duplicates)
    if (modulesViewed && Array.isArray(modulesViewed)) {
      student.progress.modulesViewed = [...new Set([...(student.progress.modulesViewed || []), ...modulesViewed])];
    }

    // Add new sections completed (avoid duplicates)
    if (sectionsCompleted && Array.isArray(sectionsCompleted)) {
      student.progress.sectionsCompleted = [...new Set([...(student.progress.sectionsCompleted || []), ...sectionsCompleted])];
    }

    // Update last accessed time
    student.progress.lastAccessed = lastAccessed ? new Date(lastAccessed) : new Date();

    await sqlSave(student);

    res.json({
      id: student.id,
      name: student.name,
      lastname: student.lastname,
      email: student.email,
      age: student.age,
      nationality: student.nationality,
      profession: student.profession,
      address: student.address,
      notes: student.notes,
      progress: student.progress,
      promotionId: student.promotionId,
      isManuallyAdded: student.isManuallyAdded
    });
  } catch (error) {
    console.error('Error updating student progress:', error);
    res.status(500).json({ error: error.message });
  }
});

// ==================== PROJECT ASSIGNMENTS ====================
// Assign one or more students to a project (individual or group)
app.post('/api/promotions/:promotionId/projects/assign', verifyToken, async (req, res) => {
  try {
    const { moduleId, projectName, groupName, studentIds, done } = req.body;
    if (!moduleId || !projectName || !Array.isArray(studentIds) || studentIds.length === 0) {
      return res.status(400).json({ error: 'moduleId, projectName and studentIds are required' });
    }

    const promotion = await Promotion.findOne({ where: { id: req.params.promotionId } });
    if (!promotion) return res.status(404).json({ error: 'Promotion not found' });
    if (!canEditPromotion(promotion, req.user.id)) return res.status(403).json({ error: 'Unauthorized' });

    const moduleExists = (promotion.modules || []).some(m => m.id === moduleId);
    if (!moduleExists) return res.status(404).json({ error: 'Module not found in promotion' });

    const assignmentId = uuidv4();
    const assignment = {
      id: assignmentId,
      moduleId,
      projectName,
      groupName: groupName || '',
      teammates: studentIds.filter(id => !!id),
      done: !!done,
      assignedAt: new Date()
    };

    // For each student, add the assignment (including teammates minus self)
    const results = [];
    for (const studentId of studentIds) {
      const student = await Student.findOne({ where: { id: studentId, promotionId: req.params.promotionId } });
      if (!student) {
        results.push({ studentId, ok: false, error: 'Student not found' });
        continue;
      }
      // teammates should include other ids excluding current
      const teammates = studentIds.filter(id => id !== studentId);
      const studentAssignment = { ...assignment, teammates };
      student.projectsAssignments = student.projectsAssignments || [];
      student.projectsAssignments.push(studentAssignment);
      await sqlSave(student);
      results.push({ studentId, ok: true });
    }

    res.status(201).json({ message: 'Project assignment created', assignmentId, results });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// List student project assignments
app.get('/api/promotions/:promotionId/students/:studentId/projects', verifyToken, async (req, res) => {
  try {
    const promotion = await Promotion.findOne({ where: { id: req.params.promotionId } });
    if (!promotion) return res.status(404).json({ error: 'Promotion not found' });
    if (!canEditPromotion(promotion, req.user.id)) return res.status(403).json({ error: 'Unauthorized' });

    const student = await Student.findOne({ where: { id: req.params.studentId, promotionId: req.params.promotionId } });
    if (!student) return res.status(404).json({ error: 'Student not found' });

    res.json(student.projectsAssignments || []);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update specific student project assignment (mark done, change group)
app.put('/api/promotions/:promotionId/students/:studentId/projects/:assignmentId', verifyToken, async (req, res) => {
  try {
    const { done, groupName } = req.body;

    const promotion = await Promotion.findOne({ where: { id: req.params.promotionId } });
    if (!promotion) return res.status(404).json({ error: 'Promotion not found' });
    if (!canEditPromotion(promotion, req.user.id)) return res.status(403).json({ error: 'Unauthorized' });

    const student = await Student.findOne({ where: { id: req.params.studentId, promotionId: req.params.promotionId } });
    if (!student) return res.status(404).json({ error: 'Student not found' });

    student.projectsAssignments = student.projectsAssignments || [];
    const idx = student.projectsAssignments.findIndex(a => a.id === req.params.assignmentId);
    if (idx === -1) return res.status(404).json({ error: 'Assignment not found' });

    if (typeof done === 'boolean') student.projectsAssignments[idx].done = done;
    if (typeof groupName === 'string') student.projectsAssignments[idx].groupName = groupName;

    await sqlSave(student);
    res.json(student.projectsAssignments[idx]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== PÍLDORAS MANAGEMENT ====================
// Helper to convert Excel date to JS Date
function excelDateToJSDate(serial) {
  if (typeof serial === 'string') return serial; // Already a string format
  if (!serial || serial <= 0) return null; // Handle 0 or invalid serials
  const utc_days = Math.floor(serial - 25569);
  const utc_value = utc_days * 86400;
  const date_info = new Date(utc_value * 1000);

  const fractional_day = serial - Math.floor(serial) + 0.0000001;
  let total_seconds = Math.floor(86400 * fractional_day);

  const seconds = total_seconds % 60;
  total_seconds -= seconds;
  const minutes = Math.floor(total_seconds / 60) % 60;
  total_seconds -= minutes * 60;
  const hours = Math.floor(total_seconds / (60 * 60));

  return new Date(date_info.getFullYear(), date_info.getMonth(), date_info.getDate(), hours, minutes, seconds);
}

// Download Excel template for importing píldoras into a module
app.get('/api/promotions/:promotionId/modules/:moduleId/pildoras/template-excel', verifyToken, async (req, res) => {
  try {
    const promotion = await Promotion.findOne({ where: { id: req.params.promotionId } });
    if (!promotion) return res.status(404).json({ error: 'Promotion not found' });
    if (!canEditPromotion(promotion, req.user.id)) return res.status(403).json({ error: 'Unauthorized' });

    const module = promotion.modules.find(m => m.id === req.params.moduleId);
    if (!module) return res.status(404).json({ error: 'Module not found' });

    const headers = ['Presentación', 'Fecha', 'Píldora', 'Student', 'Estado'];
    // Date cell uses a proper date string so Excel recognises it; leave blank if no date
    const todayStr = new Date().toISOString().split('T')[0];
    const exampleRow = ['Virtual', todayStr, 'Ej: Testing con Jest', 'Nombre Apellido, Nombre2 Apellido2', 'Pendiente'];
    const noteRow   = ['', '(dejar vacío si no hay fecha)', '', '(separar por comas)', ''];

    const worksheet = xlsx.utils.aoa_to_sheet([headers, exampleRow, noteRow]);
    // Set some friendly column widths
    worksheet['!cols'] = [
      { wch: 14 },
      { wch: 12 },
      { wch: 40 },
      { wch: 40 },
      { wch: 16 }
    ];

    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, worksheet, 'Pildoras');

    const excelBuffer = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    const safeModuleName = (module.name || module.id || 'modulo').toString().replace(/[\\/:*?"<>|]+/g, '-').trim();
    const filename = `plantilla_importar_pildoras_${safeModuleName}.xlsx`;

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(excelBuffer);
  } catch (error) {
    console.error('Error generating píldoras Excel template:', error);
    res.status(500).json({ error: error.message });
  }
});

// Upload Excel file for píldoras to a specific module
app.post('/api/promotions/:promotionId/modules/:moduleId/pildoras/upload-excel', verifyToken, upload.single('excelFile'), async (req, res) => {
  try {
    const promotion = await Promotion.findOne({ where: { id: req.params.promotionId } });
    if (!promotion) return res.status(404).json({ error: 'Promotion not found' });
    if (!canEditPromotion(promotion, req.user.id)) return res.status(403).json({ error: 'Unauthorized' });

    const module = promotion.modules.find(m => m.id === req.params.moduleId);
    if (!module) return res.status(404).json({ error: 'Module not found' });

    if (!req.file) {
      return res.status(400).json({ error: 'No Excel file provided' });
    }

    // Parse Excel file
    const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(worksheet, { cellDates: true });

    if (data.length === 0) {
      return res.status(400).json({ error: 'Excel file is empty' });
    }

    // Get current students for validation
    const students = await Student.findAll({ where: { promotionId: req.params.promotionId } });
    // Build lookup maps: exact "name lastname", name-only, and lastname-only (all lowercased)
    const studentByFullName = new Map();
    const studentByFirstName = new Map();
    const studentByLastName = new Map();
    students.forEach(student => {
      const full = `${student.name || ''} ${student.lastname || ''}`.trim().toLowerCase();
      const first = (student.name || '').trim().toLowerCase();
      const last = (student.lastname || '').trim().toLowerCase();
      studentByFullName.set(full, student);
      if (first && !studentByFirstName.has(first)) studentByFirstName.set(first, student);
      if (last && !studentByLastName.has(last)) studentByLastName.set(last, student);
    });

    // Resolve a single name string to a student object or a plain-name entry
    function resolveStudent(rawName) {
      const key = rawName.trim().toLowerCase();
      if (!key) return null;
      // 1. Exact full-name match
      const byFull = studentByFullName.get(key);
      if (byFull) return { id: byFull.id, name: byFull.name, lastname: byFull.lastname };
      // 2. Match by first name only
      const byFirst = studentByFirstName.get(key);
      if (byFirst) return { id: byFirst.id, name: byFirst.name, lastname: byFirst.lastname };
      // 3. Match by last name only
      const byLast = studentByLastName.get(key);
      if (byLast) return { id: byLast.id, name: byLast.name, lastname: byLast.lastname };
      // 4. Partial contains match (e.g. first word matches)
      const firstWord = key.split(/\s+/)[0];
      for (const [, s] of studentByFullName) {
        const sKey = `${s.name || ''} ${s.lastname || ''}`.trim().toLowerCase();
        if (sKey.includes(firstWord)) return { id: s.id, name: s.name, lastname: s.lastname };
      }
      // 5. Not found — store as plain name so the data isn't lost
      const parts = rawName.trim().split(/\s+/);
      return { id: '', name: parts[0] || rawName.trim(), lastname: parts.slice(1).join(' ') };
    }

    const pildoras = [];

    for (const row of data) {
      // Handle different column name variations
      const mode = row['Presentación'] || row['Presentacion'] || row['presentación'] || row['presentacion'] || 'Virtual';
      const dateText = row['Fecha'] || row['fecha'] || '';
      const title = row['Píldora'] || row['Pildora'] || row['píldora'] || row['pildora'] || '';
      const studentText = row['Student'] || row['student'] || row['Coders'] || row['coders'] || '';
      const status = row['Estado'] || row['estado'] || '';

      // Process assigned students — accept names even if not matched in DB
      const assignedStudents = [];
      if (studentText && String(studentText).trim().toLowerCase() !== 'desierta') {
        const studentNames = String(studentText).split(',').map(n => n.trim()).filter(Boolean);
        for (const name of studentNames) {
          const resolved = resolveStudent(name);
          if (resolved) assignedStudents.push(resolved);
        }
      }

      // Process date — leave empty if not provided or unparseable
      let isoDate = '';
      if (dateText !== '' && dateText !== null && dateText !== undefined) {
        try {
          let date;
          if (typeof dateText === 'number' && dateText > 1 && dateText < 200000) {
            // Excel serial date
            date = excelDateToJSDate(dateText);
          } else if (dateText instanceof Date) {
            date = dateText;
          } else {
            date = new Date(dateText);
          }
          if (date && !isNaN(date.getTime())) {
            isoDate = date.toISOString().split('T')[0];
          }
          // If invalid date, leave isoDate as ''
        } catch (e) {
          console.warn('Invalid date format:', dateText);
          // Leave isoDate as ''
        }
      }

      if (title) { // Only add if title is provided
        pildoras.push({
          mode: mode || 'Virtual',
          date: isoDate,
          title,
          students: assignedStudents,
          status: status || ''
        });
      }
    }

    // Get current extended info and update píldoras for this module
    let extendedInfo = await ExtendedInfo.findOne({ where: { promotionId: req.params.promotionId } });
    if (!extendedInfo) {
      extendedInfo = await ExtendedInfo.create({
        promotionId: req.params.promotionId,
        schedule: {},
        team: [],
        resources: [],
        evaluation: '',
        pildoras: [],
        modulesPildoras: []
      });
    }

    // Initialize modulesPildoras if it doesn't exist
    if (!extendedInfo.modulesPildoras) {
      extendedInfo.modulesPildoras = [];
    }

    // Find or create module píldoras entry
    let modulePildoras = extendedInfo.modulesPildoras.find(mp => mp.moduleId === req.params.moduleId);
    if (!modulePildoras) {
      modulePildoras = {
        moduleId: req.params.moduleId,
        moduleName: module.name,
        pildoras: []
      };
      extendedInfo.modulesPildoras.push(modulePildoras);
    }

    // Add imported píldoras to the module (append to existing ones)
    modulePildoras.pildoras.push(...pildoras);

    await sqlSave(extendedInfo);

    res.json({
      message: `Successfully imported ${pildoras.length} píldoras to module "${module.name}"`,
      pildoras: pildoras,
      module: {
        id: module.id,
        name: module.name
      },
      totalPildoras: modulePildoras.pildoras.length
    });

  } catch (error) {
    console.error('Error uploading Excel file to module:', error);
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File too large. Maximum size is 5MB.' });
    }
    res.status(500).json({ error: error.message });
  }
});

// Upload Excel file for píldoras (legacy endpoint - will add to first module)
app.post('/api/promotions/:promotionId/pildoras/upload-excel', verifyToken, upload.single('excelFile'), async (req, res) => {
  try {
    const promotion = await Promotion.findOne({ where: { id: req.params.promotionId } });
    if (!promotion) return res.status(404).json({ error: 'Promotion not found' });
    if (!canEditPromotion(promotion, req.user.id)) return res.status(403).json({ error: 'Unauthorized' });

    if (!req.file) {
      return res.status(400).json({ error: 'No Excel file provided' });
    }

    // Parse Excel file
    const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(worksheet, { cellDates: true });

    if (data.length === 0) {
      return res.status(400).json({ error: 'Excel file is empty' });
    }

    // Get current students for validation
    const students = await Student.findAll({ where: { promotionId: req.params.promotionId } });
    // Build lookup maps: exact "name lastname", name-only, and lastname-only (all lowercased)
    const studentByFullName2 = new Map();
    const studentByFirstName2 = new Map();
    const studentByLastName2 = new Map();
    students.forEach(student => {
      const full = `${student.name || ''} ${student.lastname || ''}`.trim().toLowerCase();
      const first = (student.name || '').trim().toLowerCase();
      const last = (student.lastname || '').trim().toLowerCase();
      studentByFullName2.set(full, student);
      if (first && !studentByFirstName2.has(first)) studentByFirstName2.set(first, student);
      if (last && !studentByLastName2.has(last)) studentByLastName2.set(last, student);
    });

    function resolveStudent2(rawName) {
      const key = rawName.trim().toLowerCase();
      if (!key) return null;
      const byFull = studentByFullName2.get(key);
      if (byFull) return { id: byFull.id, name: byFull.name, lastname: byFull.lastname };
      const byFirst = studentByFirstName2.get(key);
      if (byFirst) return { id: byFirst.id, name: byFirst.name, lastname: byFirst.lastname };
      const byLast = studentByLastName2.get(key);
      if (byLast) return { id: byLast.id, name: byLast.name, lastname: byLast.lastname };
      const firstWord = key.split(/\s+/)[0];
      for (const [, s] of studentByFullName2) {
        const sKey = `${s.name || ''} ${s.lastname || ''}`.trim().toLowerCase();
        if (sKey.includes(firstWord)) return { id: s.id, name: s.name, lastname: s.lastname };
      }
      const parts = rawName.trim().split(/\s+/);
      return { id: '', name: parts[0] || rawName.trim(), lastname: parts.slice(1).join(' ') };
    }

    const pildoras = [];

    for (const row of data) {
      // Handle different column name variations
      const mode = row['Presentación'] || row['Presentacion'] || row['presentación'] || row['presentacion'] || 'Virtual';
      const dateText = row['Fecha'] || row['fecha'] || '';
      const title = row['Píldora'] || row['Pildora'] || row['píldora'] || row['pildora'] || '';
      const studentText = row['Student'] || row['student'] || row['Coders'] || row['coders'] || '';
      const status = row['Estado'] || row['estado'] || '';

      // Process assigned students — accept names even if not matched in DB
      const assignedStudents = [];
      if (studentText && String(studentText).trim().toLowerCase() !== 'desierta') {
        const studentNames = String(studentText).split(',').map(n => n.trim()).filter(Boolean);
        for (const name of studentNames) {
          const resolved = resolveStudent2(name);
          if (resolved) assignedStudents.push(resolved);
        }
      }

      // Process date — leave empty if not provided or unparseable
      let isoDate = '';
      if (dateText !== '' && dateText !== null && dateText !== undefined) {
        try {
          let date;
          if (typeof dateText === 'number' && dateText > 1 && dateText < 200000) {
            date = excelDateToJSDate(dateText);
          } else if (dateText instanceof Date) {
            date = dateText;
          } else {
            date = new Date(dateText);
          }
          if (date && !isNaN(date.getTime())) {
            isoDate = date.toISOString().split('T')[0];
          }
        } catch (e) {
          console.warn('Invalid date format:', dateText);
        }
      }

      if (title) { // Only add if title is provided
        pildoras.push({
          mode: mode || 'Virtual',
          date: isoDate,
          title,
          students: assignedStudents,
          status: status || ''
        });
      }
    }

    // Get current extended info and update píldoras
    let extendedInfo = await ExtendedInfo.findOne({ where: { promotionId: req.params.promotionId } });
    if (!extendedInfo) {
      extendedInfo = await ExtendedInfo.create({
        promotionId: req.params.promotionId,
        schedule: {},
        team: [],
        resources: [],
        evaluation: '',
        pildoras: pildoras
      });
    } else {
      extendedInfo.pildoras = pildoras;
      await sqlSave(extendedInfo);
    }

    res.json({
      message: `Successfully imported ${pildoras.length} píldoras from Excel file`,
      pildoras: pildoras,
      studentsNotFound: data.length - pildoras.length
    });

  } catch (error) {
    console.error('Error uploading Excel file:', error);
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File too large. Maximum size is 5MB.' });
    }
    res.status(500).json({ error: error.message });
  }
});

// Get module-based píldoras for a promotion
app.get('/api/promotions/:promotionId/modules-pildoras', verifyToken, async (req, res) => {
  try {
    const promotion = await Promotion.findOne({ where: { id: req.params.promotionId } });
    if (!promotion) return res.status(404).json({ error: 'Promotion not found' });
    if (!canEditPromotion(promotion, req.user.id)) return res.status(403).json({ error: 'Unauthorized' });

    let extendedInfo = await ExtendedInfo.findOne({ where: { promotionId: req.params.promotionId } });
    if (!extendedInfo) {
      extendedInfo = await ExtendedInfo.create({
        promotionId: req.params.promotionId,
        schedule: {},
        team: [],
        resources: [],
        evaluation: '',
        pildoras: [],
        modulesPildoras: []
      });
    }

    // Improved Migration: If modulesPildoras is effectively empty but legacy pildoras exists, migrate data
    const hasAnyModulePildoras = extendedInfo.modulesPildoras &&
      extendedInfo.modulesPildoras.some(mp => mp.pildoras && mp.pildoras.length > 0);

    if (!hasAnyModulePildoras && extendedInfo.pildoras && extendedInfo.pildoras.length > 0) {

      // Group legacy pildoras by moduleId if present, otherwise put in first module
      const firstModule = promotion.modules && promotion.modules.length > 0 ? promotion.modules[0] : null;

      if (firstModule) {
        const modulesMap = new Map();
        // Initialize map with all current modules
        promotion.modules.forEach(m => modulesMap.set(m.id, []));

        extendedInfo.pildoras.forEach(p => {
          const targetModuleId = p.moduleId || firstModule.id;
          if (modulesMap.has(targetModuleId)) {
            modulesMap.get(targetModuleId).push(p);
          } else {
            modulesMap.get(firstModule.id).push(p);
          }
        });

        extendedInfo.modulesPildoras = Array.from(modulesMap.entries()).map(([mId, pList]) => {
          const m = promotion.modules.find(pm => pm.id === mId);
          return {
            moduleId: mId,
            moduleName: m ? m.name : 'Unknown Module',
            pildoras: pList
          };
        });

        await sqlSave(extendedInfo);
      }
    }

    // Ensure all modules have entries in modulesPildoras
    if (promotion.modules) {
      for (const module of promotion.modules) {
        const existingModulePildoras = extendedInfo.modulesPildoras.find(mp => mp.moduleId === module.id);
        if (!existingModulePildoras) {
          extendedInfo.modulesPildoras.push({
            moduleId: module.id,
            moduleName: module.name,
            pildoras: []
          });
        } else {
          // Update module name in case it changed
          existingModulePildoras.moduleName = module.name;
        }
      }
      await sqlSave(extendedInfo);
    }

    res.json({
      modules: promotion.modules || [],
      modulesPildoras: extendedInfo.modulesPildoras || []
    });
  } catch (error) {
    console.error('Error fetching modules píldoras:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update píldoras for a specific module
app.put('/api/promotions/:promotionId/modules/:moduleId/pildoras', verifyToken, async (req, res) => {
  try {
    const { pildoras } = req.body;
    if (!Array.isArray(pildoras)) {
      return res.status(400).json({ error: 'pildoras array is required' });
    }

    const promotion = await Promotion.findOne({ where: { id: req.params.promotionId } });
    if (!promotion) return res.status(404).json({ error: 'Promotion not found' });
    if (!canEditPromotion(promotion, req.user.id)) return res.status(403).json({ error: 'Unauthorized' });

    const module = promotion.modules.find(m => m.id === req.params.moduleId);
    if (!module) return res.status(404).json({ error: 'Module not found' });

    let extendedInfo = await ExtendedInfo.findOne({ where: { promotionId: req.params.promotionId } });
    if (!extendedInfo) {
      extendedInfo = await ExtendedInfo.create({
        promotionId: req.params.promotionId,
        schedule: {},
        team: [],
        resources: [],
        evaluation: '',
        pildoras: [],
        modulesPildoras: []
      });
    }

    // Find or create module píldoras entry
    let modulePildoras = extendedInfo.modulesPildoras.find(mp => mp.moduleId === req.params.moduleId);
    if (!modulePildoras) {
      modulePildoras = {
        moduleId: req.params.moduleId,
        moduleName: module.name,
        pildoras: []
      };
      extendedInfo.modulesPildoras.push(modulePildoras);
    }

    // Update píldoras for this module
    modulePildoras.pildoras = pildoras.map(p => ({
      mode: p.mode || 'Virtual',
      date: p.date || '',
      title: p.title || '',
      students: Array.isArray(p.students) ? p.students : [],
      status: p.status || ''
    }));

    // Sync flattened píldoras array for backward compatibility
    const allPildoras = [];
    extendedInfo.modulesPildoras.forEach(mp => {
      if (mp.pildoras) {
        allPildoras.push(...mp.pildoras);
      }
    });
    extendedInfo.pildoras = allPildoras;

    await sqlSave(extendedInfo);

    res.json({
      message: 'Module píldoras updated successfully',
      modulePildoras: modulePildoras
    });
  } catch (error) {
    console.error('Error updating module píldoras:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get pildoras for a module
app.get('/api/promotions/:promotionId/modules/:moduleId/pildoras', verifyToken, async (req, res) => {
  try {
    const promotion = await Promotion.findOne({ where: { id: req.params.promotionId } });
    if (!promotion) return res.status(404).json({ error: 'Promotion not found' });
    if (!canEditPromotion(promotion, req.user.id)) return res.status(403).json({ error: 'Unauthorized' });

    const mod = (promotion.modules || []).find(m => m.id === req.params.moduleId);
    if (!mod) return res.status(404).json({ error: 'Module not found' });
    res.json(mod.pildoras || []);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});



// Assign students to a specific pildora entry
app.post('/api/promotions/:promotionId/modules/:moduleId/pildoras/:pildoraId/assign', verifyToken, async (req, res) => {
  try {
    const { studentIds } = req.body;
    if (!Array.isArray(studentIds) || studentIds.length === 0) {
      return res.status(400).json({ error: 'studentIds array is required' });
    }

    const promotion = await Promotion.findOne({ where: { id: req.params.promotionId } });
    if (!promotion) return res.status(404).json({ error: 'Promotion not found' });
    if (!canEditPromotion(promotion, req.user.id)) return res.status(403).json({ error: 'Unauthorized' });

    const mod = (promotion.modules || []).find(m => m.id === req.params.moduleId);
    if (!mod) return res.status(404).json({ error: 'Module not found' });
    const pIndex = (mod.pildoras || []).findIndex(p => p.id === req.params.pildoraId);
    if (pIndex === -1) return res.status(404).json({ error: 'Pildora not found' });

    const currentAssigned = new Set(mod.pildoras[pIndex].assignedStudentIds || []);
    studentIds.forEach(id => currentAssigned.add(id));
    mod.pildoras[pIndex].assignedStudentIds = Array.from(currentAssigned);
    await sqlSave(promotion);
    res.json(mod.pildoras[pIndex]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
// Get student details
app.get('/api/promotions/:promotionId/students/:studentId', verifyToken, async (req, res) => {
  try {
    const promotion = await Promotion.findOne({ where: { id: req.params.promotionId } });
    if (!promotion) return res.status(404).json({ error: 'Promotion not found' });
    if (!canEditPromotion(promotion, req.user.id)) return res.status(403).json({ error: 'Unauthorized' });

    const student = await Student.findOne({ where: { id: req.params.studentId, promotionId: req.params.promotionId } });
    if (!student) return res.status(404).json({ error: 'Student not found' });

    res.json(student);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ─── Fichas de Seguimiento del Coder ──────────────────────────────────────────

// Helper: buscar estudiante por id custom o _id
async function findStudentByIdOrObjectId(studentId, promotionId) {
  let student = await Student.findOne({ where: { id: studentId, promotionId } });
  if (!student) {
    try { student = await Student.findOne({ _id: studentId, promotionId }); } catch (_) {}
  }
  return student;
}

// PUT /api/promotions/:promotionId/students/:studentId/ficha/personal
app.put('/api/promotions/:promotionId/students/:studentId/ficha/personal', verifyToken, async (req, res) => {
  try {
    const promotion = await Promotion.findOne({ where: { id: req.params.promotionId } });
    if (!promotion) return res.status(404).json({ error: 'Promotion not found' });
    if (!canEditPromotion(promotion, req.user.id)) return res.status(403).json({ error: 'Unauthorized' });

    const student = await findStudentByIdOrObjectId(req.params.studentId, req.params.promotionId);
    if (!student) return res.status(404).json({ error: 'Student not found' });

    const {
      name, lastname, email, phone, age, administrativeSituation,
      nationality, identificationDocument, gender, englishLevel,
      educationLevel, profession, community,
      isWithdrawn, withdrawal
    } = req.body;

    // Withdrawal-only update (no personal fields sent)
    if ((isWithdrawn !== undefined || withdrawal !== undefined) && !name) {
      student.isWithdrawn = !!isWithdrawn;
      student.withdrawal = withdrawal || null;
      await sqlSave(student);
      return res.json({ message: 'Estado de baja actualizado', student });
    }

    // Validar obligatorios (solo nombre, apellido y email son imprescindibles)
    if (!name || !lastname || !email) {
      return res.status(400).json({ error: 'Faltan campos obligatorios: nombre, apellido y email' });
    }

    student.technicalTracking = { ...(student.technicalTracking || {}), teacherNotes: Array.isArray(teacherNotes) ? teacherNotes : student.technicalTracking?.teacherNotes || [] };
    student.technicalTracking = { ...(student.technicalTracking || {}), teams: Array.isArray(teams) ? teams : student.technicalTracking?.teams || [] };
    student.technicalTracking = { ...(student.technicalTracking || {}), competences: Array.isArray(competences) ? competences : student.technicalTracking?.competences || [] };
    student.technicalTracking = { ...(student.technicalTracking || {}), completedModules: Array.isArray(completedModules) ? completedModules : student.technicalTracking?.completedModules || [] };
    student.technicalTracking = { ...(student.technicalTracking || {}), completedPildoras: Array.isArray(completedPildoras) ? completedPildoras : student.technicalTracking?.completedPildoras || [] };
    await sqlSave(student);
    const updated = student;

    res.json({ message: 'Seguimiento técnico actualizado', student: updated });
  } catch (error) {
    console.error('Error PUT ficha/technical:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/promotions/:promotionId/teams — Adds a team entry and propagates to all member students
app.post('/api/promotions/:promotionId/teams', verifyToken, async (req, res) => {
  try {
    const promotion = await Promotion.findOne({ where: { id: req.params.promotionId } });
    if (!promotion) return res.status(404).json({ error: 'Promotion not found' });
    if (!canEditPromotion(promotion, req.user.id)) return res.status(403).json({ error: 'Unauthorized' });

    const { teamEntry, memberStudentIds } = req.body;
    // teamEntry: { teamName, projectType, role, moduleName, moduleId, assignedDate, members:[{id,name}] }
    // memberStudentIds: [studentId, ...] — all students to receive this entry (includes the current one)

    if (!teamEntry || !Array.isArray(memberStudentIds) || memberStudentIds.length === 0) {
      return res.status(400).json({ error: 'teamEntry and memberStudentIds are required' });
    }

    const results = [];
    for (const studentId of memberStudentIds) {
      const student = await findStudentByIdOrObjectId(studentId, req.params.promotionId);
      if (!student) continue;

      // Build the entry for this student: members = all teammates except themselves
      const entryForThisStudent = {
        ...teamEntry,
        members: (teamEntry.members || []).filter(m => m.id !== studentId)
      };

      // Avoid duplicate: same project in same module
      const existingTeams = student.technicalTracking?.teams || [];
      const alreadyExists = existingTeams.some(
        t => t.teamName === teamEntry.teamName && t.moduleId === teamEntry.moduleId
      );
      if (!alreadyExists) {
        existingTeams.push(entryForThisStudent);
        await (async () => { student.technicalTracking = { ...(student.technicalTracking || {}), teams: existingTeams }; student.changed('technicalTracking', true); await sqlSave(student); })();
        results.push({ studentId, status: 'updated' });
      } else {
        results.push({ studentId, status: 'already_exists' });
      }
    }

    res.json({ message: 'Equipo propagado', results });
  } catch (error) {
    console.error('Error POST /teams:', error);
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/promotions/:promotionId/students/:studentId/ficha/transversal
app.put('/api/promotions/:promotionId/students/:studentId/ficha/transversal', verifyToken, async (req, res) => {
  try {
    const promotion = await Promotion.findOne({ where: { id: req.params.promotionId } });
    if (!promotion) return res.status(404).json({ error: 'Promotion not found' });
    if (!canEditPromotion(promotion, req.user.id)) return res.status(403).json({ error: 'Unauthorized' });

    const student = await findStudentByIdOrObjectId(req.params.studentId, req.params.promotionId);
    if (!student) return res.status(404).json({ error: 'Student not found' });

    const { employabilitySessions, individualSessions, incidents } = req.body;

    (async () => { student.transversalTracking = { ...(student.transversalTracking || {}), employabilitySessions: Array.isArray(employabilitySessions) ? employabilitySessions : student.transversalTracking?.employabilitySessions || [] }; student.changed('transversalTracking', true); student.transversalTracking = { ...(student.transversalTracking || {}), individualSessions: Array.isArray(individualSessions) ? individualSessions : student.transversalTracking?.individualSessions || [] }; student.changed('transversalTracking', true); student.transversalTracking = { ...(student.transversalTracking || {}), incidents: Array.isArray(incidents) ? incidents : student.transversalTracking?.incidents || [] }; student.changed('transversalTracking', true); await sqlSave(student); return student; })(); const updated = student;

    res.json({ message: 'Seguimiento transversal actualizado', student: updated });
  } catch (error) {
    console.error('Error PUT ficha/transversal:', error);
    res.status(500).json({ error: error.message });
  }
});

// ──────────────────────────────────────────────────────────────────────────────

// Update student detailed information
app.put('/api/promotions/:promotionId/students/:studentId/profile', verifyToken, async (req, res) => {
  try {
    const promotion = await Promotion.findOne({ where: { id: req.params.promotionId } });
    if (!promotion) {
      return res.status(404).json({ error: 'Promotion not found' });
    }
    if (!canEditPromotion(promotion, req.user.id)) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Support both old and new field names for compatibility
    const {
      name,
      lastName, lastname,  // Support both lastName and lastname
      age,
      nationality,
      profession,          // New field
      address,            // New field
      paperStatus,
      description,
      workBackground,
      email
    } = req.body;

    // Use lastname if provided, otherwise use lastName for backward compatibility
    const finalLastname = lastname || lastName;

    // First try to find by custom id
    let student = await Student.findOne({ where: { id: req.params.studentId, promotionId: req.params.promotionId } });

    if (!student) {
      // Try by MongoDB _id
      try {
        student = await Student.findOne({ _id: req.params.studentId, promotionId: req.params.promotionId });
      } catch (mongoError) {
        // Invalid ObjectId format
      }
    }

    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    // Update the student using findByIdAndUpdate for reliability
    (() => { Object.assign(student, {
        name: name || student.name,
        lastname: finalLastname || student.lastname || '',  // Provide default if field doesn't exist
        age: age !== undefined ? age : (student.age || null),
        nationality: nationality !== undefined ? nationality : (student.nationality || ''),
        profession: profession !== undefined ? profession : (student.profession || ''),     // New field
        address: address !== undefined ? address : (student.address || ''),             // New field
        paperStatus: paperStatus || student.paperStatus,
        description: description || student.description,
        workBackground: workBackground || student.workBackground,
        email: email || student.email
      }); sqlSave(student); return student; })(); const updatedStudent = student;

    res.json({
      message: 'Student profile updated',
      student: {
        id: updatedStudent.id || updatedStudent.id,
        name: updatedStudent.name,
        lastname: updatedStudent.lastname,
        email: updatedStudent.email,
        age: updatedStudent.age,
        nationality: updatedStudent.nationality,
        profession: updatedStudent.profession,
        address: updatedStudent.address
      }
    });
  } catch (error) {
    console.error('Error updating student profile:', error);
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/promotions/:promotionId/students/:studentId', verifyToken, async (req, res) => {
  try {

    const promotion = await Promotion.findOne({ where: { id: req.params.promotionId } });
    if (!promotion) return res.status(404).json({ error: 'Promotion not found' });
    if (!canEditPromotion(promotion, req.user.id)) return res.status(403).json({ error: 'Unauthorized' });

    // First, let's find the student to see what we're working with
    let existingStudent = await Student.findOne({ where: { id: req.params.studentId, promotionId: req.params.promotionId } });

    if (!existingStudent) {
      // Try by MongoDB _id
      try {
        existingStudent = await Student.findOne({ _id: req.params.studentId, promotionId: req.params.promotionId });
      } catch (mongoError) {
      }
    }

    if (!existingStudent) {
      return res.status(404).json({ error: 'Student not found' });
    }

    // Delete the student using the _id (which is always available)
    await Student.destroy({ where: { id: existingStudent.id } });

    res.json({ message: 'Student deleted successfully' });
  } catch (error) {
    console.error('Error deleting student:', error);
    res.status(500).json({ error: error.message });
  }
});

// ==================== PROMOTIONS ====================

app.get('/api/promotions', async (req, res) => {
  try {
    const promotions = await Promotion.findAll();
    res.json(promotions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/my-enrollments', verifyToken, async (req, res) => {
  try {
    const enrollments = await Student.findAll({ where: { [Op.or]: [{ id: req.user.id }, { email: req.user.email }] } });
    const promotionIds = enrollments.map(e => e.promotionId).filter(id => id);
    const enrolledPromotions = await Promotion.findAll({ where: { id: { [Op.in]: promotionIds } } });
    res.json(enrolledPromotions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/my-promotions', verifyToken, async (req, res) => {
  try {
    const teacherPromotions = await Promotion.findAll({
      where: { [Op.or]: [{ teacherId: req.user.id }, { collaborators: { [Op.like]: `%${req.user.id}%` } }] }
    });
    res.json(teacherPromotions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/my-promotions-all', verifyToken, async (req, res) => {
  try {
    const teacherPromotions = await Promotion.findAll({
      where: { [Op.or]: [{ teacherId: req.user.id }, { collaborators: { [Op.like]: `%${req.user.id}%` } }] }
    });
    res.json(teacherPromotions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/promotions/:id', async (req, res) => {
  try {
    const promotion = await Promotion.findOne({ where: { id: req.params.id } });
    if (!promotion) return res.status(404).json({ error: 'Promotion not found' });
    res.json(promotion);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/promotions', verifyToken, async (req, res) => {
  try {
    const { name, description, startDate, endDate, weeks, modules, templateId } = req.body;
    if (!name || !weeks) return res.status(400).json({ error: 'Name and weeks are required' });

    // Build modules list: from body or from template
    let promotionModules = modules || [];
    let template = null;

    if (templateId) {
      // Use lean() to get plain JS objects — no Mongoose _id complications
      template = await BootcampTemplate.findOne({ where: { id: templateId } });
      if (template && template.modules && template.modules.length > 0 && promotionModules.length === 0) {
        promotionModules = template.modules.map(m => ({
          id: uuidv4(),
          name: m.name,
          duration: m.duration,
          courses: (m.courses || []).map(({ name, url, duration, startOffset }) => ({ name, url, duration: duration || 1, startOffset: startOffset || 0 })),
          projects: (m.projects || []).map(({ name, url, duration, startOffset }) => ({ name, url, duration: duration || 1, startOffset: startOffset || 0 })),
          pildoras: []
        }));
      }
    }

    const promotion = await Promotion.create({
      id: uuidv4(),
      name,
      description,
      startDate,
      endDate,
      weeks,
      modules: promotionModules,
      employability: template ? (template.employability || []).map(({ name, url, startMonth, duration }) => ({ name, url, startMonth, duration })) : [],
      teacherId: req.user.id,
      collaborators: []
    });

    // If a template was selected, pre-populate ExtendedInfo from it
    if (template) {
      // Map module names → fresh IDs so competence startModule.id resolves correctly
      const moduleNameToId = {};
      promotionModules.forEach(m => { moduleNameToId[m.name] = m.id; });

      const mappedCompetences = (template.competences || []).map(c => ({
        id: c.id,
        area: c.area,
        name: c.name,
        description: c.description,
        levels: (c.levels || []).map(l => ({
          level: l.level,
          description: l.description,
          indicators: l.indicators || []
        })),
        allTools: c.allTools || [],
        selectedTools: c.selectedTools || [],
        startModule: c.startModule ? {
          id: moduleNameToId[c.startModule.name] || '',
          name: c.startModule.name || ''
        } : { id: '', name: '' }
      }));

      const mappedResources = (template.resources || []).map(({ title, category, url }) => ({ title, category, url }));

      const schedule = template.schedule || {};

      // Map template modulesPildoras: replace moduleName with fresh module IDs
      const mappedModulesPildoras = (template.modulesPildoras || []).map(mp => {
        const freshModuleId = moduleNameToId[mp.moduleName] || '';
        return {
          moduleId: freshModuleId,
          moduleName: mp.moduleName,
          pildoras: (mp.pildoras || []).map(p => ({
            title: p.title,
            mode: p.mode || 'Virtual',
            date: '',
            students: [],
            status: ''
          }))
        };
      });

      await (async () => {
      const _fields = {
            schedule,
            evaluation: template.evaluation || '',
            resources: mappedResources,
            competences: mappedCompetences,
            school: template.school || '',
            projectType: template.projectType || '',
            totalHours: template.totalHours || '',
            modality: template.modality || '',
            materials: template.materials || '',
            internships: template.internships !== undefined && template.internships !== null ? template.internships : null,
            funders: template.funders || '',
            funderDeadlines: template.funderDeadlines || '',
            okrKpis: template.okrKpis || '',
            funderKpis: template.funderKpis || '',
            projectMeetings: template.projectMeetings || '',
            teamMeetings: template.teamMeetings || '',
            trainerDayOff: template.trainerDayOff || '',
            cotrainerDayOff: template.cotrainerDayOff || '',
            team: [],
            pildoras: [],
            modulesPildoras: mappedModulesPildoras.length > 0 ? mappedModulesPildoras : []
          };
      let _ei = await ExtendedInfo.findOne({ where: { promotionId: promotion.id } });
      if (_ei) {
        Object.assign(_ei, _fields);
        for (const k of Object.keys(_fields)) _ei.changed(k, true);
        await _ei.save();
      } else {
        await ExtendedInfo.create({ promotionId: promotion.id, ..._fields });
      }
    })();
    }

    res.status(201).json(promotion);
  } catch (error) {
    console.error('[POST /api/promotions] error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/promotions/:id', verifyToken, async (req, res) => {
  try {
    const promotion = await Promotion.findOne({ where: { id: req.params.id } });
    if (!promotion) return res.status(404).json({ error: 'Promotion not found' });
    if (!canEditPromotion(promotion, req.user.id)) return res.status(403).json({ error: 'Unauthorized' });
    const allowed = ['name','description','startDate','endDate','weeks','modules','employability','teachingContentUrl','asanaWorkspaceUrl','accessPassword','holidays','collaborators','ownerModules','collaboratorModules'];
    for (const key of allowed) {
      if (req.body.hasOwnProperty(key)) promotion[key] = req.body[key];
    }
    await sqlSave(promotion);
    res.json(promotion);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/promotions/:id', verifyToken, async (req, res) => {
  try {
    const promotion = await Promotion.findOne({ where: { id: req.params.id } });
    if (!promotion) return res.status(404).json({ error: 'Promotion not found' });
    if (!canEditPromotion(promotion, req.user.id)) return res.status(403).json({ error: 'Unauthorized' });

    await Promotion.destroy({ where: { id: req.params.id } });
    await Student.destroy({ where: { promotionId: req.params.id } });
    await QuickLink.destroy({ where: { promotionId: req.params.id } });
    await Section.destroy({ where: { promotionId: req.params.id } });
    await ExtendedInfo.destroy({ where: { promotionId: req.params.id } });
    // googleCalendarId is now a column on promotions — no separate table to delete

    res.json({ message: 'Promotion deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== MODULES ====================

app.post('/api/promotions/:promotionId/modules', verifyToken, async (req, res) => {
  try {
    const { name, duration, courses, projects } = req.body;
    if (!name || !duration) return res.status(400).json({ error: 'Name and duration are required' });

    const promotion = await Promotion.findOne({ where: { id: req.params.promotionId } });
    if (!promotion) return res.status(404).json({ error: 'Promotion not found' });
    if (!canEditPromotion(promotion, req.user.id)) return res.status(403).json({ error: 'Unauthorized' });

    const module = { id: uuidv4(), name, duration, courses: courses || [], projects: projects || [] };
    promotion.modules.push(module);
    await sqlSave(promotion);
    res.status(201).json(module);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== QUICK LINKS ====================

app.get('/api/promotions/:promotionId/quick-links', async (req, res) => {
  try {
    const quickLinks = await QuickLink.findAll({ where: { promotionId: req.params.promotionId } });
    res.json(quickLinks);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/promotions/:promotionId/quick-links', verifyToken, async (req, res) => {
  try {
    const { name, url, platform } = req.body;
    if (!name || !url) return res.status(400).json({ error: 'Name and URL are required' });

    const promotion = await Promotion.findOne({ where: { id: req.params.promotionId } });
    if (!promotion) return res.status(404).json({ error: 'Promotion not found' });
    if (!canEditPromotion(promotion, req.user.id)) return res.status(403).json({ error: 'Unauthorized' });

    const quickLink = await QuickLink.create({ id: uuidv4(), promotionId: req.params.promotionId, name, url, platform });
    res.status(201).json(quickLink);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/promotions/:promotionId/quick-links/:linkId', verifyToken, async (req, res) => {
  try {
    const promotion = await Promotion.findOne({ where: { id: req.params.promotionId } });
    if (!promotion) return res.status(404).json({ error: 'Promotion not found' });
    if (!canEditPromotion(promotion, req.user.id)) return res.status(403).json({ error: 'Unauthorized' });

    const result = await QuickLink.destroy({ where: { id: req.params.linkId, promotionId: req.params.promotionId } });
    if (result === 0) return res.status(404).json({ error: 'Quick link not found' });
    res.json({ message: 'Quick link deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== SECTIONS ====================

app.get('/api/promotions/:promotionId/sections', async (req, res) => {
  try {
    const sections = await Section.findAll({ where: { promotionId: req.params.promotionId } });
    res.json(sections);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/promotions/:promotionId/sections', verifyToken, async (req, res) => {
  try {
    const { title, content } = req.body;
    if (!title) return res.status(400).json({ error: 'Title is required' });

    const promotion = await Promotion.findOne({ where: { id: req.params.promotionId } });
    if (!promotion) return res.status(404).json({ error: 'Promotion not found' });
    if (!canEditPromotion(promotion, req.user.id)) return res.status(403).json({ error: 'Unauthorized' });

    const section = await Section.create({ id: uuidv4(), promotionId: req.params.promotionId, title, content });
    res.status(201).json(section);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/promotions/:promotionId/sections/:sectionId', verifyToken, async (req, res) => {
  try {
    const promotion = await Promotion.findOne({ where: { id: req.params.promotionId } });
    if (!promotion) return res.status(404).json({ error: 'Promotion not found' });
    if (!canEditPromotion(promotion, req.user.id)) return res.status(403).json({ error: 'Unauthorized' });

    const section = await Section.findOne({ where: { id: req.params.sectionId, promotionId: req.params.promotionId } });
    if (!section) return res.status(404).json({ error: 'Section not found' });
    const { title, content } = req.body;
    if (title !== undefined) section.title = title;
    if (content !== undefined) section.content = content;
    await sqlSave(section);
    res.json(section);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/promotions/:promotionId/sections/:sectionId', verifyToken, async (req, res) => {
  try {
    const promotion = await Promotion.findOne({ where: { id: req.params.promotionId } });
    if (!promotion) return res.status(404).json({ error: 'Promotion not found' });
    if (!canEditPromotion(promotion, req.user.id)) return res.status(403).json({ error: 'Unauthorized' });

    const result = await Section.destroy({ where: { id: req.params.sectionId, promotionId: req.params.promotionId } });
    if (result === 0) return res.status(404).json({ error: 'Section not found' });
    res.json({ message: 'Section deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== CALENDAR (googleCalendarId stored on promotion) ====================

app.get('/api/promotions/:promotionId/calendar', async (req, res) => {
  try {
    const promotion = await Promotion.findOne({ where: { id: req.params.promotionId } });
    if (!promotion || !promotion.googleCalendarId) return res.status(404).json({ error: 'Calendar not found' });
    res.json({ promotionId: promotion.id, googleCalendarId: promotion.googleCalendarId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/promotions/:promotionId/calendar', verifyToken, async (req, res) => {
  try {
    const { googleCalendarId } = req.body;
    if (!googleCalendarId) return res.status(400).json({ error: 'Google Calendar ID is required' });

    const promotion = await Promotion.findOne({ where: { id: req.params.promotionId } });
    if (!promotion) return res.status(404).json({ error: 'Promotion not found' });
    if (!canEditPromotion(promotion, req.user.id)) return res.status(403).json({ error: 'Unauthorized' });

    promotion.googleCalendarId = googleCalendarId;
    await sqlSave(promotion);
    res.json({ promotionId: promotion.id, googleCalendarId: promotion.googleCalendarId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== EXTENDED INFO ====================

app.get('/api/promotions/:promotionId/extended-info', async (req, res) => {
  try {
    const extendedInfo = await ExtendedInfo.findOne({ where: { promotionId: req.params.promotionId } });
    log.debug(`[GET /api/promotions/${req.params.promotionId}/extended-info] Found:`, !!extendedInfo);
    if (extendedInfo) {
      log.debug('[extended-info] Has competences:', !!extendedInfo.competences, 'count:', (extendedInfo.competences || []).length);
    }
    if (!extendedInfo) {
      return res.json({ schedule: {}, team: [], resources: [], evaluation: '', pildoras: [], pildorasAssignmentOpen: false, competences: [] });
    }
    res.json(extendedInfo);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/promotions/:promotionId/extended-info', verifyToken, async (req, res) => {
  try {
    const promotion = await Promotion.findOne({ where: { id: req.params.promotionId } });
    if (!promotion) return res.status(404).json({ error: 'Promotion not found' });
    if (!canEditPromotion(promotion, req.user.id)) return res.status(403).json({ error: 'Unauthorized' });

    if (req.body.modulesPildoras) {
    }

  const { schedule, team, resources, evaluation, pildoras, modulesPildoras, pildorasAssignmentOpen, competences,
            school, projectType, positiveExitStart, positiveExitEnd, totalHours,
            modality, presentialDays, materials, internships, funders, funderDeadlines,
            okrKpis, funderKpis, trainerDayOff, cotrainerDayOff, projectMeetings, teamMeetings,
            approvalName, approvalRole, projectEvaluations, projectCompetences, virtualClassroom } = req.body;

    // Build a $set object with ONLY the fields that were explicitly sent in the request body.
    // This prevents partial saves (e.g. _persistEvaluations sending only projectEvaluations)
    // from wiping out other fields like pildoras, competences, etc.
    const body = req.body;
    const $setFields = {};

    if (body.hasOwnProperty('schedule'))               $setFields.schedule = schedule || {};
    if (body.hasOwnProperty('team'))                   $setFields.team = Array.isArray(team) ? team : [];
    if (body.hasOwnProperty('resources'))              $setFields.resources = Array.isArray(resources) ? resources : [];
    if (body.hasOwnProperty('evaluation'))             $setFields.evaluation = evaluation || '';
    if (body.hasOwnProperty('pildoras'))               $setFields.pildoras = Array.isArray(pildoras) ? pildoras : [];
    if (body.hasOwnProperty('modulesPildoras'))        $setFields.modulesPildoras = Array.isArray(modulesPildoras) ? modulesPildoras : [];
    if (body.hasOwnProperty('pildorasAssignmentOpen')) $setFields.pildorasAssignmentOpen = !!pildorasAssignmentOpen;
    if (body.hasOwnProperty('competences'))            $setFields.competences = Array.isArray(competences) ? competences : [];
    if (body.hasOwnProperty('school'))                 $setFields.school = school || '';
    if (body.hasOwnProperty('projectType'))            $setFields.projectType = projectType || '';
    if (body.hasOwnProperty('positiveExitStart'))      $setFields.positiveExitStart = positiveExitStart || '';
    if (body.hasOwnProperty('positiveExitEnd'))        $setFields.positiveExitEnd = positiveExitEnd || '';
    if (body.hasOwnProperty('totalHours'))             $setFields.totalHours = totalHours || '';
    if (body.hasOwnProperty('modality'))               $setFields.modality = modality || '';
    if (body.hasOwnProperty('presentialDays'))         $setFields.presentialDays = presentialDays || '';
    if (body.hasOwnProperty('materials'))              $setFields.materials = materials || '';
    if (body.hasOwnProperty('internships'))            $setFields.internships = internships !== undefined ? internships : null;
    if (body.hasOwnProperty('funders'))                $setFields.funders = funders || '';
    if (body.hasOwnProperty('funderDeadlines'))        $setFields.funderDeadlines = funderDeadlines || '';
    if (body.hasOwnProperty('okrKpis'))                $setFields.okrKpis = okrKpis || '';
    if (body.hasOwnProperty('funderKpis'))             $setFields.funderKpis = funderKpis || '';
    if (body.hasOwnProperty('trainerDayOff'))          $setFields.trainerDayOff = trainerDayOff || '';
    if (body.hasOwnProperty('cotrainerDayOff'))        $setFields.cotrainerDayOff = cotrainerDayOff || '';
    if (body.hasOwnProperty('projectMeetings'))        $setFields.projectMeetings = projectMeetings || '';
    if (body.hasOwnProperty('teamMeetings'))           $setFields.teamMeetings = teamMeetings || '';
    if (body.hasOwnProperty('approvalName'))           $setFields.approvalName = approvalName || '';
    if (body.hasOwnProperty('approvalRole'))           $setFields.approvalRole = approvalRole || '';
    if (Array.isArray(projectEvaluations))             $setFields.projectEvaluations = projectEvaluations;
    if (Array.isArray(projectCompetences))             $setFields.projectCompetences = projectCompetences;
    if (body.hasOwnProperty('virtualClassroom'))       $setFields.virtualClassroom = virtualClassroom || {};
    // Final Update
    (async () => {
      let newInfo = await ExtendedInfo.findOne({ where: { promotionId: req.params.promotionId } });
      if (newInfo) {
        Object.assign(newInfo, $setFields);
        for (const k of Object.keys($setFields)) newInfo.changed(k, true);
        await newInfo.save();
      } else {
        newInfo = await ExtendedInfo.create({ promotionId: req.params.promotionId, ...$setFields });
      }
      return newInfo;
    })(); const newInfo = await ExtendedInfo.findOne({ where: { promotionId: req.params.promotionId } });

    // Mongoose "Mixed" type fields (like projectEvaluations, schedule, etc if defined as such)
    // sometimes need explicit marking if we are deeply Nesting objects, but findOneAndUpdate $set usually handles it.
    // However, to be extra safe for future saves:
    if ($setFields.projectEvaluations) newInfo.changed('projectEvaluations', true);
    if ($setFields.projectCompetences)  newInfo.changed('projectCompetences', true);
    if ($setFields.virtualClassroom)   newInfo.changed('virtualClassroom', true);
    if ($setFields.schedule)           newInfo.changed('schedule', true);
    
    await sqlSave(newInfo);

    res.json(newInfo);
  } catch (error) {
    console.error('Error saving extended info:', error);
    res.status(500).json({ error: error.message });
  }
});

// ==================== PROMOTION RESOURCES ====================
// Resources created by teachers for a promotion: videos, repos, canva/ppt presentations.
// Each resource has: id, title, description, module, type, url, status (draft|published), publishAt.
// Public endpoint only returns published resources (or ones whose publishAt has passed).

// GET — public access (only published)
app.get('/api/promotions/:promotionId/promotion-resources', async (req, res) => {
  try {
    const extendedInfo = await ExtendedInfo.findOne({ where: { promotionId: req.params.promotionId } });
    const all = extendedInfo?.promotionResources || [];
    const now = new Date();
    // Return only resources that are published or whose scheduled publishAt has passed
    const visible = all.filter(r => {
      if (r.status === 'published') return true;
      if (r.status === 'draft' && r.publishAt) {
        return new Date(r.publishAt) <= now;
      }
      return false;
    });
    res.json(visible);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET all (including drafts) — teacher only
app.get('/api/promotions/:promotionId/promotion-resources/all', verifyToken, async (req, res) => {
  try {
    const promotion = await Promotion.findOne({ where: { id: req.params.promotionId } });
    if (!promotion) return res.status(404).json({ error: 'Promotion not found' });
    if (!canEditPromotion(promotion, req.user.id)) return res.status(403).json({ error: 'Unauthorized' });
    const extendedInfo = await ExtendedInfo.findOne({ where: { promotionId: req.params.promotionId } });
    res.json(extendedInfo?.promotionResources || []);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST — create a new resource (draft by default)
app.post('/api/promotions/:promotionId/promotion-resources', verifyToken, async (req, res) => {
  try {
    const promotion = await Promotion.findOne({ where: { id: req.params.promotionId } });
    if (!promotion) return res.status(404).json({ error: 'Promotion not found' });
    if (!canEditPromotion(promotion, req.user.id)) return res.status(403).json({ error: 'Unauthorized' });

    const { title, description, module: moduleName, type, url, status, publishAt } = req.body;
    if (!title || !url) return res.status(400).json({ error: 'title and url are required' });

    const validTypes = ['video', 'repository', 'canva', 'powerpoint', 'other'];
    const validStatuses = ['draft', 'published'];

    const newResource = {
      id: uuidv4(),
      title: title.trim(),
      description: description?.trim() || '',
      module: moduleName?.trim() || '',
      type: validTypes.includes(type) ? type : 'other',
      url: url.trim(),
      status: validStatuses.includes(status) ? status : 'draft',
      publishAt: publishAt || null,
      createdAt: new Date().toISOString()
    };

    let extendedInfo = await ExtendedInfo.findOne({ where: { promotionId: req.params.promotionId } });
    if (!extendedInfo) {
      extendedInfo = await ExtendedInfo.create({ id: uuidv4(), promotionId: req.params.promotionId, promotionResources: [newResource] });
    } else {
      const list = extendedInfo.promotionResources || [];
      list.push(newResource);
      extendedInfo.promotionResources = list;
      await sqlSave(extendedInfo);
    }

    res.status(201).json(newResource);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT — update a resource (including publish/unpublish/schedule)
app.put('/api/promotions/:promotionId/promotion-resources/:resourceId', verifyToken, async (req, res) => {
  try {
    const promotion = await Promotion.findOne({ where: { id: req.params.promotionId } });
    if (!promotion) return res.status(404).json({ error: 'Promotion not found' });
    if (!canEditPromotion(promotion, req.user.id)) return res.status(403).json({ error: 'Unauthorized' });

    const extendedInfo = await ExtendedInfo.findOne({ where: { promotionId: req.params.promotionId } });
    if (!extendedInfo) return res.status(404).json({ error: 'Extended info not found' });

    const list = extendedInfo.promotionResources || [];
    const idx = list.findIndex(r => r.id === req.params.resourceId);
    if (idx === -1) return res.status(404).json({ error: 'Resource not found' });

    const validTypes = ['video', 'repository', 'canva', 'powerpoint', 'other'];
    const validStatuses = ['draft', 'published'];
    const { title, description, module: moduleName, type, url, status, publishAt } = req.body;

    const updated = { ...list[idx] };
    if (title !== undefined)       updated.title = title.trim();
    if (description !== undefined) updated.description = description.trim();
    if (moduleName !== undefined)  updated.module = moduleName.trim();
    if (type !== undefined)        updated.type = validTypes.includes(type) ? type : updated.type;
    if (url !== undefined)         updated.url = url.trim();
    if (status !== undefined)      updated.status = validStatuses.includes(status) ? status : updated.status;
    if (publishAt !== undefined)   updated.publishAt = publishAt || null;
    updated.updatedAt = new Date().toISOString();

    list[idx] = updated;
    extendedInfo.promotionResources = list;
    await sqlSave(extendedInfo);

    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE — remove a resource
app.delete('/api/promotions/:promotionId/promotion-resources/:resourceId', verifyToken, async (req, res) => {
  try {
    const promotion = await Promotion.findOne({ where: { id: req.params.promotionId } });
    if (!promotion) return res.status(404).json({ error: 'Promotion not found' });
    if (!canEditPromotion(promotion, req.user.id)) return res.status(403).json({ error: 'Unauthorized' });

    const extendedInfo = await ExtendedInfo.findOne({ where: { promotionId: req.params.promotionId } });
    if (!extendedInfo) return res.status(404).json({ error: 'Extended info not found' });

    const list = extendedInfo.promotionResources || [];
    const filtered = list.filter(r => r.id !== req.params.resourceId);
    if (filtered.length === list.length) return res.status(404).json({ error: 'Resource not found' });

    extendedInfo.promotionResources = filtered;
    await sqlSave(extendedInfo);

    res.json({ message: 'Resource deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== ASANA CONTENT ====================

// GET asana content URL
app.get('/api/promotions/:promotionId/asana-content', async (req, res) => {
  try {
    const extendedInfo = await ExtendedInfo.findOne({ where: { promotionId: req.params.promotionId } });
    if (!extendedInfo) {
      return res.json({ asanaContentUrl: '' });
    }
    res.json({ asanaContentUrl: extendedInfo.asanaContentUrl || '' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST/UPDATE asana content URL
app.post('/api/promotions/:promotionId/asana-content', verifyToken, async (req, res) => {
  try {
    const promotion = await Promotion.findOne({ where: { id: req.params.promotionId } });
    if (!promotion) return res.status(404).json({ error: 'Promotion not found' });
    if (!canEditPromotion(promotion, req.user.id)) return res.status(403).json({ error: 'Unauthorized' });

    const { asanaContentUrl } = req.body;
    (async () => {
      let _ei = await ExtendedInfo.findOne({ where: { promotionId: req.params.promotionId } });
      if (_ei) { _ei.asanaContentUrl = asanaContentUrl || ''; _ei.changed('asanaContentUrl', true); await _ei.save(); }
      else { _ei = await ExtendedInfo.create({ promotionId: req.params.promotionId, asanaContentUrl: asanaContentUrl || '' }); }
      return _ei;
    })(); const updatedInfo = await ExtendedInfo.findOne({ where: { promotionId: req.params.promotionId } });
    res.json({ asanaContentUrl: updatedInfo.asanaContentUrl });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== SHARED NOTES ====================

// GET shared notes for a promotion
app.get('/api/promotions/:promotionId/shared-notes', verifyToken, async (req, res) => {
  try {
    const extendedInfo = await ExtendedInfo.findOne({ where: { promotionId: req.params.promotionId } });
    res.json({ sharedNotes: extendedInfo?.sharedNotes || [] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT shared notes — replaces the full array (client sends the whole list)
app.put('/api/promotions/:promotionId/shared-notes', verifyToken, async (req, res) => {
  try {
    const promotion = await Promotion.findOne({ where: { id: req.params.promotionId } });
    if (!promotion) return res.status(404).json({ error: 'Promotion not found' });
    if (!canEditPromotion(promotion, req.user.id)) return res.status(403).json({ error: 'Unauthorized' });

    const notes = Array.isArray(req.body.sharedNotes) ? req.body.sharedNotes : [];
    (async () => {
      let _ei = await ExtendedInfo.findOne({ where: { promotionId: req.params.promotionId } });
      if (_ei) { _ei.sharedNotes = notes; _ei.changed('sharedNotes', true); await _ei.save(); }
      else { _ei = await ExtendedInfo.create({ promotionId: req.params.promotionId, sharedNotes: notes }); }
      return _ei;
    })(); const updated = await ExtendedInfo.findOne({ where: { promotionId: req.params.promotionId } });
    res.json({ sharedNotes: updated.sharedNotes || [] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE asana content URL
app.delete('/api/promotions/:promotionId/asana-content', verifyToken, async (req, res) => {
  try {
    const promotion = await Promotion.findOne({ where: { id: req.params.promotionId } });
    if (!promotion) return res.status(404).json({ error: 'Promotion not found' });
    if (!canEditPromotion(promotion, req.user.id)) return res.status(403).json({ error: 'Unauthorized' });

    await (async () => {
      const _ei = await ExtendedInfo.findOne({ where: { promotionId: req.params.promotionId } });
      if (_ei) { _ei.asanaContentUrl = ''; _ei.changed('asanaContentUrl', true); await _ei.save(); }
    })();
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== PUBLIC STUDENT ASSIGNMENT ====================

// Public students list (minimal info for dropdowns)
app.get('/api/promotions/:promotionId/public-students', async (req, res) => {
  try {
    const students = await Student.findAll({ where: { promotionId: req.params.promotionId } });
    res.json(students);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Public píldora self-assignment
app.put('/api/promotions/:promotionId/pildoras-self-assign', async (req, res) => {
  try {
    const { moduleId, pildoraIndex, studentId, action, isLegacy } = req.body; // action: 'add' or 'remove'
    if (pildoraIndex === undefined || !studentId) {
      return res.status(400).json({ error: 'pildoraIndex and studentId are required' });
    }

    const extendedInfo = await ExtendedInfo.findOne({ where: { promotionId: req.params.promotionId } });
    if (!extendedInfo || !extendedInfo.pildorasAssignmentOpen) {
      return res.status(403).json({ error: 'Self-assignment is currently closed by the teacher' });
    }

    const student = await Student.findOne({ where: { id: studentId, promotionId: req.params.promotionId } });
    if (!student) return res.status(404).json({ error: 'Student not found' });

    let pildora;
    if (isLegacy) {
      if (!extendedInfo.pildoras || !extendedInfo.pildoras[pildoraIndex]) {
        return res.status(404).json({ error: 'Legacy píldora not found' });
      }
      pildora = extendedInfo.pildoras[pildoraIndex];
    } else {
      if (!moduleId) return res.status(400).json({ error: 'moduleId is required for module-based píldoras' });
      const modulePildoras = extendedInfo.modulesPildoras.find(m => m.moduleId === moduleId);
      if (!modulePildoras || !modulePildoras.pildoras[pildoraIndex]) {
        return res.status(404).json({ error: 'Píldora not found' });
      }
      pildora = modulePildoras.pildoras[pildoraIndex];
    }

    if (action === 'add') {
      // Avoid duplicates
      if (!pildora.students.some(s => s.id === studentId)) {
        pildora.students.push({
          id: student.id,
          name: student.name,
          lastname: student.lastname
        });
      }
    } else if (action === 'remove') {
      pildora.students = pildora.students.filter(s => s.id !== studentId);
    }

    await sqlSave(extendedInfo);
    res.json({ message: 'Assignment updated successfully', pildora });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== AULA VIRTUAL (PUBLIC STUDENT VIEW) ====================

// Public endpoint to expose current active Aula Virtual configuration for students
app.get('/api/promotions/:promotionId/virtual-classroom', async (req, res) => {
  try {
    const promotionId = req.params.promotionId;
    const ext = await ExtendedInfo.findOne({ where: { promotionId } });
    if (!ext || !ext.virtualClassroom || !ext.virtualClassroom.isActive) {
      return res.json({ active: false });
    }

    const vc = ext.virtualClassroom || {};
    const promotion = await Promotion.findOne({ where: { id: promotionId } });
    if (!promotion) {
      return res.status(404).json({ error: 'Promotion not found' });
    }

    const modules = promotion.modules || [];
    const module = modules.find(m => String(m.id || '') === String(vc.moduleId));
    const project = module ? (module.projects || []).find(p => p.name === vc.projectName) : null;

    // Resolve competences for this project from ExtendedInfo.projectCompetences + competences catalog
    log.debug(`[DEBUG] Resolving VC competences for ${promotionId}. ext.competences count: ${((ext || {}).competences || []).length}`);
    if (ext && ext.competences && ext.competences.length > 0) {
       const first = ext.competences[0];
       log.debug(`[DEBUG] First comp in DB: ${first.name}, levels: ${(first.levels || []).length}, compInds: ${!!first.competenceIndicators}`);
    }
    let competences = [];
    if (Array.isArray(ext.projectCompetences) && Array.isArray(ext.competences)) {
      const pcEntry = ext.projectCompetences.find(
        pc => pc.moduleId === vc.moduleId && pc.projectName === vc.projectName
      );
      const compIds = pcEntry ? (pcEntry.competenceIds || []) : [];
      const pcTools = (pcEntry && pcEntry.competenceTools) ? pcEntry.competenceTools : {};

      competences = compIds.map(cid => {
        const cidStr = String(cid);
        const c = ext.competences.find(ec => String(ec.id) === cidStr);
        if (!c) return { id: cid, name: cidStr, area: '', description: '', levels: [], selectedTools: [] };

        // Pull selected tools for this COMP from the project-specific map (pcEntry.competenceTools)
        const selectedTools = pcTools[cidStr] || [];

        return {
          id: c.id,
          name: c.name,
          area: c.area || '',
          description: c.description || '',
          levels: c.levels || [],
          selectedTools: selectedTools,
          // Filtering tool detail objects to only those selected in pcTools
          toolsWithIndicators: (c.toolsWithIndicators || []).filter(ti => selectedTools.includes(ti.name)),
          competenceIndicators: c.competenceIndicators || { initial: [], medio: [], advance: [] }
        };
      });
    }

    // Resolve groups for grupal projects from projectEvaluations
    let groups = [];
    if (vc.projectType === 'grupal' && Array.isArray(ext.projectEvaluations)) {
      const evalEntry = ext.projectEvaluations.find(
        e => e.moduleId === vc.moduleId && e.projectName === vc.projectName
      );
      if (evalEntry && Array.isArray(evalEntry.groups)) {
        groups = evalEntry.groups.map(g => ({
          groupName: g.groupName,
          studentIds: g.studentIds || []
        }));
      }
    }

    res.json({
      active: true,
      projectType: vc.projectType || 'individual',
      repoBaseUrl: vc.repoBaseUrl || '',
      briefingUrl: vc.briefingUrl || (project ? project.url || '' : ''),
      project: {
        moduleId: vc.moduleId || (module ? module.id : ''),
        moduleName: module ? module.name : '',
        projectName: vc.projectName || (project ? project.name : ''),
      },
      competences,
      groups
    });
  } catch (error) {
    console.error('[GET /api/promotions/:promotionId/virtual-classroom]', error);
    res.status(500).json({ error: error.message });
  }
});

// Public endpoint for students/teams to submit Aula Virtual repository links
app.post('/api/promotions/:promotionId/virtual-classroom/submissions', async (req, res) => {
  try {
    const promotionId = req.params.promotionId;
    const { type, studentId, groupName, repoName } = req.body;

    if (!repoName || typeof repoName !== 'string' || !repoName.trim()) {
      return res.status(400).json({ error: 'Repository name is required' });
    }

    const ext = await ExtendedInfo.findOne({ where: { promotionId } });
    if (!ext || !ext.virtualClassroom || !ext.virtualClassroom.isActive) {
      return res.status(400).json({ error: 'No active virtual classroom project for this promotion' });
    }

    const vc = ext.virtualClassroom;
    log.debug('[DEBUG] Active Virtual Classroom project:', vc);
    const projectType = vc.projectType || 'individual';

    if (projectType === 'individual') {
      if (!studentId) return res.status(400).json({ error: 'studentId is required for individual projects' });
    } else if (projectType === 'grupal') {
      if (!groupName) return res.status(400).json({ error: 'groupName is required for group projects' });
    }

    const repoBaseUrl = vc.repoBaseUrl || '';
    const fullUrl = repoBaseUrl ? `${repoBaseUrl.replace(/\/+$/,'')}/${repoName.trim()}` : repoName.trim();

    if (!Array.isArray(ext.projectEvaluations)) {
      ext.projectEvaluations = [];
    }

    const moduleId = vc.moduleId;
    const projectName = vc.projectName;

    let evalEntry = ext.projectEvaluations.find(
      e => e.moduleId === moduleId && e.projectName === projectName
    );
    log.debug('[DEBUG] Found evalEntry:', !!evalEntry, { moduleId, projectName });
    if (!evalEntry) {
      evalEntry = {
        moduleId,
        moduleName: '',
        projectName,
        type: projectType,
        groups: [],
        evaluations: []
      };
      ext.projectEvaluations.push(evalEntry);
    }

    let targetId;
    if (projectType === 'individual') {
      targetId = String(studentId);
    } else {
      targetId = String(groupName);
      if (!Array.isArray(evalEntry.groups)) evalEntry.groups = [];
      if (!evalEntry.groups.some(g => g.groupName === targetId)) {
        evalEntry.groups.push({ groupName: targetId, studentIds: [] });
      }
    }

    if (!Array.isArray(evalEntry.evaluations)) {
      evalEntry.evaluations = [];
    }

    let targetEval = evalEntry.evaluations.find(e => String(e.targetId) === String(targetId));
    if (!targetEval) {
      targetEval = {
        targetId,
        targetName: '',
        competences: [],
        feedback: '',
        studentComment: ''
      };
      evalEntry.evaluations.push(targetEval);
    }

    targetEval.submissionLink = fullUrl;
    targetEval.submissionStatus = 'Entregado';
    targetEval.submittedAt = new Date().toISOString();

    log.debug('[DEBUG] Saved submission:', { moduleId, projectName, targetId, submissionLink: targetEval.submissionLink, status: targetEval.submissionStatus });

    ext.changed('projectEvaluations', true);
    await sqlSave(ext);

    res.json({ message: 'Entrega registrada correctamente', submissionLink: fullUrl });
  } catch (error) {
    console.error('[POST /api/promotions/:promotionId/virtual-classroom/submissions]', error);
    res.status(500).json({ error: error.message });
  }
});

// ==================== TEACHERS & COLLABORATORS ====================

app.get('/api/teachers', verifyToken, async (req, res) => {
  try {
    const teachers = await Teacher.findAll();
    const result = teachers.map(t => ({
      id: t.id,
      name: t.name,
      email: t.email,
      userRole: t.userRole || 'Formador/a'
    }));
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/teachers/:id', verifyToken, async (req, res) => {
  try {
    const { name, email, userRole } = req.body;
    if (email) {
      const existing = await Teacher.findOne({ where: { email, id: { [Op.ne]: req.params.id } } });
      if (existing) return res.status(400).json({ error: 'Email already in use' });
    }
    const teacher = await Teacher.findOne({ where: { id: req.params.id } });
    if (!teacher) return res.status(404).json({ error: 'Teacher not found' });
    if (name !== undefined) teacher.name = name;
    if (email !== undefined) teacher.email = email;
    if (userRole !== undefined) teacher.userRole = userRole;
    await sqlSave(teacher);
    res.json(teacher);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/promotions/:promotionId/collaborators', verifyToken, async (req, res) => {
  try {
    const promotion = await Promotion.findOne({ where: { id: req.params.promotionId } });
    if (!promotion) return res.status(404).json({ error: 'Promotion not found' });

    const collaboratorIds = promotion.collaborators || [];
    const collaborators = await Teacher.findAll({ where: { id: { [Op.in]: collaboratorIds } } });
    const owner = await Teacher.findOne({ where: { id: promotion.teacherId } });

    const result = [];
    if (owner) {
      result.push({
        id: owner.id, name: owner.name, email: owner.email,
        userRole: owner.userRole || 'Formador/a',
        isOwner: true,
        moduleIds: promotion.ownerModules || []
      });
    }
    collaborators.forEach(c => {
      const entry = (promotion.collaboratorModules || []).find(m => m.teacherId === c.id);
      result.push({
        id: c.id, name: c.name, email: c.email,
        userRole: c.userRole || 'Formador/a',
        isOwner: false,
        moduleIds: entry ? entry.moduleIds : []
      });
    });
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/promotions/:promotionId/collaborators', verifyToken, async (req, res) => {
  try {
    const { teacherId, moduleIds } = req.body;
    if (!teacherId) return res.status(400).json({ error: 'Teacher ID is required' });

    const promotion = await Promotion.findOne({ where: { id: req.params.promotionId } });
    if (!promotion) return res.status(404).json({ error: 'Promotion not found' });

    if (promotion.teacherId !== req.user.id) return res.status(403).json({ error: 'Only owner can add collaborators' });
    if (teacherId === promotion.teacherId) return res.status(400).json({ error: 'Cannot add owner as collaborator' });

    if (!promotion.collaborators) promotion.collaborators = [];
    if (promotion.collaborators.includes(teacherId)) return res.status(400).json({ error: 'Teacher already a collaborator' });

    promotion.collaborators.push(teacherId);

    if (!promotion.collaboratorModules) promotion.collaboratorModules = [];
    const resolvedModuleIds = Array.isArray(moduleIds) ? moduleIds : [];
    promotion.collaboratorModules.push({ teacherId, moduleIds: resolvedModuleIds });
    promotion.changed('collaborators', true);
    promotion.changed('collaboratorModules', true);

    await sqlSave(promotion);
    const teacher = await Teacher.findOne({ where: { id: teacherId } });
    res.status(201).json({ message: 'Collaborator added', collaborator: teacher });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update module assignments for a collaborator or the owner
app.put('/api/promotions/:promotionId/collaborators/:teacherId/modules', verifyToken, async (req, res) => {
  try {
    const { moduleIds } = req.body;
    if (!Array.isArray(moduleIds)) return res.status(400).json({ error: 'moduleIds must be an array' });

    const promotion = await Promotion.findOne({ where: { id: req.params.promotionId } });
    if (!promotion) return res.status(404).json({ error: 'Promotion not found' });
    const isOwner = promotion.teacherId === req.user.id;
    const isCollab = (promotion.collaborators || []).includes(req.user.id);
    const isAdmin = req.user.userRole === 'superadmin';
    if (!isOwner && !isCollab && !isAdmin) return res.status(403).json({ error: 'Only teaching team can manage module assignments' });

    if (req.params.teacherId === promotion.teacherId) {
      promotion.ownerModules = moduleIds;
      promotion.changed('ownerModules', true);
    } else {
      if (!promotion.collaboratorModules) promotion.collaboratorModules = [];
      const entry = promotion.collaboratorModules.find(m => m.teacherId === req.params.teacherId);
      if (entry) {
        entry.moduleIds = moduleIds;
      } else {
        promotion.collaboratorModules.push({ teacherId: req.params.teacherId, moduleIds });
      }
      promotion.changed('collaboratorModules', true);
    }
    await sqlSave(promotion);
    res.json({ message: 'Module assignments updated' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/promotions/:promotionId/collaborators/:teacherId', verifyToken, async (req, res) => {
  try {
    const promotion = await Promotion.findOne({ where: { id: req.params.promotionId } });
    if (!promotion) return res.status(404).json({ error: 'Promotion not found' });

    const isOwner = promotion.teacherId === req.user.id;
    const isCollab = (promotion.collaborators || []).includes(req.user.id);
    const isAdmin = req.user.userRole === 'superadmin';
    if (!isOwner && !isCollab && !isAdmin) return res.status(403).json({ error: 'Only teaching team can manage collaborators' });

    promotion.collaborators = (promotion.collaborators || []).filter(id => id !== req.params.teacherId);
    promotion.collaboratorModules = (promotion.collaboratorModules || []).filter(m => m.teacherId !== req.params.teacherId);
    promotion.changed('collaborators', true);
    promotion.changed('collaboratorModules', true);
    await sqlSave(promotion);
    res.json({ message: 'Collaborator removed' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== ADMIN ====================

const verifyAdmin = (req, res, next) => {
  // Only ROLE_SUPER_ADMIN from the external JWT maps to 'superadmin'.
  // The local 'admin' role no longer exists.
  if (req.user && req.user.role === 'superadmin') next();
  else res.status(403).json({ error: 'Superadmin role required' });
};

// Create a template from an existing promotion
app.post('/api/admin/templates-from-promotion', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { promotionId, templateName, templateDescription } = req.body;
    if (!promotionId || !templateName) {
      return res.status(400).json({ error: 'promotionId and templateName are required' });
    }

    const promotion = await Promotion.findOne({ where: { id: promotionId } });
    if (!promotion) return res.status(404).json({ error: 'Promotion not found' });

    const extInfo = await ExtendedInfo.findOne({ where: { promotionId } });

    const templateId = `custom-${uuidv4()}`;

    const templateData = {
      id: templateId,
      name: templateName,
      description: templateDescription || promotion.description || '',
      weeks: promotion.weeks || 36,
      hours: promotion.hours || 1250,
      hoursPerWeek: promotion.hoursPerWeek || Math.round((promotion.hours || 1250) / (promotion.weeks || 36)),
      isCustom: true,
      createdBy: req.user.id,
      // Modules from promotion (strip student-specific data, keep structure)
      modules: (promotion.modules || []).map(m => ({
        name: m.name,
        duration: m.duration,
        courses: (m.courses || []).map(({ name, url, duration, startOffset }) => ({ name, url: url || '', duration: duration || 1, startOffset: startOffset || 0 })),
        projects: (m.projects || []).map(({ name, url, duration, startOffset }) => ({ name, url: url || '', duration: duration || 1, startOffset: startOffset || 0 }))
      })),
      // Employability from promotion
      employability: (promotion.employability || []).map(({ name, url, startMonth, duration }) => ({ name, url: url || '', startMonth: startMonth || 1, duration: duration || 1 })),
      // All ExtendedInfo fields
      evaluation: extInfo?.evaluation || '',
      resources: (extInfo?.resources || []).map(({ title, category, url }) => ({ title, category, url })),
      competences: (extInfo?.competences || []).map(c => ({
        id: c.id,
        area: c.area,
        name: c.name,
        description: c.description,
        levels: (c.levels || []).map(l => ({ level: l.level, description: l.description, indicators: l.indicators || [] })),
        allTools: c.allTools || [],
        selectedTools: c.selectedTools || [],
        startModule: c.startModule ? { id: '', name: c.startModule.name || '' } : { id: '', name: '' }
      })),
      schedule: extInfo?.schedule || {},
      modulesPildoras: (extInfo?.modulesPildoras || []).map(mp => ({
        moduleName: mp.moduleName,
        pildoras: (mp.pildoras || []).map(p => ({ title: p.title, mode: p.mode || 'Virtual' }))
      })),
      school: extInfo?.school || '',
      projectType: extInfo?.projectType || '',
      totalHours: extInfo?.totalHours || String(promotion.hours || ''),
      modality: extInfo?.modality || '',
      materials: extInfo?.materials || '',
      internships: extInfo?.internships !== undefined ? extInfo.internships : null,
      funders: extInfo?.funders || '',
      funderDeadlines: extInfo?.funderDeadlines || '',
      okrKpis: extInfo?.okrKpis || '',
      funderKpis: extInfo?.funderKpis || '',
      projectMeetings: extInfo?.projectMeetings || '',
      teamMeetings: extInfo?.teamMeetings || '',
      trainerDayOff: extInfo?.trainerDayOff || '',
      cotrainerDayOff: extInfo?.cotrainerDayOff || ''
    };

    (async () => {
      const [_bt] = await BootcampTemplate.upsert({ id: templateId, ...templateData });
      return _bt;
    })(); const template = await BootcampTemplate.findOne({ where: { id: templateId } });

    res.status(201).json(template);
  } catch (error) {
    console.error('[POST /api/admin/templates-from-promotion]', error);
    res.status(500).json({ error: error.message });
  }
});

// Get all promotions (admin view, with names)
app.get('/api/admin/all-promotions', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const promotions = await Promotion.findAll();
    res.json(promotions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/admin/teachers', verifyToken, verifyAdmin, async (req, res) => {
  try {
    // Exclude soft-deleted teachers from the listing
    const teachers = await Teacher.findAll({ where: { deletedAt: null } });
    res.json(teachers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/admin/teachers', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { email, name, userRole } = req.body;
    if (!email || !name) return res.status(400).json({ error: 'Email and name are required' });

    const existing = await Teacher.findOne({ where: { email } });
    if (existing) return res.status(400).json({ error: 'Email already registered' });

    const provisionalPassword = Math.random().toString(36).slice(-10) + 'A1!';

    // ── Register user in the external auth API first (mandatory) ────────────
    // If external registration fails the local record is NOT created.
    let extRegData = {};
    try {
      const extRegRes = await fetch(`${EXTERNAL_AUTH_BASE}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: provisionalPassword, name })
      });
      extRegData = await extRegRes.json().catch(() => ({}));
      if (!extRegRes.ok || extRegData.success === false) {
        const errMsg = extRegData.message || extRegData.error || `External API returned ${extRegRes.status}`;
        return res.status(422).json({
          error: 'External registration failed — local account NOT created.',
          detail: errMsg
        });
      }
    } catch (extErr) {
      console.error('[admin/teachers POST] External register unreachable:', extErr.message);
      return res.status(502).json({
        error: 'External auth server unreachable — local account NOT created.',
        detail: extErr.message
      });
    }

    // ── External registration succeeded — persist only platform data ────────
    // No password is stored locally; authentication is fully external.
    const validUserRoles = ['Formador/a', 'CoFormador/a', 'Coordinador/a'];
    const resolvedUserRole = validUserRoles.includes(userRole) ? userRole : 'Formador/a';
    const teacher = await Teacher.create({
      id: uuidv4(),
      name,
      email,
      userRole: resolvedUserRole
    });

    // Send welcome email with provisional password
    const emailSent = await sendPasswordEmail(email, name, provisionalPassword);

    const responsePayload = {
      teacher: { id: teacher.id, name: teacher.name, email: teacher.email },
      provisionalPassword
    };
    if (!emailSent) {
      responsePayload.emailWarning = 'Password email could not be sent. Please share the provisional password manually.';
    }

    res.status(201).json({
      message: 'User registered in auth system and local account created.',
      ...responsePayload
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/admin/teachers/:id', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const validUserRoles = ['Formador/a', 'CoFormador/a', 'Coordinador/a'];
    const { name, email, userRole } = req.body;
    const updates = {};
    if (name) updates.name = name;
    if (email) updates.email = email;
    if (userRole && validUserRoles.includes(userRole)) updates.userRole = userRole;
    (async () => {
      const _t = await Teacher.findOne({ where: { id: req.params.id } });
      if (_t) { Object.assign(_t, updates); await sqlSave(_t); return _t; }
      return null;
    })(); const teacher = await Teacher.findOne({ where: { id: req.params.id } });
    if (!teacher) return res.status(404).json({ error: 'Teacher not found' });
    res.json(teacher);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/admin/teachers/:id', verifyToken, verifyAdmin, async (req, res) => {
  try {
    // Soft-delete: set deletedAt instead of destroying the row so that
    // historical references in promotions.teacherId remain valid.
    const teacher = await Teacher.findOne({ where: { id: req.params.id, deletedAt: null } });
    if (!teacher) return res.status(404).json({ error: 'Teacher not found' });
    teacher.deletedAt = new Date();
    await teacher.save();
    res.json({ message: 'Teacher deactivated (soft-deleted)' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
});
