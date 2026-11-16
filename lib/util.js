// droply · utilitários do servidor (sem dependências externas)
const env = (k, d = '') => (process.env[k] ?? d).toString().trim();

export const LIMITS = {
  search: parseInt(env('LIMIT_SEARCHES', '30'), 10),   // pesquisas por mês por utilizador
  analyze: parseInt(env('LIMIT_ANALYSES', '150'), 10), // análises de leads por mês
  site: parseInt(env('LIMIT_SITES', '10'), 10),        // sites gerados por mês
};

export function send(res, status, data) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(data));
}

export async function body(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') { try { return JSON.parse(req.body); } catch { return {}; } }
  const chunks = [];
  for await (const c of req) chunks.push(c);
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}'); } catch { return {}; }
}

/* ---------- Autenticação Google (verifica o ID token) ---------- */
const tokenCache = new Map();
export async function verifyGoogle(req) {
  const h = req.headers['authorization'] || '';
  const token = h.startsWith('Bearer ') ? h.slice(7) : '';
  if (!token) throw httpError(401, 'Sessão em falta. Entra com o Google.');
  const cached = tokenCache.get(token);
  if (cached && cached.exp * 1000 > Date.now()) return cached;
  const r = await fetch('https://oauth2.googleapis.com/tokeninfo?id_token=' + encodeURIComponent(token));
  if (!r.ok) throw httpError(401, 'Sessão expirada. Entra outra vez com o Google.');
  const p = await r.json();
  const clientId = env('GOOGLE_CLIENT_ID');
  if (clientId && p.aud !== clientId) throw httpError(401, 'Token Google inválido para esta aplicação.');
  if (p.email_verified !== 'true' && p.email_verified !== true) throw httpError(401, 'E-mail Google não verificado.');
  if (parseInt(p.exp, 10) * 1000 < Date.now()) throw httpError(401, 'Sessão expirada. Entra outra vez com o Google.');
  const user = { email: String(p.email).toLowerCase(), name: p.name || p.given_name || '', picture: p.picture || '', exp: parseInt(p.exp, 10) };
  tokenCache.set(token, user);
  if (tokenCache.size > 500) tokenCache.delete(tokenCache.keys().next().value);
  return user;
}
export function httpError(status, message) { const e = new Error(message); e.status = status; return e; }

/* ---------- Upstash Redis (REST) para limites e lista de acesso ---------- */
const KV_URL = () => env('KV_REST_API_URL') || env('UPSTASH_REDIS_REST_URL');
const KV_TOKEN = () => env('KV_REST_API_TOKEN') || env('UPSTASH_REDIS_REST_TOKEN');
export const kvOn = () => !!(KV_URL() && KV_TOKEN());
export async function kv(...cmd) {
  if (!kvOn()) return null;
  const r = await fetch(KV_URL(), { method: 'POST', headers: { Authorization: 'Bearer ' + KV_TOKEN(), 'Content-Type': 'application/json' }, body: JSON.stringify(cmd) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || j.error) throw new Error('KV: ' + (j.error || r.status));
  return j.result;
}

/* ---------- Acesso ---------- */
const list = k => env(k).toLowerCase().split(/[\s,;]+/).filter(Boolean);
export const isAdmin = email => list('ADMIN_EMAILS').includes(email);
export async function isAllowed(email) {
  if (isAdmin(email)) return true;
  if (env('OPEN_ACCESS') === 'true') return true;
  if (list('ALLOWED_EMAILS').includes(email)) return true;
  if (kvOn()) return (await kv('SISMEMBER', 'droply:allow', email)) === 1;
  return false;
}
export async function requireUser(req) {
  const user = await verifyGoogle(req);
  if (!(await isAllowed(user.email))) throw httpError(403, 'A tua conta ainda não tem acesso ao droply.');
  user.admin = isAdmin(user.email);
  return user;
}

/* ---------- Limites mensais ---------- */
const month = () => new Date().toISOString().slice(0, 7);
const qkey = (email, kind) => `droply:q:${month()}:${kind}:${email}`;
export async function usage(email) {
  const out = {};
  for (const k of Object.keys(LIMITS)) {
    const v = kvOn() ? await kv('GET', qkey(email, k)) : null;
    out[k] = { used: parseInt(v || '0', 10), limit: LIMITS[k] };
  }
  return out;
}
export async function consume(user, kind, n = 1) {
  if (user.admin && env('ADMIN_UNLIMITED', 'true') === 'true') return;
  if (!kvOn()) return; // sem KV: sem contagem (ver README)
  const used = parseInt((await kv('GET', qkey(user.email, kind))) || '0', 10);
  if (used + n > LIMITS[kind]) {
    const nomes = { search: 'pesquisas', analyze: 'análises', site: 'sites' };
    throw httpError(429, `Chegaste ao limite de ${LIMITS[kind]} ${nomes[kind]} este mês. O limite renova no dia 1.`);
  }
  await kv('INCRBY', qkey(user.email, kind), n);
  await kv('EXPIRE', qkey(user.email, kind), 60 * 60 * 24 * 40);
}

/* ---------- IA (OpenAI ou Anthropic) ---------- */
export async function ai({ system, user, json = true, maxTokens = 1800, temperature = 0.6 }) {
  const provider = env('AI_PROVIDER', env('ANTHROPIC_API_KEY') ? 'anthropic' : 'openai');
  if (provider === 'anthropic') {
    const key = env('ANTHROPIC_API_KEY');
    if (!key) throw httpError(500, 'Falta configurar ANTHROPIC_API_KEY.');
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({ model: env('AI_MODEL', 'claude-haiku-4-5'), max_tokens: maxTokens, temperature, system, messages: [{ role: 'user', content: user }] }),
    });
    const j = await r.json();
    if (!r.ok) throw httpError(502, 'Erro da IA: ' + (j.error?.message || r.status));
    const text = (j.content || []).map(c => c.text || '').join('');
    return json ? parseJSON(text) : text;
  }
  const key = env('OPENAI_API_KEY');
  if (!key) throw httpError(500, 'Falta configurar OPENAI_API_KEY.');
  const r = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + key, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: env('AI_MODEL', 'gpt-4.1-mini'), temperature, max_tokens: maxTokens,
      ...(json ? { response_format: { type: 'json_object' } } : {}),
      messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
    }),
  });
  const j = await r.json();
  if (!r.ok) throw httpError(502, 'Erro da IA: ' + (j.error?.message || r.status));
  const text = j.choices?.[0]?.message?.content || '';
  return json ? parseJSON(text) : text;
}
export function parseJSON(text) {
  const t = String(text).replace(/^```(?:json)?/m, '').replace(/```\s*$/m, '').trim();
  try { return JSON.parse(t); } catch {}
  const a = t.indexOf('{'), b = t.lastIndexOf('}');
  if (a >= 0 && b > a) { try { return JSON.parse(t.slice(a, b + 1)); } catch {} }
  throw httpError(502, 'A IA devolveu uma resposta inválida. Tenta outra vez.');
}

export function handler(fn) {
  return async (req, res) => {
    try { await fn(req, res); }
    catch (e) { send(res, e.status || 500, { error: e.message || 'Erro inesperado.' }); if (!e.status) console.error(e); }
  };
}
export { env };
