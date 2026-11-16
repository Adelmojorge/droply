// droply · cliente Supabase (auth, perfil, foto, plano, dados, painel admin)
// Precisa de: https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.min.js
(function () {
  const SB_URL = 'https://mlsjpyqyyghlcqkrpwbb.supabase.co';
  const SB_KEY = 'sb_publishable_A5qbXH9R0hUiz-MjqzfACw_pSSy_55c'; // chave pública (segura com RLS)
  const APP = location.origin + '/app';
  const sb = supabase.createClient(SB_URL, SB_KEY, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false, storageKey: 'droply-auth' } });

  /* ---------- links de convite / recuperação ----------
     O link chega como .../app#/criar-conta#access_token=...&type=invite (ou ?code=...) */
  async function handleAuthRedirect() {
    const href = location.href;
    const grab = k => (href.match(new RegExp('[#?&]' + k + '=([^&#]+)')) || [])[1];
    const err = grab('error_description');
    if (err) { history.replaceState(null, '', location.pathname + '#/entrar'); return { error: decodeURIComponent(err.replace(/\+/g, ' ')) }; }
    const at = grab('access_token'), rt = grab('refresh_token'), type = grab('type');
    if (at && rt) {
      const { error } = await sb.auth.setSession({ access_token: decodeURIComponent(at), refresh_token: decodeURIComponent(rt) });
      history.replaceState(null, '', location.pathname + '#/criar-conta');
      return error ? { error: error.message } : { type: type || 'invite' };
    }
    const th = grab('token_hash');
    if (th && type) {
      const { error } = await sb.auth.verifyOtp({ token_hash: decodeURIComponent(th), type });
      history.replaceState(null, '', location.pathname + '#/criar-conta');
      return error ? { error: error.message } : { type };
    }
    return null;
  }

  const uid = async () => (await sb.auth.getSession()).data.session?.user?.id || null;
  const must = r => { if (r.error) throw new Error(r.error.message || String(r.error)); return r.data; };

  /* ---------- autenticação ---------- */
  async function signIn(login, password) {
    login = String(login || '').trim();
    if (!login || !password) throw new Error('Preenche o email (ou nome de utilizador) e a palavra-passe.');
    if (login.includes('@')) {
      const { error } = await sb.auth.signInWithPassword({ email: login.toLowerCase(), password });
      if (error) throw new Error('Credenciais inválidas.');
      return true;
    }
    const r = await fetch(SB_URL + '/functions/v1/login', { method: 'POST', headers: { 'Content-Type': 'application/json', apikey: SB_KEY }, body: JSON.stringify({ login, password }) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok || !j.session) throw new Error('Credenciais inválidas.');
    must(await sb.auth.setSession({ access_token: j.session.access_token, refresh_token: j.session.refresh_token }));
    return true;
  }
  async function resetPassword(email) {
    must(await sb.auth.resetPasswordForEmail(String(email).trim().toLowerCase(), { redirectTo: APP + '#/criar-conta' }));
    return true;
  }
  async function signOut() { await sb.auth.signOut(); }
  async function session() { return (await sb.auth.getSession()).data.session; }
  async function token() { const s = await session(); return s?.access_token || null; }

  /* ---------- perfil e foto ---------- */
  async function profile() {
    const id = await uid(); if (!id) return null;
    return must(await sb.from('profiles').select('*').eq('id', id).maybeSingle());
  }
  async function usernameAvailable(u) { return !!must(await sb.rpc('username_available', { u })); }
  async function updateProfile(fields) {
    const id = await uid(); const allow = ['full_name', 'username', 'avatar_url', 'currency', 'view_currency', 'pipe_funnel', 'settings'];
    const f = Object.fromEntries(Object.entries(fields).filter(([k, v]) => allow.includes(k) && v !== undefined));
    if (f.username) f.username = f.username.toLowerCase();
    if (!Object.keys(f).length) return profile();
    return must(await sb.from('profiles').update(f).eq('id', id).select().single());
  }
  async function finishInvite({ password, username, fullName }) {
    if (password) {
      if (String(password).length < 8) throw new Error('A palavra-passe precisa de pelo menos 8 caracteres.');
      must(await sb.auth.updateUser({ password }));
    }
    return updateProfile({ username, full_name: fullName });
  }
  async function uploadAvatar(file) {
    if (!file) return null;
    if (file.size > 2 * 1024 * 1024) throw new Error('A foto tem de ter no máximo 2 MB.');
    if (!/^image\/(jpeg|png|webp|gif)$/.test(file.type)) throw new Error('Usa uma imagem JPG, PNG, WEBP ou GIF.');
    const id = await uid(); const ext = (file.type.split('/')[1] || 'jpg').replace('jpeg', 'jpg');
    const path = `${id}/avatar-${Date.now()}.${ext}`;
    must(await sb.storage.from('avatars').upload(path, file, { upsert: true, contentType: file.type }));
    const url = sb.storage.from('avatars').getPublicUrl(path).data.publicUrl;
    await updateProfile({ avatar_url: url });
    return url;
  }

  /* ---------- plano ---------- */
  async function plan() {
    const rows = must(await sb.rpc('my_plan')) || [];
    const p = rows[0]; if (!p) return null;
    return { id: p.plan_id, name: p.plan_name, status: p.status, valid_until: p.current_period_end, renew_url: p.renew_url };
  }
  async function plans() { return must(await sb.from('plans').select('*').eq('active', true)); }

  /* ---------- dados (mesmo formato do droply:<email> antigo) ---------- */
  const JTABLES = { searches: 'searches', sequences: 'sequences', sites: 'sites', studio: 'studio_items', products: 'products' };
  let CACHE = {}; // tabela -> { legacy_id: json }
  let LEADMAP = {}; // legacy_id -> uuid
  const iso = t => (t ? new Date(t).toISOString() : null);
  const ms = t => (t ? new Date(t).getTime() : null);

  async function all(table, cols = '*') {
    const out = []; let from = 0;
    for (;;) { const d = must(await sb.from(table).select(cols).range(from, from + 999)); out.push(...d); if (d.length < 1000) break; from += 1000; }
    return out;
  }
  async function loadAll() {
    const id = await uid(); if (!id) throw new Error('Sem sessão.');
    const [prof, leads, acts, sales, integ, ...rest] = await Promise.all([
      profile(), all('leads'), all('lead_activities'), all('sales'), all('integrations'),
      ...Object.values(JTABLES).map(t => all(t)),
    ]);
    CACHE = {}; LEADMAP = {};
    const db = { leads: {}, searches: [], sites: {}, profile: {}, gh: null, sequences: [], sales: [], products: [], pay: {}, studio: [] };
    const byLead = {};
    for (const a of acts) (byLead[a.lead_id] ||= []).push({ t: a.type, text: a.text, at: ms(a.at) });
    for (const r of leads) {
      const key = r.legacy_id || r.id; LEADMAP[key] = r.id;
      const l = { ...(r.data || {}), id: key, name: r.name, contact: r.contact || '', phone: r.phone || '', email: r.email || '', address: r.address || '', website: r.website || '', source: r.source || undefined,
        funnel: r.funnel || 'servicos', status: r.status || 'novo', temp: r.temp || undefined, notes: r.notes || '', value: Number(r.value) || 0, currency: r.currency, addedAt: ms(r.added_at), lastAt: ms(r.last_at), nextAt: ms(r.next_at),
        activities: (byLead[r.id] || []).sort((a, b) => b.at - a.at) };
      Object.keys(l).forEach(k => l[k] === undefined && delete l[k]);
      db.leads[key] = l;
    }
    const rev = Object.fromEntries(Object.entries(LEADMAP).map(([k, v]) => [v, k]));
    db.sales = sales.map(s => ({ ...(s.data || {}), id: s.legacy_id || s.id, client: s.client || '', product: s.product || '', value: Number(s.value) || 0, currency: s.currency, method: s.method || '', status: s.status || 'pago', at: ms(s.at), leadId: s.lead_id ? rev[s.lead_id] : (s.data?.leadId ?? null) }));
    Object.values(JTABLES).forEach((t, i) => {
      const k = Object.keys(JTABLES)[i], rows = rest[i];
      const items = rows.map(r => ({ ...(r.data || {}), id: r.legacy_id || r.data?.id || r.id }));
      if (k === 'sites') db.sites = Object.fromEntries(items.map(x => [x.id, x])); else db[k] = items;
    });
    db.searches.sort((a, b) => (b.at || 0) - (a.at || 0));
    db.studio.sort((a, b) => (b.at || 0) - (a.at || 0));
    for (const r of integ) { if (r.provider === 'github') db.gh = r.data; if (r.provider === 'pay') db.pay = r.data || {}; }
    const st = (prof && prof.settings) || {};
    db.profile = { ...st, currency: st.currency || prof?.currency || undefined, viewCur: prof?.view_currency || undefined, pipeFunnel: prof?.pipe_funnel || undefined, name: st.name || prof?.full_name || '' };
    if (!st.currencyChosen && !st.currency) delete db.profile.currency; // o utilizador escolhe a moeda
    snapshot(db);
    return db;
  }

  // guarda o "estado atual" de cada registo para só enviar o que mudou
  function rows(db) {
    const out = { leads: {}, sales: {}, profile: null, integ: {} };
    for (const l of Object.values(db.leads || {})) out.leads[l.id] = JSON.stringify(l);
    for (const s of db.sales || []) out.sales[s.id] = JSON.stringify(s);
    for (const [k, t] of Object.entries(JTABLES)) { out[t] = {}; const list = k === 'sites' ? Object.values(db.sites || {}) : db[k] || []; for (const x of list) out[t][x.id] = JSON.stringify(x); }
    out.profile = JSON.stringify(db.profile || {});
    out.integ.github = JSON.stringify(db.gh || null); out.integ.pay = JSON.stringify(db.pay || {});
    return out;
  }
  function snapshot(db) { CACHE = rows(db); }

  let saving = null, again = null;
  async function saveAll(db) {
    if (saving) { again = db; return saving; }
    saving = (async () => {
      try { await doSave(db); } finally { saving = null; }
      if (again) { const d = again; again = null; await saveAll(d); }
    })();
    return saving;
  }
  async function doSave(db) {
    const id = await uid(); if (!id) return;
    const now = rows(db), prev = CACHE;
    const changed = (a = {}, b = {}) => Object.keys(a).filter(k => a[k] !== b[k]);
    const removed = (a = {}, b = {}) => Object.keys(b).filter(k => !(k in a));

    // perfil
    if (now.profile !== prev.profile) {
      const p = db.profile || {};
      await updateProfile({ full_name: p.name || undefined, currency: p.currency || undefined, view_currency: p.viewCur || p.currency || undefined, pipe_funnel: p.pipeFunnel || null, settings: { ...p, currencyChosen: !!p.currency } });
    }
    // integrações
    for (const prov of ['github', 'pay']) if (now.integ[prov] !== prev.integ?.[prov]) {
      const data = prov === 'github' ? db.gh : db.pay;
      if (data) must(await sb.from('integrations').upsert({ user_id: id, provider: prov, data }, { onConflict: 'user_id,provider' }));
      else must(await sb.from('integrations').delete().eq('provider', prov));
    }
    // leads + atividades
    const lc = changed(now.leads, prev.leads);
    if (lc.length) {
      const payload = lc.map(k => { const l = db.leads[k]; const { id: _i, name, contact, phone, email, address, website, source, funnel, status, temp, notes, value, currency, addedAt, lastAt, nextAt, activities, ...data } = l;
        return { user_id: id, legacy_id: k, name: name || 'Sem nome', contact, phone, email, address, website, source, funnel, status, temp, notes, value: Number(value) || 0, currency: currency || db.profile?.currency || 'AOA', added_at: iso(addedAt) || new Date().toISOString(), last_at: iso(lastAt), next_at: iso(nextAt), data }; });
      for (let i = 0; i < payload.length; i += 200) {
        const res = must(await sb.from('leads').upsert(payload.slice(i, i + 200), { onConflict: 'user_id,legacy_id' }).select('id,legacy_id'));
        res.forEach(r => (LEADMAP[r.legacy_id] = r.id));
      }
      for (const k of lc) {
        const lid = LEADMAP[k]; if (!lid) continue;
        const before = prev.leads?.[k] ? JSON.parse(prev.leads[k]).activities || [] : [];
        const after = db.leads[k].activities || [];
        if (JSON.stringify(before) === JSON.stringify(after)) continue;
        must(await sb.from('lead_activities').delete().eq('lead_id', lid));
        if (after.length) must(await sb.from('lead_activities').insert(after.map(a => ({ user_id: id, lead_id: lid, type: a.t || 'note', text: a.text || '', at: iso(a.at) || new Date().toISOString() }))));
      }
    }
    const lr = removed(now.leads, prev.leads);
    if (lr.length) { must(await sb.from('leads').delete().in('legacy_id', lr)); lr.forEach(k => delete LEADMAP[k]); }
    // vendas
    const sc = changed(now.sales, prev.sales);
    if (sc.length) {
      const payload = (db.sales || []).filter(s => sc.includes(s.id)).map(s => { const { id: _i, client, product, value, currency, method, status, at, leadId, ...data } = s;
        return { user_id: id, legacy_id: s.id, lead_id: leadId && LEADMAP[leadId] ? LEADMAP[leadId] : null, client, product, value: Number(value) || 0, currency: currency || db.profile?.currency || 'AOA', method, status, at: iso(at) || new Date().toISOString(), data: { ...data, leadId: leadId || null } }; });
      must(await sb.from('sales').upsert(payload, { onConflict: 'user_id,legacy_id' }));
    }
    const sr = removed(now.sales, prev.sales);
    if (sr.length) must(await sb.from('sales').delete().in('legacy_id', sr));
    // tabelas com "data" jsonb
    for (const [k, t] of Object.entries(JTABLES)) {
      const c = changed(now[t], prev[t]), r = removed(now[t], prev[t]);
      if (c.length) {
        const list = k === 'sites' ? Object.values(db.sites || {}) : db[k] || [];
        const payload = list.filter(x => c.includes(x.id)).map(x => ({ user_id: id, legacy_id: x.id, data: x }));
        for (let i = 0; i < payload.length; i += 100) must(await sb.from(t).upsert(payload.slice(i, i + 100), { onConflict: 'user_id,legacy_id' }));
      }
      if (r.length) must(await sb.from(t).delete().in('legacy_id', r));
    }
    CACHE = now;
  }

  // sobe os dados que estavam guardados só no navegador (versão antiga do droply)
  async function migrateLocal(email) {
    const id = await uid(); if (!id) return false;
    if (localStorage.getItem('droply:migrated:' + id)) return false;
    const keys = Object.keys(localStorage).filter(k => /^droply:[^:]+@[^:]+$/.test(k));
    const mine = keys.find(k => k === 'droply:' + String(email || '').toLowerCase()) || (keys.length === 1 ? keys[0] : null);
    if (!mine) { localStorage.setItem('droply:migrated:' + id, '1'); return false; }
    let local; try { local = JSON.parse(localStorage.getItem(mine)); } catch { local = null; }
    if (!local || !local.leads) { localStorage.setItem('droply:migrated:' + id, '1'); return false; }
    const cur = await loadAll();
    const merged = { ...cur, ...local, profile: { ...local.profile, ...Object.fromEntries(Object.entries(cur.profile).filter(([, v]) => v)) },
      leads: { ...local.leads, ...cur.leads }, sites: { ...(local.sites || {}), ...cur.sites } };
    for (const k of ['searches', 'sequences', 'sales', 'products', 'studio']) { const ids = new Set((cur[k] || []).map(x => x.id)); merged[k] = [...(cur[k] || []), ...(local[k] || []).filter(x => !ids.has(x.id))]; }
    merged.pay = Object.keys(cur.pay || {}).length ? cur.pay : local.pay || {};
    merged.gh = cur.gh || local.gh || null;
    await saveAll(merged);
    localStorage.setItem('droply:migrated:' + id, '1');
    localStorage.setItem(mine + ':backup', localStorage.getItem(mine));
    return true;
  }

  /* ---------- painel admin / equipa ---------- */
  async function fn(name, body) {
    const t = await token();
    const r = await fetch(SB_URL + '/functions/v1/' + name, { method: 'POST', headers: { 'Content-Type': 'application/json', apikey: SB_KEY, Authorization: 'Bearer ' + t }, body: JSON.stringify(body) });
    const j = await r.json().catch(() => ({ error: 'Resposta inválida (' + r.status + ')' }));
    if (!r.ok || j.error) throw new Error(j.error || 'Erro ' + r.status);
    return j;
  }
  const listClients = async () => must(await sb.rpc('admin_list_clients')) || [];
  const createAccess = (email, plan, full_name) => fn('admin-access', { action: 'create', email, plan, full_name });
  const renewAccess = (email, plan) => fn('admin-access', { action: 'renew', email, plan });
  const newLink = email => fn('admin-access', { action: 'link', email });
  const cancelAccess = async email => { must(await sb.rpc('admin_cancel_access', { p_email: email })); return true; };
  const setRole = async (email, role) => { must(await sb.rpc('admin_set_role', { p_email: email, p_role: role })); return true; };

  window.droplyDB = { sb, URL: SB_URL, handleAuthRedirect, signIn, resetPassword, signOut, session, token, profile, usernameAvailable, updateProfile, finishInvite, uploadAvatar,
    plan, plans, loadAll, saveAll, migrateLocal, listClients, createAccess, renewAccess, newLink, cancelAccess, setRole, onAuth: cb => sb.auth.onAuthStateChange(cb) };
})();
