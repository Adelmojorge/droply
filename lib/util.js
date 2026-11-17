// droply · utilitários do servidor (sem dependências externas)
const env = (k, d = '') => (process.env[k] ?? d).toString().trim();

/* ---------- Planos ---------- */
const n = (k, d) => parseInt(env(k, String(d)), 10);
export const PLANS = {
  basico: { name: 'Básico', price: n('PRICE_BASICO', 6500), search: n('BASICO_SEARCHES', 30), analyze: n('BASICO_ANALYSES', 150), site: n('BASICO_SITES', 10), studio: 0, number: false },
  pro:    { name: 'Pro',    price: n('PRICE_PRO', 14900),  search: n('PRO_SEARCHES', 80),    analyze: n('PRO_ANALYSES', 400),    site: n('PRO_SITES', 30),    studio: n('PRO_STUDIO', 80), number: true },
};
export const KINDS = ['search', 'analyze', 'site', 'studio'];
export const LIMITS = { search: PLANS.basico.search, analyze: PLANS.basico.analyze, site: PLANS.basico.site, studio: PLANS.pro.studio };

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

/* ---------- Autenticação (sessão do Supabase) ---------- */
export const SB_URL = env('SUPABASE_URL', 'https://mlsjpyqyyghlcqkrpwbb.supabase.co');
export const SB_KEY = env('SUPABASE_PUBLISHABLE_KEY', 'sb_publishable_A5qbXH9R0hUiz-MjqzfACw_pSSy_55c');
const tokenCache = new Map();
async function sbGet(path, token) {
  const r = await fetch(SB_URL + path, { headers: { apikey: SB_KEY, Authorization: 'Bearer ' + token } });
  if (!r.ok) return null;
  return r.json();
}
async function sbRpc(fn, token) {
  const r = await fetch(SB_URL + '/rest/v1/rpc/' + fn, { method: 'POST', headers: { apikey: SB_KEY, Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' }, body: '{}' });
  if (!r.ok) return null;
  return r.json();
}
// devolve { email, name, picture, role, plan, until, status, renewUrl }
export async function verifyUser(req) {
  const h = req.headers['authorization'] || '';
  const token = h.startsWith('Bearer ') ? h.slice(7) : '';
  if (!token) throw httpError(401, 'Sessão em falta. Entra outra vez.');
  const c = tokenCache.get(token);
  if (c && c.until > Date.now()) return c.user;
  const u = await sbGet('/auth/v1/user', token);
  if (!u?.id) throw httpError(401, 'Sessão expirada. Entra outra vez.');
  const [prof] = (await sbGet('/rest/v1/profiles?select=email,full_name,username,avatar_url,role&id=eq.' + u.id, token)) || [];
  const plans = (await sbRpc('my_plan', token)) || [];
  const p = plans[0] || null;
  const role = prof?.role || 'user';
  const planId = p?.plan_id === 'basic' ? 'basico' : p?.plan_id || null;
  const user = { id: u.id, email: String(u.email || prof?.email || '').toLowerCase(), name: prof?.full_name || '', username: prof?.username || '', picture: prof?.avatar_url || '', role,
    staff: role === 'admin' || role === 'staff', admin: role === 'admin' || isAdmin(String(u.email || '').toLowerCase()),
    planRaw: p, plan: planId, status: p?.status || null, until: p?.current_period_end || null, renewUrl: p?.renew_url || null };
  tokenCache.set(token, { user, until: Date.now() + 60e3 });
  if (tokenCache.size > 500) tokenCache.delete(tokenCache.keys().next().value);
  return user;
}
export const verifyGoogle = verifyUser; // compatibilidade
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

/* ---------- Acesso e assinaturas ---------- */
const list = k => env(k).toLowerCase().split(/[\s,;]+/).filter(Boolean);
export const isAdmin = email => list('ADMIN_EMAILS').includes(email);
const today = () => new Date().toISOString().slice(0, 10);
// Acesso: admin/equipa sempre; cliente só com plano ativo (Supabase)
export function access(user) {
  if (user.staff || user.admin) return { plan: 'pro', until: user.until, admin: true, staff: true };
  if (user.plan && user.status === 'active' && (!user.until || new Date(user.until) > new Date())) return { plan: user.plan, until: user.until };
  return { plan: null, until: user.until, expired: !!user.plan, last: user.plan };
}
export async function getPlan(email) { return { plan: null }; } // legado
export async function isAllowed() { return false; } // legado
export async function requireUser(req) {
  const user = await verifyUser(req);
  const p = access(user);
  if (!p.plan) { const e = httpError(402, p.expired ? 'O teu plano expirou. Renova para continuar.' : 'Escolhe um plano para começar a usar o droply.'); e.code = 'no_plan'; throw e; }
  user.admin = !!p.admin; user.plan = p.plan;
  return user;
}

/* ---------- Limites mensais (por plano) ---------- */
const month = () => new Date().toISOString().slice(0, 7);
const qkey = (email, kind) => `droply:q:${month()}:${kind}:${email}`;
export async function usage(email, plan = 'basico') {
  const out = {};
  for (const k of KINDS) {
    const v = kvOn() ? await kv('GET', qkey(email, k)) : null;
    out[k] = { used: parseInt(v || '0', 10), limit: PLANS[plan]?.[k] ?? 0 };
  }
  return out;
}
export async function consume(user, kind, count = 1) {
  if (user.admin && env('ADMIN_UNLIMITED', 'true') === 'true') return;
  const limit = PLANS[user.plan]?.[kind] ?? 0;
  if (kind === 'studio' && limit === 0) { const e = httpError(403, 'O Estúdio IA está disponível no plano Pro.'); e.code = 'need_pro'; throw e; }
  if (!kvOn()) return; // sem KV: sem contagem (ver README)
  const used = parseInt((await kv('GET', qkey(user.email, kind))) || '0', 10);
  if (used + count > limit) {
    const nomes = { search: 'pesquisas', analyze: 'análises', site: 'sites', studio: 'gerações do estúdio' };
    throw httpError(429, `Chegaste ao limite de ${limit} ${nomes[kind]} do plano ${PLANS[user.plan].name} este mês. O limite renova no dia 1${user.plan === 'basico' ? ' — ou passa para o Pro.' : '.'}`);
  }
  await kv('INCRBY', qkey(user.email, kind), count);
  await kv('EXPIRE', qkey(user.email, kind), 60 * 60 * 24 * 40);
}

/* ---------- IA (Gemini grátis, OpenAI ou Anthropic) ---------- */
export function aiProvider() {
  const p = env('AI_PROVIDER');
  if (p) return p;
  if (env('GEMINI_API_KEY') || env('GOOGLE_AI_API_KEY')) return 'gemini';
  if (env('OPENAI_API_KEY')) return 'openai';
  if (env('ANTHROPIC_API_KEY')) return 'anthropic';
  return 'gemini';
}
async function gemini({ system, user, json, maxTokens, temperature }) {
  const key = env('GEMINI_API_KEY') || env('GOOGLE_AI_API_KEY');
  if (!key) throw httpError(500, 'Falta configurar GEMINI_API_KEY (chave grátis do Google AI Studio).');
  const models = [env('AI_MODEL'), 'gemini-flash-lite-latest', 'gemini-2.5-flash-lite', 'gemini-flash-latest', 'gemini-2.5-flash', 'gemini-2.0-flash'].filter(Boolean);
  let last = ''; const codes = [], t0 = Date.now();
  for (const model of [...new Set(models)]) {
    if (Date.now() - t0 > 40000) break; // não passar do limite de tempo da Vercel
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: [{ role: 'user', parts: [{ text: user }] }],
        generationConfig: { temperature, maxOutputTokens: Math.max(maxTokens, 1024), ...(json ? { responseMimeType: 'application/json' } : {}) },
      }),
    });
    const j = await r.json().catch(() => ({}));
    if (r.ok) {
      const text = (j.candidates?.[0]?.content?.parts || []).map(p => p.text || '').join('');
      if (!text) { last = 'A IA não devolveu resposta (' + (j.candidates?.[0]?.finishReason || j.promptFeedback?.blockReason || 'vazia') + ').'; continue; }
      return text;
    }
    last = j.error?.message || 'erro ' + r.status; codes.push(r.status);
    if (r.status === 400 && /API key/i.test(last)) throw httpError(500, 'A chave GEMINI_API_KEY é inválida.');
    // modelo sem quota, ocupado ou indisponível -> tenta o seguinte (cada modelo tem a sua quota grátis)
  }
  if (codes.length && codes.every(c => c === 429)) throw httpError(429, 'A IA grátis atingiu o limite de pedidos por agora. Tenta daqui a 1 minuto (ou amanhã, se for o limite diário).');
  if (codes.some(c => c === 503 || c === 429)) throw httpError(503, 'A IA grátis está muito ocupada neste momento. Tenta outra vez daqui a pouco.');
  throw httpError(502, 'Erro da IA (Gemini): ' + last);
}
export async function ai({ system, user, json = true, maxTokens = 1800, temperature = 0.6 }) {
  const provider = aiProvider();
  if (provider === 'gemini') { const text = await gemini({ system, user, json, maxTokens, temperature }); return json ? parseJSON(text) : text; }
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
    catch (e) { send(res, e.status || 500, { error: e.message || 'Erro inesperado.', code: e.code }); if (!e.status) console.error(e); }
  };
}
export { env };
