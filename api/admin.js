import { send, handler, body, verifyGoogle, isAdmin, kv, kvOn, httpError } from '../lib/util.js';
// Gestão da lista de acesso (só ADMIN_EMAILS). Guarda no Upstash.
export default handler(async (req, res) => {
  const u = await verifyGoogle(req);
  if (!isAdmin(u.email)) throw httpError(403, 'Só administradores.');
  if (!kvOn()) throw httpError(400, 'Liga o Upstash (KV) na Vercel para gerir acessos aqui. Ou usa ALLOWED_EMAILS.');
  if (req.method === 'GET') return send(res, 200, { emails: ((await kv('SMEMBERS', 'droply:allow')) || []).sort() });
  const b = await body(req);
  const email = String(b.email || '').trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw httpError(400, 'E-mail inválido.');
  if (b.action === 'remove') await kv('SREM', 'droply:allow', email); else await kv('SADD', 'droply:allow', email);
  send(res, 200, { ok: true, emails: ((await kv('SMEMBERS', 'droply:allow')) || []).sort() });
});
