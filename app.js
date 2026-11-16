// droply · aplicação (sem frameworks). Dados guardados no navegador do utilizador.
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const LOGO = '<img src="/assets/logo.svg" alt="" width="{s}" height="{s}">';
const logo = s => LOGO.replaceAll('{s}', s);
const COLORS = ['#FF8A3D', '#FF3D8B', '#8B5CFF', '#C35BFF', '#FF6A5B', '#6E7BFF'];
const colorOf = s => COLORS[[...String(s)].reduce((a, c) => a + c.charCodeAt(0), 0) % COLORS.length];
const STAGES = [
  ['novo', 'Novo', '#A79FB5'], ['contactado', 'Contactado', '#FF8FBB'], ['respondeu', 'Respondeu', '#8B5CFF'],
  ['call', 'Call marcada', '#FFC53D'], ['proposta', 'Proposta enviada', '#FF8A3D'], ['fechado', 'Fechado', '#2BD98A'],
  ['perdido', 'Perdido', '#7C7489'], ['nao', 'Não contactar', '#FF5C7A'],
];
const stageName = k => (STAGES.find(s => s[0] === k) || STAGES[0])[1];
const SUGG = ['Dentistas em Austin, Texas, sem site', 'Restaurantes em Lisboa com menos de 80 avaliações', 'Canalizadores em Braga sem site', 'Advogados em Miami', 'Ginásios em São Paulo', 'Clínicas de estética em Madrid'];

let CFG = {}, ME = null, TOKEN = null, DB = null, SEARCH = null, BUSY = {};

/* ---------------- storage (por utilizador, no navegador) ---------------- */
const KEY = () => 'droply:' + (ME?.email || 'anon');
function load() {
  try { DB = JSON.parse(localStorage.getItem(KEY())) || {}; } catch { DB = {}; }
  DB.leads ||= {}; DB.searches ||= []; DB.sites ||= {}; DB.profile ||= {}; DB.gh ||= null;
}
function save() {
  try { localStorage.setItem(KEY(), JSON.stringify(DB)); }
  catch { toast('O armazenamento do navegador está cheio. Exporta uma cópia e apaga sites antigos.', true); }
}
const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);

/* ---------------- UI helpers ---------------- */
let tT;
function toast(m, err = false) { const t = $('#toast'); t.textContent = m; t.className = 'on' + (err ? ' err' : ''); clearTimeout(tT); tT = setTimeout(() => t.className = '', 3600); }
function modal(html) { const m = $('#modal'); m.innerHTML = html; m.hidden = false; m.onclick = e => { if (e.target === m) closeModal(); }; }
function closeModal() { $('#modal').hidden = true; $('#modal').innerHTML = ''; if (location.hash.startsWith('#/lead/')) history.replaceState(null, '', '#/leads'); }
async function copy(text) { try { await navigator.clipboard.writeText(text); toast('Copiado ✓'); } catch { toast('Não consegui copiar. Seleciona e copia à mão.', true); } }
const phoneDigits = p => String(p || '').replace(/[^\d]/g, '');
const fmtDate = d => new Date(d).toLocaleDateString('pt-PT', { day: '2-digit', month: 'short' });

/* ---------------- API ---------------- */
function tokenValid(t) { try { const p = JSON.parse(atob(t.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))); return p.exp * 1000 > Date.now() + 30000; } catch { return false; } }
let reauthWait = null;
function reauth() {
  if (reauthWait) return reauthWait;
  reauthWait = new Promise(res => { window.__onCred = t => { res(t); reauthWait = null; }; try { google.accounts.id.prompt(); } catch {} setTimeout(() => { res(null); reauthWait = null; }, 15000); });
  return reauthWait;
}
async function api(path, data, retry = true) {
  if (!TOKEN || !tokenValid(TOKEN)) { const t = await reauth(); if (!t) { logout(true); throw new Error('Sessão expirada. Entra outra vez.'); } }
  const r = await fetch('/api/' + path, { method: data ? 'POST' : 'GET', headers: { Authorization: 'Bearer ' + TOKEN, ...(data ? { 'Content-Type': 'application/json' } : {}) }, body: data ? JSON.stringify(data) : undefined });
  const j = await r.json().catch(() => ({ error: 'Resposta inválida do servidor.' }));
  if (r.status === 401 && retry) { const t = await reauth(); if (t) return api(path, data, false); logout(true); }
  if (!r.ok) throw new Error(j.error || 'Erro ' + r.status);
  return j;
}
async function refreshMe() { try { const m = await api('me'); ME = { ...ME, ...m }; renderQuota(); } catch {} }

/* ---------------- auth ---------------- */
function onCredential(resp) {
  TOKEN = resp.credential; try { localStorage.setItem('droply:token', TOKEN); } catch {}
  if (window.__onCred) { window.__onCred(TOKEN); window.__onCred = null; return; }
  start();
}
function initGoogle() {
  if (!window.google?.accounts?.id) return setTimeout(initGoogle, 150);
  google.accounts.id.initialize({ client_id: CFG.googleClientId, callback: onCredential, auto_select: true, cancel_on_tap_outside: false, use_fedcm_for_prompt: true });
  const g = $('#gbtn'); if (g) google.accounts.id.renderButton(g, { theme: 'filled_black', size: 'large', shape: 'pill', text: 'continue_with', locale: 'pt-PT', width: 300 });
}
function logout(expired = false) {
  try { localStorage.removeItem('droply:token'); google.accounts.id.disableAutoSelect(); } catch {}
  TOKEN = null; ME = null; renderLogin(expired ? 'A tua sessão expirou. Entra outra vez.' : '');
}
function renderLogin(msg = '') {
  $('#root').innerHTML = `<div class="login"><div class="box">
  <div style="display:flex;justify-content:center">${logo(72)}</div>
  <div class="h">Diz quem procuras.<br><span class="gt">O droply encontra.</span></div>
  <p>Clientes em qualquer país, com o que cada empresa precisa e a mensagem pronta para enviar.</p>
  <div class="g"><div id="gbtn"></div></div>
  ${msg ? `<p style="font-size:14px;color:#FFC2CE">${esc(msg)}</p>` : ''}
  ${!CFG.googleClientId ? '<p class="note" style="margin-top:20px">Falta configurar GOOGLE_CLIENT_ID na Vercel.</p>' : ''}
  <small>Ao entrar aceitas os <a href="/termos.html">Termos</a> e a <a href="/privacidade.html">Política de Privacidade</a>.<br>by Drop Code Studio</small></div></div>`;
  initGoogle();
}
function renderNoAccess() {
  const wa = CFG.supportWhatsApp ? `https://wa.me/${CFG.supportWhatsApp}?text=${encodeURIComponent('Olá! Quero ativar o droply na conta ' + ME.email)}` : '';
  $('#root').innerHTML = `<div class="login"><div class="box">
  <div style="display:flex;justify-content:center">${logo(64)}</div>
  <div class="h" style="font-size:36px">Falta só ativar <span class="gt">o teu acesso.</span></div>
  <p>Entraste como <b>${esc(ME.email)}</b>. Esta conta ainda não tem uma subscrição ativa do droply.</p>
  <div style="display:flex;gap:10px;justify-content:center;margin-top:26px;flex-wrap:wrap">
   ${CFG.checkoutUrl ? `<a class="btn pri" href="${esc(CFG.checkoutUrl)}" target="_blank" rel="noopener">Ativar o droply</a>` : ''}
   ${wa ? `<a class="btn" href="${wa}" target="_blank" rel="noopener">Já paguei · falar com o suporte</a>` : ''}
   <button class="btn ghost" id="out">Usar outra conta</button></div>
  <small>Depois do pagamento, o acesso é ativado no e-mail Google que usaste aqui.</small></div></div>`;
  $('#out').onclick = () => logout();
}

