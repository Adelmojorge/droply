import { send, handler, body, verifyGoogle, isAdmin, kv, kvOn, httpError, PLANS } from '../lib/util.js';
// Gestão de assinaturas (só ADMIN_EMAILS). Guarda no Upstash: hash droply:plans { email: {plan, until, since} }
async function listAll() {
  const h = (await kv('HGETALL', 'droply:plans')) || [];
  const rows = [];
  for (let i = 0; i < h.length; i += 2) { try { rows.push({ email: h[i], ...JSON.parse(h[i + 1]) }); } catch {} }
  const legacy = (await kv('SMEMBERS', 'droply:allow')) || [];
  for (const e of legacy) if (!rows.find(r => r.email === e)) rows.push({ email: e, plan: 'basico', until: null, legacy: true });
  return rows.sort((a, b) => (b.since || '').localeCompare(a.since || ''));
}
export default handler(async (req, res) => {
  const u = await verifyGoogle(req);
  if (!isAdmin(u.email)) throw httpError(403, 'Só administradores.');
  if (!kvOn()) throw httpError(400, 'Liga o Upstash (KV) na Vercel para gerir assinaturas aqui.');
  if (req.method === 'GET') return send(res, 200, { rows: await listAll() });
  const b = await body(req);
  const email = String(b.email || '').trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw httpError(400, 'E-mail inválido.');
  if (b.action === 'remove' || b.plan === 'none') {
    await kv('HDEL', 'droply:plans', email); await kv('SREM', 'droply:allow', email);
  } else {
    if (!PLANS[b.plan]) throw httpError(400, 'Plano inválido.');
    const months = Math.max(0, parseInt(b.months ?? 1, 10) || 0);
    let until = null;
    if (months > 0) {
      // renova a partir da data atual ou do fim do plano ainda ativo
      const prev = await kv('HGET', 'droply:plans', email);
      let base = new Date();
      try { const p = JSON.parse(prev || '{}'); if (p.until && new Date(p.until) > base) base = new Date(p.until); } catch {}
      base.setMonth(base.getMonth() + months); until = base.toISOString().slice(0, 10);
    }
    await kv('HSET', 'droply:plans', email, JSON.stringify({ plan: b.plan, until, since: new Date().toISOString().slice(0, 10), note: String(b.note || '').slice(0, 120) }));
    await kv('SREM', 'droply:allow', email);
  }
  send(res, 200, { ok: true, rows: await listAll() });
});
