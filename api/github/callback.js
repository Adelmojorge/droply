import { env } from '../../lib/util.js';
// Troca o "code" do GitHub por um token e devolve-o ao navegador (no fragmento #, nunca guardado no servidor).
export default async function (req, res) {
  const url = new URL(req.url, 'http://x');
  const code = url.searchParams.get('code') || '';
  const state = url.searchParams.get('state') || '';
  let frag = 'gh_error=' + encodeURIComponent('Ligação cancelada.');
  if (code) {
    try {
      const r = await fetch('https://github.com/login/oauth/access_token', {
        method: 'POST', headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify({ client_id: env('GITHUB_CLIENT_ID'), client_secret: env('GITHUB_CLIENT_SECRET'), code }),
      });
      const j = await r.json();
      frag = j.access_token ? `gh_token=${encodeURIComponent(j.access_token)}&state=${encodeURIComponent(state)}` : 'gh_error=' + encodeURIComponent(j.error_description || 'Falha na ligação ao GitHub.');
    } catch { frag = 'gh_error=' + encodeURIComponent('Falha na ligação ao GitHub.'); }
  }
  res.statusCode = 302; res.setHeader('Location', '/app#/sites?' + frag); res.end();
}