/* ---------------- shell ---------------- */
function shell() {
  const n = Object.keys(DB.leads).length, s = Object.keys(DB.sites).length;
  const pic = ME.picture ? `<img src="${esc(ME.picture)}" alt="" referrerpolicy="no-referrer">` : `<div class="av">${esc((ME.name || ME.email)[0].toUpperCase())}</div>`;
  $('#root').innerHTML = `<div class="app">
  <aside class="side" id="side">
   <div class="brand">${logo(26)}<b>droply</b></div>
   <div class="acct">${pic}<div><b>${esc(ME.name || ME.email)}</b><small>${esc(ME.email)}</small></div></div>
   <nav class="nav">
    <a href="#/" data-r="home">✦ Nova pesquisa</a>
    <a href="#/leads" data-r="leads">◎ Leads <span class="cnt">${n}</span></a>
    <a href="#/pipeline" data-r="pipeline">▤ Pipeline</a>
    <a href="#/sites" data-r="sites">▣ Sites com IA <span class="cnt">${s}</span></a>
    <a href="#/numeros" data-r="numeros">☎ Números internacionais</a>
    <a href="#/definicoes" data-r="definicoes">⚙ Definições</a>
    ${ME.admin ? '<a href="#/admin" data-r="admin">🔑 Acessos (admin)</a>' : ''}
   </nav>
   <h6>Pesquisas guardadas</h6>
   <div class="saved">${DB.searches.slice(0, 8).map(x => `<a data-sid="${x.id}"><i>${esc(x.label[0] || '?')}</i><span>${esc(x.label)}</span></a>`).join('') || '<span class="mu2" style="font-size:12.5px;padding:0 10px">Ainda nenhuma.</span>'}</div>
   <div class="quota" id="quota"></div>
   <a class="num" href="#/numeros"><div><b>Precisas de um número?</b><small>PT, EUA e mais · suporte</small></div><i>☎</i></a>
  </aside>
  <main class="main"><div class="scroll" id="view"></div></main></div>`;
  $$('.saved a[data-sid]').forEach(a => a.onclick = () => openSearch(a.dataset.sid));
  renderQuota();
}
function renderQuota() {
  const q = $('#quota'); if (!q || !ME?.usage) return;
  const row = (k, t) => { const u = ME.usage[k]; const pct = Math.min(100, u.used / Math.max(1, u.limit) * 100); return `<div class="r"><span>${t}</span><span>${u.used}/${u.limit}</span></div><div class="bar"><i style="width:${pct}%"></i></div>`; };
  q.innerHTML = `<b style="font-size:12.5px">Este mês</b>${row('search', 'Pesquisas')}${row('analyze', 'Análises')}${row('site', 'Sites')}${ME.limitsActive === false && ME.admin ? '<div class="mu2" style="margin-top:6px">Limites desligados (falta KV)</div>' : ''}`;
}
const mobBtn = () => `<button class="btn sm mob" onclick="document.getElementById('side').classList.toggle('open')">☰</button>`;

