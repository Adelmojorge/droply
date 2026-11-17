import { send, handler, body, requireUser, env, httpError } from '../../lib/util.js';
// Ligar ao GitHub sem "client secret": GitHub Device Flow.
// POST { action: "start" } -> { user_code, verification_uri, device_code, interval }
// POST { action: "poll", device_code } -> { access_token } | { pending: true } | { error }
export default handler(async (req, res) => {
  if (req.method !== 'POST') throw httpError(405, 'Método não permitido.');
  await requireUser(req);
  const cid = env('GITHUB_CLIENT_ID');
  if (!cid) throw httpError(500, 'Falta configurar GITHUB_CLIENT_ID na Vercel.');
  const b = await body(req);
  const gh = async (url, data) => {
    const r = await fetch(url, { method: 'POST', headers: { Accept: 'application/json', 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    return r.json().catch(() => ({}));
  };
  if (b.action === 'start') {
    const j = await gh('https://github.com/login/device/code', { client_id: cid, scope: 'public_repo' });
    if (!j.device_code) throw httpError(502, 'GitHub: ' + (j.error_description || j.error || 'não consegui iniciar a ligação.'));
    return send(res, 200, { device_code: j.device_code, user_code: j.user_code, verification_uri: j.verification_uri, interval: j.interval || 5, expires_in: j.expires_in });
  }
  if (b.action === 'poll') {
    if (!b.device_code) throw httpError(400, 'Falta o código.');
    const j = await gh('https://github.com/login/oauth/access_token', { client_id: cid, device_code: b.device_code, grant_type: 'urn:ietf:params:oauth:grant-type:device_code' });
    if (j.access_token) return send(res, 200, { access_token: j.access_token });
    if (j.error === 'authorization_pending') return send(res, 200, { pending: true });
    if (j.error === 'slow_down') return send(res, 200, { pending: true, slow: true, interval: j.interval });
    const msg = { expired_token: 'O código expirou. Tenta outra vez.', access_denied: 'Cancelaste a autorização no GitHub.' }[j.error] || j.error_description || j.error || 'Falha na ligação.';
    return send(res, 200, { error: msg });
  }
  throw httpError(400, 'Ação inválida.');
});