/* ---------------- router ---------------- */
function route() {
  if (!ME) return;
  const h = location.hash.replace(/^#/, '') || '/';
  const [path, qs] = h.split('?');
  const parts = path.split('/').filter(Boolean);
  const r = parts[0] || 'home';
  $$('.nav a').forEach(a => a.classList.toggle('on', a.dataset.r === (r === 'lead' ? 'leads' : r === 'site' ? 'sites' : r)));
  $('#side')?.classList.remove('open');
  const v = $('#view'); v.scrollTop = 0;
  if (r === 'home') return viewHome();
  if (r === 'leads') return viewLeads();
  if (r === 'lead') { viewLeads(); return openLead(parts[1]); }
  if (r === 'pipeline') return viewPipeline();
  if (r === 'sites') return viewSites(new URLSearchParams(qs || ''));
  if (r === 'site') return viewSite(parts[1]);
  if (r === 'numeros') return viewNumbers();
  if (r === 'definicoes') return viewSettings();
  if (r === 'admin' && ME.admin) return viewAdmin();
  location.hash = '#/';
}
window.addEventListener('hashchange', route);

/* ---------------- HOME / pesquisa ---------------- */
function viewHome() {
  const first = (ME.name || '').split(' ')[0];
  $('#view').innerHTML = `<div class="home"><div style="position:absolute;top:14px;left:14px;z-index:2">${mobBtn()}</div>
  <div class="hero">
   <div class="h">Que clientes procuras hoje${first ? ', ' + esc(first) : ''}?</div>
   <div class="pbox"><textarea id="q" rows="2" placeholder="Ex.: Clínicas dentárias em Austin, Texas, sem site, com menos de 60 avaliações"></textarea>
    <div class="row"><span class="chip" data-add=" nos Estados Unidos">🇺🇸 EUA</span><span class="chip" data-add=" em Portugal">🇵🇹 Portugal</span><span class="chip" data-add=" no Brasil">🇧🇷 Brasil</span><span class="chip" data-add=" sem site">Sem site</span>
     <span class="sp"></span><button class="btn pri" id="go">Encontrar ✦</button></div></div>
   <div class="sugg">${SUGG.map(s => `<span class="chip" data-s="${esc(s)}">${esc(s)}</span>`).join('')}</div>
  </div><div class="res" id="results">${SEARCH ? resultsHTML() : ''}</div></div>`;
  const q = $('#q');
  q.onkeydown = e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); doSearch(); } };
  $$('[data-add]').forEach(c => c.onclick = () => { q.value = (q.value.trim() + c.dataset.add).trim(); q.focus(); });
  $$('[data-s]').forEach(c => c.onclick = () => { q.value = c.dataset.s; doSearch(); });
  $('#go').onclick = doSearch;
  bindResults();
}
async function doSearch() {
  const prompt = $('#q').value.trim(); if (prompt.length < 4) return toast('Escreve que clientes procuras.', true);
  const b = $('#go'); b.disabled = true; b.innerHTML = '<span class="spin"></span> A procurar...';
  try {
    const r = await api('search', { prompt });
    const s = { id: uid(), label: r.plan.label || prompt.slice(0, 40), prompt, plan: r.plan, leadIds: [], next: r.nextPageToken, at: Date.now() };
    addLeads(r.leads, s);
    DB.searches.unshift(s); DB.searches = DB.searches.slice(0, 50); save();
    SEARCH = s; shell(); route();
    toast(r.leads.length ? `${r.leads.length} empresas encontradas ✓` : 'Nenhuma empresa passou nos filtros. Tenta alargar a pesquisa.');
    refreshMe();
  } catch (e) { toast(e.message, true); } finally { b.disabled = false; b.innerHTML = 'Encontrar ✦'; }
}
function addLeads(list, s) {
  for (const l of list) {
    if (!DB.leads[l.id]) DB.leads[l.id] = { ...l, status: 'novo', notes: '', addedAt: Date.now(), search: s.label };
    else Object.assign(DB.leads[l.id], { phone: l.phone || DB.leads[l.id].phone, website: l.website || DB.leads[l.id].website, rating: l.rating, reviews: l.reviews });
    if (!s.leadIds.includes(l.id)) s.leadIds.push(l.id);
  }
}
async function loadMore() {
  const s = SEARCH; if (!s?.next) return;
  const b = $('#more'); b.disabled = true; b.innerHTML = '<span class="spin"></span>';
  try { const r = await api('search', { plan: s.plan, pageToken: s.next }); addLeads(r.leads, s); s.next = r.nextPageToken; save(); $('#results').innerHTML = resultsHTML(); bindResults(); refreshMe(); toast(`+${r.leads.length} empresas`); }
  catch (e) { toast(e.message, true); b.disabled = false; b.textContent = 'Carregar mais (1 pesquisa)'; }
}
function openSearch(id) { SEARCH = DB.searches.find(s => s.id === id); location.hash = '#/'; route(); setTimeout(() => $('#results')?.scrollIntoView({ behavior: 'smooth' }), 50); }
function leadTags(l) {
  const t = [];
  if (!l.website) t.push('<span class="tag p">SEM SITE</span>');
  if (l.analysis) for (const n of (l.analysis.needs || []).filter(n => l.website || !/site/i.test(n.title)).slice(0, 2)) t.push(`<span class="tag ${n.severity === 'alta' ? 'r' : 'w'}">${esc(n.title.toUpperCase())}</span>`);
  if (l.phone) t.push('<span class="tag">TELEFONE</span>');
  if (l.analysis?.emails?.length) t.push('<span class="tag g">E-MAIL</span>');
  return t.join('');
}
function leadCard(l) {
  const sc = l.analysis?.score;
  return `<div class="card lead" data-lead="${l.id}"><div class="t"><div class="av" style="background:${colorOf(l.name)}">${esc(l.name[0])}</div>
  <div style="min-width:0"><b>${esc(l.name)}</b><small>${esc(l.category || '')}${l.category ? ' · ' : ''}${l.reviews ?? 0} avaliações${l.rating ? ' · ' + l.rating + '★' : ''}</small><br><small>${esc(l.address)}</small></div>
  ${sc != null ? `<div class="score" style="color:${sc >= 80 ? 'var(--warm)' : sc >= 60 ? '#fff' : 'var(--mu)'}">${sc}</div>` : ''}</div>
  <div class="tags">${leadTags(l)}<span class="tag">${esc(stageName(l.status).toUpperCase())}</span></div>
  <div class="acts">${l.analysis ? '<button class="btn sm pri" data-open>Ver mensagens</button>' : `<button class="btn sm pri" data-an="${l.id}">${BUSY[l.id] ? '<span class="spin"></span>' : 'Analisar ✦'}</button>`}<button class="btn sm" data-open>Detalhes</button></div></div>`;
}
function resultsHTML() {
  const s = SEARCH; const leads = s.leadIds.map(id => DB.leads[id]).filter(Boolean);
  return `<div class="top"><div><div class="h" style="font-size:22px">${esc(s.label)}</div><div class="mu" style="font-size:13px">${leads.length} empresas · "${esc(s.prompt)}"</div></div><span class="sp"></span>
  <button class="btn sm" id="anAll">Analisar as 5 melhores ✦</button></div>
  <div class="grid">${leads.map(leadCard).join('') || '<div class="empty">Nenhum resultado com estes filtros.</div>'}</div>
  ${s.next ? '<div style="text-align:center;margin-top:18px"><button class="btn" id="more">Carregar mais (1 pesquisa)</button></div>' : ''}`;
}
function bindResults() {
  $$('#results [data-lead], #view .grid [data-lead]').forEach(c => c.onclick = e => {
    const an = e.target.closest('[data-an]'); if (an) { e.stopPropagation(); return analyze(an.dataset.an); }
    location.hash = '#/lead/' + c.dataset.lead;
  });
  $('#more') && ($('#more').onclick = loadMore);
  $('#anAll') && ($('#anAll').onclick = async () => {
    const ids = SEARCH.leadIds.filter(id => DB.leads[id] && !DB.leads[id].analysis).sort((a, b) => (!DB.leads[a].website ? -1 : 0) - (!DB.leads[b].website ? -1 : 0)).slice(0, 5);
    if (!ids.length) return toast('Já analisaste estes leads.');
    for (const id of ids) await analyze(id, true);
  });
}
async function analyze(id, quiet = false) {
  const l = DB.leads[id]; if (!l || BUSY[id]) return;
  BUSY[id] = true; rerenderLists();
  try { const a = await api('analyze', { lead: l, profile: DB.profile }); l.analysis = a; save(); if (!quiet) toast('Análise pronta ✓'); refreshMe(); }
  catch (e) { toast(e.message, true); }
  finally { delete BUSY[id]; rerenderLists(); if (location.hash === '#/lead/' + id) openLead(id); }
}
function rerenderLists() {
  if ($('#results') && SEARCH) { $('#results').innerHTML = resultsHTML(); bindResults(); }
  if (location.hash.startsWith('#/leads') || location.hash.startsWith('#/lead/')) { const f = $('#lf'); if (f) renderLeadTable(); }
}

/* ---------------- LEADS ---------------- */
function viewLeads() {
  $('#view').innerHTML = `<div class="page"><div class="top">${mobBtn()}<h1 class="h">Leads</h1><span class="sp"></span><button class="btn sm" id="csv">Exportar CSV</button></div>
  <div class="filters"><input class="in" id="lf" placeholder="Procurar por nome, cidade..."><select class="in" id="ls"><option value="">Todas as fases</option>${STAGES.map(s => `<option value="${s[0]}">${s[1]}</option>`).join('')}</select>
  <select class="in" id="lw"><option value="">Com e sem site</option><option value="no">Sem site</option><option value="yes">Com site</option></select></div>
  <div id="lt"></div></div>`;
  ['lf', 'ls', 'lw'].forEach(i => $('#' + i).oninput = renderLeadTable);
  $('#csv').onclick = exportCSV;
  renderLeadTable();
}
function filteredLeads() {
  const f = ($('#lf')?.value || '').toLowerCase(), s = $('#ls')?.value, w = $('#lw')?.value;
  return Object.values(DB.leads).filter(l => (!f || (l.name + l.address + (l.category || '')).toLowerCase().includes(f)) && (!s || l.status === s) && (!w || (w === 'no' ? !l.website : !!l.website)))
    .sort((a, b) => (b.analysis?.score ?? -1) - (a.analysis?.score ?? -1) || b.addedAt - a.addedAt);
}
function renderLeadTable() {
  const L = filteredLeads();
  $('#lt').innerHTML = L.length ? `<table class="tb"><thead><tr><th>Empresa</th><th>Contacto</th><th>Diagnóstico</th><th>Nota</th><th>Fase</th></tr></thead><tbody>
  ${L.map(l => `<tr data-id="${l.id}"><td><b>${esc(l.name)}</b><br><span class="mu" style="font-size:12px">${esc(l.address)}</span></td>
  <td style="font-size:12.5px">${esc(l.phone || '—')}<br><span class="mu">${esc(l.analysis?.emails?.[0] || (l.website ? new URL(l.website).hostname : 'sem site'))}</span></td>
  <td><div class="tags">${leadTags(l) || '<span class="mu2">—</span>'}</div></td><td><b>${l.analysis?.score ?? (BUSY[l.id] ? '<span class="spin"></span>' : '—')}</b></td><td><span class="tag">${esc(stageName(l.status))}</span></td></tr>`).join('')}</tbody></table>`
    : `<div class="empty">${logo(48)}<div class="h">Ainda não tens leads</div><p>Faz a tua primeira pesquisa e os leads aparecem aqui.</p><a class="btn pri" href="#/" style="margin-top:14px">Nova pesquisa ✦</a></div>`;
  $$('#lt tr[data-id]').forEach(r => r.onclick = () => location.hash = '#/lead/' + r.dataset.id);
}
function exportCSV() {
  const rows = [['Nome', 'Categoria', 'Morada', 'Telefone', 'E-mail', 'Site', 'Avaliações', 'Nota Google', 'Pontuação', 'Fase', 'Necessidades', 'Mapa']];
  for (const l of filteredLeads()) rows.push([l.name, l.category, l.address, l.phone, l.analysis?.emails?.join(' ') || '', l.website, l.reviews, l.rating, l.analysis?.score ?? '', stageName(l.status), (l.analysis?.needs || []).map(n => n.title).join('; '), l.maps]);
  const csv = rows.map(r => r.map(c => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv' })); a.download = 'droply-leads.csv'; a.click();
}

/* ---------------- LEAD (detalhe) ---------------- */
function openLead(id) {
  const l = DB.leads[id]; if (!l) { closeModal(); return; }
  const a = l.analysis;
  const wa = phoneDigits(l.phone);
  const msg = a?.messages || {};
  const email = a?.emails?.[0] || '';
  modal(`<div class="drawer">
  <button class="btn sm x" onclick="document.dispatchEvent(new Event('closemodal'))">✕</button>
  <div class="t" style="display:flex;gap:12px;align-items:center"><div class="av" style="width:48px;height:48px;border-radius:50%;background:${colorOf(l.name)};display:flex;align-items:center;justify-content:center;font:800 20px 'Plus Jakarta Sans'">${esc(l.name[0])}</div>
  <div><div class="h" style="font-size:24px">${esc(l.name)}</div><div class="mu">${esc(l.category || '')} · ${l.reviews ?? 0} avaliações${l.rating ? ' · ' + l.rating + '★' : ''}</div></div>
  ${a ? `<div class="score" style="font-size:34px;color:${a.score >= 80 ? 'var(--warm)' : '#fff'}">${a.score}</div>` : ''}</div>
  <div class="sec"><div class="stages">${STAGES.map(s => `<button data-st="${s[0]}" class="${l.status === s[0] ? 'on' : ''}">${s[1]}</button>`).join('')}</div></div>
  <div class="kv">
   <div><small>Telefone</small><span>${l.phone ? `<a href="tel:${esc(l.phone)}">${esc(l.phone)}</a>` : '—'}</span></div>
   <div><small>E-mail</small><span>${email ? `<a href="mailto:${esc(email)}">${esc(email)}</a>` : (a ? 'Não encontrado no site' : 'Analisa para procurar')}</span></div>
   <div><small>Site</small><span>${l.website ? `<a href="${esc(l.website)}" target="_blank" rel="noopener">${esc(l.website.replace(/^https?:\/\//, '').slice(0, 40))}</a>` : '<span style="color:var(--p)">Não tem site</span>'}</span></div>
   <div><small>Morada</small><span>${esc(l.address)} · <a href="${esc(l.maps)}" target="_blank" rel="noopener">Mapa ↗</a></span></div>
   ${a?.socials && Object.keys(a.socials).length ? `<div style="grid-column:1/-1"><small>Redes sociais</small><span>${Object.entries(a.socials).map(([k, v]) => `<a href="${esc(v)}" target="_blank" rel="noopener">${k}</a>`).join(' · ')}</span></div>` : ''}
  </div>
  ${!a ? `<div class="sec card" style="padding:18px;text-align:center"><p class="mu">Analisa este lead para veres o que precisa, a pontuação e as mensagens prontas.</p><button class="btn pri" id="anOne" style="margin-top:12px">${BUSY[id] ? '<span class="spin"></span> A analisar...' : 'Analisar com IA ✦ (1 análise)'}</button></div>` : `
  <div class="sec"><h3>Resumo</h3><p>${esc(a.summary)}</p></div>
  <div class="sec"><h3>O que esta empresa precisa</h3>${(a.needs || []).map(n => `<div class="need"><span class="tag ${n.severity === 'alta' ? 'r' : n.severity === 'media' ? 'w' : ''}" style="height:fit-content">${esc(n.severity)}</span><div><b>${esc(n.title)}</b> <span class="mu2">· ${esc(n.service || '')}</span><p>${esc(n.detail)}</p></div></div>`).join('')}
   ${a.bestOffer ? `<div class="need" style="border-color:rgba(255,61,139,.4)"><span class="tag p" style="height:fit-content">OFERTA</span><div><b>${esc(a.bestOffer.service)}</b> <span class="mu2">· ${esc(a.bestOffer.priceHint || '')}</span><p>${esc(a.bestOffer.why)}</p></div></div>` : ''}</div>
  <div class="sec"><h3>Mensagens prontas</h3>
   <div class="tabs"><button data-tab="wa" class="on">WhatsApp</button><button data-tab="em">E-mail</button><button data-tab="call">Ligação</button><button data-tab="fu">Seguimento</button></div>
   <div data-pane="wa"><div class="msg" contenteditable="true" id="mWa">${esc(msg.whatsapp)}</div>${a.translation ? `<div class="msg tr">🇵🇹 ${esc(a.translation)}</div>` : ''}
    <div class="row-acts">${wa ? `<a class="btn wa" id="sendWa" target="_blank" rel="noopener">Abrir no WhatsApp</a>` : '<span class="note">Sem telefone para WhatsApp.</span>'}<button class="btn" data-copy="mWa">Copiar</button></div>
    <p class="mu2" style="font-size:12px;margin-top:8px">Confirma que o número tem WhatsApp. Envia um a um para não teres o número bloqueado.</p></div>
   <div data-pane="em" hidden><input class="in" id="mSub" value="${esc(msg.email?.subject || '')}"><div class="msg" contenteditable="true" id="mEm" style="margin-top:8px">${esc(msg.email?.body || '')}</div>
    <div class="row-acts">${email ? `<a class="btn pri" id="sendEm">Abrir no e-mail</a>` : '<span class="note">E-mail não encontrado no site. Procura no Google ou nas redes.</span>'}<button class="btn" data-copy="mEm">Copiar</button></div></div>
   <div data-pane="call" hidden><div class="msg" id="mCall">${esc((msg.call || []).map((x, i) => (i + 1) + '. ' + x).join('\n'))}</div><div class="row-acts">${l.phone ? `<a class="btn pri" href="tel:${esc(l.phone)}">Ligar ${esc(l.phone)}</a>` : ''}<button class="btn" data-copy="mCall">Copiar guião</button></div></div>
   <div data-pane="fu" hidden><div class="msg" contenteditable="true" id="mFu">${esc(msg.followup || '')}</div><div class="row-acts"><button class="btn" data-copy="mFu">Copiar</button></div></div>
  </div>
  ${a.site ? `<div class="sec"><h3>Análise técnica do site</h3><div class="kv">
   <div><small>Abre em</small><span>${a.site.reachable ? (a.site.loadMs / 1000).toFixed(1) + ' s' : 'Não abriu (' + esc(a.site.error || a.site.status) + ')'}</span></div>
   <div><small>HTTPS</small><span>${a.site.https ? 'Sim' : 'Não'}</span></div><div><small>Telemóvel</small><span>${a.site.mobileViewport ? 'Adaptado' : 'Não adaptado'}</span></div>
   <div><small>SEO local / GEO</small><span>${a.site.localBusinessSchema ? 'Tem dados estruturados' : 'Sem dados estruturados'}${a.site.faq ? ' · tem FAQ' : ''}</span></div>
   <div><small>Plataforma</small><span>${esc(a.site.builder || 'Desconhecida')}</span></div><div><small>Última atualização</small><span>${a.site.copyrightYear ? '© ' + a.site.copyrightYear : '—'}</span></div></div></div>` : ''}
  <div class="row-acts sec"><button class="btn" id="reAn">Analisar outra vez</button></div>`}
  <div class="sec"><h3>Site com IA</h3><p class="mu" style="font-size:13.5px">Cria um site novo para esta empresa e mostra-o na conversa.</p><button class="btn pri" id="mkSite" style="margin-top:10px">${Object.values(DB.sites).some(s => s.leadId === id) ? 'Abrir o site desta empresa' : 'Criar site com IA ✦ (1 site)'}</button></div>
  <div class="sec"><h3>Notas</h3><textarea class="in" id="notes" rows="3" placeholder="O que falaram, próximos passos...">${esc(l.notes)}</textarea></div>
  <div class="row-acts sec"><button class="btn sm ghost" id="del" style="color:var(--red)">Apagar lead</button></div></div>`);
  const D = $('#modal');
  document.addEventListener('closemodal', closeModal, { once: true });
  $$('[data-st]', D).forEach(b => b.onclick = () => { l.status = b.dataset.st; l.statusAt = Date.now(); save(); $$('[data-st]', D).forEach(x => x.classList.toggle('on', x === b)); rerenderLists(); });
  $$('[data-tab]', D).forEach(b => b.onclick = () => { $$('[data-tab]', D).forEach(x => x.classList.toggle('on', x === b)); $$('[data-pane]', D).forEach(p => p.hidden = p.dataset.pane !== b.dataset.tab); });
  $$('[data-copy]', D).forEach(b => b.onclick = () => copy($('#' + b.dataset.copy).innerText));
  $('#anOne', D) && ($('#anOne', D).onclick = () => analyze(id));
  $('#reAn', D) && ($('#reAn', D).onclick = () => analyze(id));
  const sw = $('#sendWa', D); if (sw) sw.onclick = () => { sw.href = `https://wa.me/${wa}?text=${encodeURIComponent($('#mWa').innerText)}`; if (l.status === 'novo') { l.status = 'contactado'; save(); rerenderLists(); } };
  const se = $('#sendEm', D); if (se) se.onclick = () => { se.href = `mailto:${email}?subject=${encodeURIComponent($('#mSub').value)}&body=${encodeURIComponent($('#mEm').innerText)}`; if (l.status === 'novo') { l.status = 'contactado'; save(); rerenderLists(); } };
  $('#notes', D).oninput = e => { l.notes = e.target.value; save(); };
  $('#mkSite', D).onclick = () => { const ex = Object.values(DB.sites).find(s => s.leadId === id); closeModal(); if (ex) location.hash = '#/site/' + ex.id; else createSite(id); };
  $('#del', D).onclick = () => { if (!confirm('Apagar este lead?')) return; delete DB.leads[id]; DB.searches.forEach(s => s.leadIds = s.leadIds.filter(x => x !== id)); save(); closeModal(); shell(); route(); };
}

/* ---------------- PIPELINE ---------------- */
function viewPipeline() {
  const by = k => Object.values(DB.leads).filter(l => l.status === k);
  $('#view').innerHTML = `<div class="page" style="max-width:none"><div class="top">${mobBtn()}<h1 class="h">Pipeline</h1><span class="mu" style="font-size:13px">Arrasta os cartões entre as fases.</span></div>
  <div class="kan">${STAGES.map(([k, n, c]) => `<div class="col" data-col="${k}"><h4><i style="background:${c}"></i>${n}<span>${by(k).length}</span></h4>
  ${by(k).map(l => `<div class="kc" draggable="true" data-id="${l.id}"><b>${esc(l.name)}</b><small>${esc((l.address || '').split(',').slice(-2).join(',').trim())}</small><div class="tags" style="margin-top:6px">${l.analysis ? `<span class="tag">${l.analysis.score}</span>` : ''}${!l.website ? '<span class="tag p">SEM SITE</span>' : ''}</div></div>`).join('')}</div>`).join('')}</div></div>`;
  $$('.kc').forEach(c => { c.ondragstart = e => e.dataTransfer.setData('id', c.dataset.id); c.onclick = () => location.hash = '#/lead/' + c.dataset.id; });
  $$('.col').forEach(col => {
    col.ondragover = e => { e.preventDefault(); col.classList.add('over'); };
    col.ondragleave = () => col.classList.remove('over');
    col.ondrop = e => { e.preventDefault(); const id = e.dataTransfer.getData('id'); if (DB.leads[id]) { DB.leads[id].status = col.dataset.col; save(); viewPipeline(); } };
  });
}

/* ---------------- SITES ---------------- */
async function createSite(leadId) {
  const l = DB.leads[leadId]; if (!l) return;
  location.hash = '#/sites'; toast('A criar o site com IA... pode levar até 1 minuto.');
  BUSY['site:' + leadId] = true; viewSites(new URLSearchParams());
  try {
    const r = await api('site', { lead: l, analysis: l.analysis });
    const id = uid(); DB.sites[id] = { id, leadId, name: l.name, html: r.html, createdAt: Date.now(), updatedAt: Date.now(), versions: [] }; save();
    refreshMe(); shell(); location.hash = '#/site/' + id;
  } catch (e) { toast(e.message, true); } finally { delete BUSY['site:' + leadId]; if (location.hash === '#/sites') viewSites(new URLSearchParams()); }
}
function handleGithubReturn(qs) {
  const tok = qs.get('gh_token'), err = qs.get('gh_error'), st = qs.get('state');
  if (err) toast(err, true);
  if (tok) {
    let exp = null; try { exp = sessionStorage.getItem('droply:ghstate'); } catch {}
    if (exp && st !== exp) return toast('Ligação ao GitHub inválida. Tenta outra vez.', true);
    DB.gh = { token: tok }; save();
    fetch('https://api.github.com/user', { headers: { Authorization: 'Bearer ' + tok } }).then(r => r.json()).then(u => { DB.gh.login = u.login; save(); toast('GitHub ligado: @' + u.login + ' ✓'); route(); });
    let back = null; try { back = sessionStorage.getItem('droply:ghback'); sessionStorage.removeItem('droply:ghback'); } catch {}
    history.replaceState(null, '', back || '#/sites'); return true;
  }
}
function connectGithub() {
  if (!CFG.githubClientId) return toast('Falta configurar GITHUB_CLIENT_ID na Vercel.', true);
  const st = uid(); try { sessionStorage.setItem('droply:ghstate', st); sessionStorage.setItem('droply:ghback', location.hash); } catch {}
  location.href = `https://github.com/login/oauth/authorize?client_id=${CFG.githubClientId}&scope=public_repo&state=${st}&redirect_uri=${encodeURIComponent(location.origin + '/api/github/callback')}`;
}
function viewSites(qs) {
  if (qs.get('gh_token') || qs.get('gh_error')) { if (handleGithubReturn(qs)) return route(); }
  const S = Object.values(DB.sites).sort((a, b) => b.updatedAt - a.updatedAt);
  const pending = Object.keys(BUSY).filter(k => k.startsWith('site:')).map(k => DB.leads[k.slice(5)]?.name);
  $('#view').innerHTML = `<div class="page"><div class="top">${mobBtn()}<h1 class="h">Sites com IA</h1><span class="sp"></span>${DB.gh?.token ? `<span class="tag g">GITHUB · @${esc(DB.gh.login || 'ligado')}</span>` : '<button class="btn sm" id="gh">Ligar GitHub</button>'}</div>
  <p class="mu" style="margin-top:6px">Cria sites a partir dos teus leads, edita com instruções simples e publica grátis no GitHub + Vercel.</p>
  ${pending.length ? `<div class="card" style="padding:14px;margin-top:16px;display:flex;gap:10px;align-items:center"><span class="spin"></span> A criar: ${pending.map(esc).join(', ')}</div>` : ''}
  <div class="grid">${S.map(s => `<a class="card lead" href="#/site/${s.id}" style="text-decoration:none"><div style="height:150px;border-radius:12px;overflow:hidden;background:#fff;position:relative"><iframe srcdoc="${esc(s.html)}" style="width:400%;height:400%;transform:scale(.25);transform-origin:0 0;border:0;pointer-events:none" sandbox="allow-scripts" loading="lazy"></iframe></div><b>${esc(s.name)}</b><small>${s.repo ? '🌐 ' + esc(s.repo) : 'Ainda não publicado'} · ${fmtDate(s.updatedAt)}</small></a>`).join('')}</div>
  ${!S.length && !pending.length ? `<div class="empty">${logo(48)}<div class="h">Ainda não criaste sites</div><p>Abre um lead e carrega em "Criar site com IA".</p><a class="btn pri" href="#/leads" style="margin-top:14px">Ver leads</a></div>` : ''}</div>`;
  $('#gh') && ($('#gh').onclick = connectGithub);
}
function viewSite(id) {
  const s = DB.sites[id]; if (!s) return (location.hash = '#/sites');
  const l = DB.leads[s.leadId] || { name: s.name };
  $('#view').innerHTML = `<div class="page" style="max-width:none"><div class="top">${mobBtn()}<a class="btn sm" href="#/sites">←</a><h1 class="h" style="font-size:24px">${esc(s.name)}</h1><span class="sp"></span>
  <button class="btn sm" id="dl">Descarregar HTML</button><button class="btn sm" id="open">Abrir em ecrã inteiro</button></div>
  <div class="editor"><div class="pane">
   <div class="card" style="padding:14px"><b>Pede alterações</b><textarea class="in" id="ins" rows="4" style="margin-top:8px" placeholder="Ex.: muda as cores para azul-escuro, acrescenta uma secção de preços, põe o botão de WhatsApp maior"></textarea>
   <button class="btn pri" id="edit" style="margin-top:10px;width:100%">Aplicar com IA ✦ (1 site)</button>${s.versions?.length ? '<button class="btn sm ghost" id="undo" style="margin-top:6px;width:100%">↶ Desfazer última alteração</button>' : ''}</div>
   <div class="card" style="padding:14px"><b>Publicar grátis</b>
    <div class="steps" style="margin-top:10px">
     <div><span>${DB.gh?.token ? `GitHub ligado como <b>@${esc(DB.gh.login || '')}</b>` : '<button class="btn sm" id="gh">Ligar o meu GitHub</button>'}</span></div>
     <div><span>Enviar o site para um repositório${s.repo ? `<br><a href="https://github.com/${esc(s.repo)}" target="_blank" rel="noopener" class="mu">github.com/${esc(s.repo)} ↗</a>` : ''}<br><button class="btn sm" id="push" style="margin-top:6px" ${DB.gh?.token ? '' : 'disabled'}>${s.repo ? 'Atualizar no GitHub' : 'Enviar para o GitHub'}</button></span></div>
     <div><span>Publicar na Vercel (só na primeira vez)<br><a class="btn sm pri" id="vercel" style="margin-top:6px" ${s.repo ? `href="https://vercel.com/new/import?s=${encodeURIComponent('https://github.com/' + s.repo)}" target="_blank" rel="noopener"` : 'disabled'}>Publicar na Vercel ↗</a></span></div>
    </div><p class="note" style="margin-top:12px">Depois da primeira publicação, cada "Atualizar no GitHub" publica a nova versão na Vercel sozinho, em cerca de 1 minuto.</p></div>
   ${l.id ? `<a class="btn sm" href="#/lead/${l.id}">Ver o lead</a>` : ''}
  </div>
  <div class="frame"><div class="bar"><i style="background:#FF5C7A"></i><i style="background:#FFC53D"></i><i style="background:#2BD98A"></i><span style="margin-left:8px">${esc(slug(s.name))}.vercel.app</span><span style="margin-left:auto;display:flex;gap:6px"><button class="btn sm ghost" data-w="100%">🖥</button><button class="btn sm ghost" data-w="390px">📱</button></span></div>
  <div style="flex:1;display:flex;justify-content:center;background:#E9E6EE"><iframe id="pv" sandbox="allow-scripts allow-popups" style="width:100%;height:100%"></iframe></div></div></div></div>`;
  $('#pv').srcdoc = s.html;
  $$('[data-w]').forEach(b => b.onclick = () => $('#pv').style.width = b.dataset.w);
  $('#dl').onclick = () => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([s.html], { type: 'text/html' })); a.download = slug(s.name) + '.html'; a.click(); };
  $('#open').onclick = () => { const w = window.open(); if (w) { w.document.write(s.html); w.document.close(); } };
  $('#gh') && ($('#gh').onclick = connectGithub);
  $('#push').onclick = () => pushGithub(s);
  $('#undo') && ($('#undo').onclick = () => { s.html = s.versions.pop(); s.updatedAt = Date.now(); save(); viewSite(id); });
  $('#edit').onclick = async () => {
    const ins = $('#ins').value.trim(); if (!ins) return toast('Diz o que queres mudar.', true);
    const b = $('#edit'); b.disabled = true; b.innerHTML = '<span class="spin"></span> A aplicar...';
    try { const r = await api('site', { lead: l, analysis: l.analysis, instructions: ins, currentHtml: s.html }); s.versions = [...(s.versions || []), s.html].slice(-5); s.html = r.html; s.updatedAt = Date.now(); save(); refreshMe(); toast('Alteração aplicada ✓'); viewSite(id); }
    catch (e) { toast(e.message, true); b.disabled = false; b.textContent = 'Aplicar com IA ✦ (1 site)'; }
  };
}
const slug = s => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'site';
async function gh(path, opts = {}) {
  const r = await fetch('https://api.github.com' + path, { ...opts, headers: { Authorization: 'Bearer ' + DB.gh.token, Accept: 'application/vnd.github+json', 'Content-Type': 'application/json', ...(opts.headers || {}) } });
  if (r.status === 401) { DB.gh = null; save(); throw new Error('A ligação ao GitHub expirou. Liga outra vez.'); }
  const j = r.status === 204 ? {} : await r.json().catch(() => ({}));
  if (!r.ok && r.status !== 404) throw new Error('GitHub: ' + (j.message || r.status));
  return { status: r.status, data: j };
}
const b64 = str => btoa(unescape(encodeURIComponent(str)));
async function pushGithub(s) {
  const b = $('#push'); b.disabled = true; b.innerHTML = '<span class="spin"></span> A enviar...';
  try {
    if (!DB.gh.login) DB.gh.login = (await gh('/user')).data.login;
    let repo = s.repo;
    if (!repo) {
      let name = slug(s.name) + '-site', n = 1;
      while ((await gh(`/repos/${DB.gh.login}/${name}`)).status === 200) name = slug(s.name) + '-site-' + (++n);
      const c = await gh('/user/repos', { method: 'POST', body: JSON.stringify({ name, description: 'Site criado com droply · ' + s.name, auto_init: true, private: false }) });
      repo = c.data.full_name; await new Promise(r => setTimeout(r, 1500));
    }
    const cur = await gh(`/repos/${repo}/contents/index.html`);
    await gh(`/repos/${repo}/contents/index.html`, { method: 'PUT', body: JSON.stringify({ message: s.repo ? 'Atualização via droply' : 'Site criado com droply', content: b64(s.html), ...(cur.status === 200 ? { sha: cur.data.sha } : {}) }) });
    s.repo = repo; s.pushedAt = Date.now(); save(); toast('Enviado para o GitHub ✓'); viewSite(s.id);
  } catch (e) { toast(e.message, true); b.disabled = false; b.textContent = 'Tentar outra vez'; }
}

/* ---------------- NÚMEROS ---------------- */
function viewNumbers() {
  const opts = [['🇵🇹', 'Portugal'], ['🇺🇸', 'Estados Unidos'], ['🇬🇧', 'Reino Unido'], ['🇧🇷', 'Brasil'], ['🇪🇸', 'Espanha'], ['🇫🇷', 'França'], ['🌍', 'Outro país']];
  $('#view').innerHTML = `<div class="page" style="max-width:760px"><div class="top">${mobBtn()}<h1 class="h">Números internacionais</h1></div>
  <p class="mu" style="margin-top:8px">Um número local passa mais confiança aos clientes lá fora. Escolhe o país e fala com o suporte: nós tratamos do teu número.</p>
  <div class="card" style="padding:20px;margin-top:18px"><label class="lb" style="margin-top:0">País</label><div class="stages" id="cty">${opts.map(([f, n], i) => `<button data-c="${n}" class="${i ? '' : 'on'}">${f} ${n}</button>`).join('')}</div>
  <label class="lb">Para que vais usar</label><select class="in" id="use"><option>WhatsApp Business</option><option>Chamadas</option><option>WhatsApp e chamadas</option></select>
  <label class="lb">Notas (opcional)</label><textarea class="in" id="nn" rows="2" placeholder="Ex.: preciso de um número de Lisboa"></textarea>
  <div class="row-acts" style="margin-top:16px">${CFG.supportWhatsApp ? '<a class="btn wa" id="ask" target="_blank" rel="noopener">Pedir no WhatsApp do suporte</a>' : ''}${CFG.supportEmail ? '<a class="btn" id="askm">Pedir por e-mail</a>' : ''}</div>
  ${!CFG.supportWhatsApp && !CFG.supportEmail ? '<p class="note" style="margin-top:12px">Falta configurar SUPPORT_WHATSAPP na Vercel.</p>' : ''}</div>
  <p class="note" style="margin-top:14px">O pedido é tratado manualmente pela equipa. Os preços e a disponibilidade dependem do país.</p></div>`;
  let c = opts[0][1];
  $$('#cty button').forEach(b => b.onclick = () => { c = b.dataset.c; $$('#cty button').forEach(x => x.classList.toggle('on', x === b)); });
  const text = () => `Olá! Quero um número de ${c} no droply.\nUso: ${$('#use').value}\nConta: ${ME.email}\n${$('#nn').value}`;
  $('#ask') && ($('#ask').onclick = () => $('#ask').href = `https://wa.me/${CFG.supportWhatsApp}?text=${encodeURIComponent(text())}`);
  $('#askm') && ($('#askm').onclick = () => $('#askm').href = `mailto:${CFG.supportEmail}?subject=${encodeURIComponent('Número de ' + c)}&body=${encodeURIComponent(text())}`);
}

/* ---------------- DEFINIÇÕES ---------------- */
function viewSettings() {
  const p = DB.profile;
  $('#view').innerHTML = `<div class="page" style="max-width:760px"><div class="top">${mobBtn()}<h1 class="h">Definições</h1></div>
  <div class="card" style="padding:20px;margin-top:18px"><div class="h" style="font-size:18px">O teu tom de voz</div><p class="mu" style="font-size:13.5px">O droply usa isto para escrever as mensagens como tu.</p>
   <label class="lb">Nome que assina as mensagens</label><input class="in" id="pName" value="${esc(p.name || ME.name || '')}">
   <label class="lb">Empresa / marca</label><input class="in" id="pCo" value="${esc(p.company || '')}" placeholder="Ex.: Drop Code Studio">
   <label class="lb">Serviços que vendes</label><input class="in" id="pSv" value="${esc(p.services || 'sites com IA, SEO, GEO, automações')}">
   <label class="lb">Como falas</label><textarea class="in" id="pTone" rows="3" placeholder="Ex.: direto, simpático, sem formalidades, frases curtas">${esc(p.tone || '')}</textarea>
   <label class="lb">Exemplo de uma mensagem tua (opcional)</label><textarea class="in" id="pEx" rows="3" placeholder="Cola uma mensagem que já enviaste e funcionou">${esc(p.example || '')}</textarea>
   <label class="lb">Assinatura do e-mail</label><textarea class="in" id="pSig" rows="2" placeholder="Nome · Empresa · site · telefone">${esc(p.signature || '')}</textarea>
   <button class="btn pri" id="pSave" style="margin-top:14px">Guardar</button></div>
  <div class="card" style="padding:20px;margin-top:14px"><div class="h" style="font-size:18px">Integrações</div>
   <div style="display:flex;align-items:center;gap:10px;margin-top:12px"><b>GitHub</b><span class="mu">${DB.gh?.token ? 'Ligado como @' + esc(DB.gh.login || '') : 'Não ligado'}</span><span class="sp" style="flex:1"></span>${DB.gh?.token ? '<button class="btn sm" id="ghOff">Desligar</button>' : '<button class="btn sm" id="ghOn">Ligar</button>'}</div></div>
  <div class="card" style="padding:20px;margin-top:14px"><div class="h" style="font-size:18px">Os teus dados</div>
   <p class="mu" style="font-size:13.5px;margin-top:4px">Leads, pipeline e sites ficam guardados <b>só neste navegador</b>. Faz uma cópia de segurança de vez em quando, ou para passares para outro computador.</p>
   <div class="row-acts"><button class="btn" id="exp">Exportar cópia (.json)</button><label class="btn">Importar cópia<input type="file" id="imp" accept="application/json" hidden></label><button class="btn ghost" id="wipe" style="color:var(--red)">Apagar tudo</button></div></div>
  <div class="row-acts" style="margin-top:14px"><button class="btn" id="lo">Terminar sessão</button><a class="btn ghost" href="/privacidade.html" target="_blank">Privacidade</a><a class="btn ghost" href="/termos.html" target="_blank">Termos</a></div></div>`;
  $('#pSave').onclick = () => { Object.assign(DB.profile, { name: $('#pName').value.trim(), company: $('#pCo').value.trim(), services: $('#pSv').value.trim(), tone: $('#pTone').value.trim() + ($('#pEx').value.trim() ? '\nExemplo de mensagem do vendedor: ' + $('#pEx').value.trim() : ''), example: $('#pEx').value.trim(), signature: $('#pSig').value.trim() }); DB.profile.toneRaw = $('#pTone').value.trim(); save(); toast('Guardado ✓'); };
  if (DB.profile.toneRaw !== undefined) $('#pTone').value = DB.profile.toneRaw;
  $('#ghOn') && ($('#ghOn').onclick = connectGithub);
  $('#ghOff') && ($('#ghOff').onclick = () => { DB.gh = null; save(); viewSettings(); });
  $('#exp').onclick = () => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify({ ...DB, gh: null }, null, 1)], { type: 'application/json' })); a.download = `droply-copia-${new Date().toISOString().slice(0, 10)}.json`; a.click(); };
  $('#imp').onchange = async e => { try { const d = JSON.parse(await e.target.files[0].text()); if (!d.leads) throw 0; DB = { ...d, gh: DB.gh }; save(); toast('Cópia importada ✓'); shell(); route(); } catch { toast('Ficheiro inválido.', true); } };
  $('#wipe').onclick = () => { if (!confirm('Apagar todos os leads, sites e definições deste navegador? Não dá para desfazer.')) return; localStorage.removeItem(KEY()); load(); shell(); route(); };
  $('#lo').onclick = () => logout();
}

/* ---------------- ADMIN ---------------- */
async function viewAdmin() {
  $('#view').innerHTML = `<div class="page" style="max-width:760px"><div class="top">${mobBtn()}<h1 class="h">Acessos</h1></div>
  <p class="mu" style="margin-top:6px">Quando alguém paga, adiciona aqui o e-mail Google dessa pessoa. Para cancelar, remove.</p>
  <div class="card" style="padding:18px;margin-top:16px;display:flex;gap:8px"><input class="in" id="ae" placeholder="email@gmail.com"><button class="btn pri" id="aa">Dar acesso</button></div>
  <div id="al" class="card" style="padding:6px 18px;margin-top:12px"><p class="mu" style="padding:12px 0"><span class="spin"></span></p></div></div>`;
  const draw = list => $('#al').innerHTML = list.length ? list.map(e => `<div style="display:flex;align-items:center;padding:10px 0;border-bottom:1px solid var(--line)"><span>${esc(e)}</span><span style="flex:1"></span><button class="btn sm ghost" data-rm="${esc(e)}" style="color:var(--red)">Remover</button></div>`).join('') : '<p class="mu" style="padding:12px 0">Ainda ninguém na lista.</p>';
  const bind = () => $$('[data-rm]').forEach(b => b.onclick = async () => { try { draw((await api('admin', { action: 'remove', email: b.dataset.rm })).emails); bind(); } catch (e) { toast(e.message, true); } });
  try { draw((await api('admin')).emails); bind(); } catch (e) { $('#al').innerHTML = `<p class="note" style="margin:12px 0">${esc(e.message)}</p>`; }
  $('#aa').onclick = async () => { try { draw((await api('admin', { action: 'add', email: $('#ae').value })).emails); bind(); $('#ae').value = ''; toast('Acesso dado ✓'); } catch (e) { toast(e.message, true); } };
}

/* ---------------- arranque ---------------- */
async function start() {
  try {
    ME = await api('me');
    if (!ME.allowed) return renderNoAccess();
    load(); shell(); route();
  } catch (e) { if (TOKEN) renderLogin(e.message); }
}
(async function boot() {
  try { CFG = await (await fetch('/api/config')).json(); } catch { CFG = {}; }
  // regresso do GitHub antes do login estar pronto
  try { TOKEN = localStorage.getItem('droply:token'); } catch {}
  if (TOKEN && tokenValid(TOKEN)) { initGoogle(); return start(); }
  TOKEN = null; renderLogin();
})();
