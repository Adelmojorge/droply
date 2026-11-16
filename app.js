// droply · aplicação (sem frameworks). Dados guardados no navegador do utilizador.
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const logo = s => `<img src="/assets/logo.svg" alt="" width="${s}" height="${s}">`;
const COLORS = ['#FF8A3D', '#FF3D8B', '#8B5CFF', '#C35BFF', '#FF6A5B', '#6E7BFF'];
const colorOf = s => COLORS[[...String(s)].reduce((a, c) => a + c.charCodeAt(0), 0) % COLORS.length];
const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
const DAY = 864e5;
const today0 = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d.getTime(); };
const fmtDate = d => new Date(d).toLocaleDateString('pt-PT', { day: '2-digit', month: 'short' });
const fmtDT = d => new Date(d).toLocaleString('pt-PT', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
const phoneDigits = p => String(p || '').replace(/[^\d]/g, '');
const money = (v, c) => { const n = Number(v) || 0; c ||= DB?.profile?.currency; if (!c) return n.toLocaleString('pt-PT'); if (c === 'AOA' || c === 'MZN') return n.toLocaleString('pt-BR', { maximumFractionDigits: Math.abs(n) >= 100 ? 0 : 2 }) + (c === 'AOA' ? ' Kz' : ' MT'); try { return n.toLocaleString('pt-PT', { style: 'currency', currency: c, maximumFractionDigits: n % 1 ? 2 : 0 }); } catch { return n.toLocaleString('pt-PT') + ' ' + c; } };
const CURRENCIES = ['AOA', 'MZN', 'USD', 'EUR', 'BRL', 'GBP', 'CVE', 'ZAR', 'CAD', 'CHF', 'XOF', 'XAF', 'NGN', 'KES'];
const CUR_NAMES = { AOA: 'Kwanza (Angola)', MZN: 'Metical (Moçambique)', USD: 'Dólar americano', EUR: 'Euro', BRL: 'Real (Brasil)', GBP: 'Libra esterlina', CVE: 'Escudo (Cabo Verde)', ZAR: 'Rand (África do Sul)', CAD: 'Dólar canadiano', CHF: 'Franco suíço', XOF: 'Franco CFA (Oeste)', XAF: 'Franco CFA (Central)', NGN: 'Naira (Nigéria)', KES: 'Xelim (Quénia)' };
const kz = v => String(Math.round(Number(v || 0))).replace(/\B(?=(\d{3})+(?!\d))/g, '.') + ' Kz';
const isPro = () => ME?.plan === 'pro' || ME?.admin;
const slug = s => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'site';

/* ---------------- ícones (traço fino, estilo Lovable) ---------------- */
const IC = {
  pen: '<path d="M12 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.4 2.6a1 1 0 0 1 3 3l-9 9a2 2 0 0 1-.9.5l-2.9.8a.5.5 0 0 1-.6-.6l.8-2.9a2 2 0 0 1 .5-.9z"/>',
  search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
  dash: '<rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/>',
  users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
  user: '<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
  globe: '<circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/>',
  clap: '<path d="M20.2 6 3 11l-.9-2.4c-.3-1.1.3-2.2 1.3-2.5l13.5-4c1.1-.3 2.2.3 2.5 1.3Z"/><path d="m6.2 5.3 3.1 3.9"/><path d="m12.4 3.4 3.1 4"/><path d="M3 11h18v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z"/>',
  wallet: '<path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1"/><path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4"/>',
  phone: '<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z"/>',
  mobile: '<rect width="14" height="20" x="5" y="2" rx="2"/><path d="M12 18h.01"/>',
  monitor: '<rect width="20" height="14" x="2" y="3" rx="2"/><path d="M8 21h8M12 17v4"/>',
  settings: '<path d="M12.2 2h-.4a2 2 0 0 0-2 2v.2a2 2 0 0 1-1 1.7l-.4.3a2 2 0 0 1-2 0l-.2-.1a2 2 0 0 0-2.7.7l-.2.4a2 2 0 0 0 .7 2.7l.2.1a2 2 0 0 1 1 1.7v.5a2 2 0 0 1-1 1.7l-.2.1a2 2 0 0 0-.7 2.7l.2.4a2 2 0 0 0 2.7.7l.2-.1a2 2 0 0 1 2 0l.4.3a2 2 0 0 1 1 1.7v.2a2 2 0 0 0 2 2h.4a2 2 0 0 0 2-2v-.2a2 2 0 0 1 1-1.7l.4-.3a2 2 0 0 1 2 0l.2.1a2 2 0 0 0 2.7-.7l.2-.4a2 2 0 0 0-.7-2.7l-.2-.1a2 2 0 0 1-1-1.7v-.5a2 2 0 0 1 1-1.7l.2-.1a2 2 0 0 0 .7-2.7l-.2-.4a2 2 0 0 0-2.7-.7l-.2.1a2 2 0 0 1-2 0l-.4-.3a2 2 0 0 1-1-1.7V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/>',
  down: '<path d="m6 9 6 6 6-6"/>', right: '<path d="m9 18 6-6-6-6"/>',
  logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5"/><path d="M21 12H9"/>',
  plus: '<path d="M5 12h14"/><path d="M12 5v14"/>', up: '<path d="m5 12 7-7 7 7"/><path d="M12 19V5"/>', arrow: '<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>',
  home: '<path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8"/><path d="M3 10a2 2 0 0 1 .7-1.5l7-6a2 2 0 0 1 2.6 0l7 6A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
  help: '<circle cx="12" cy="12" r="10"/><path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3"/><path d="M12 17h.01"/>',
  coins: '<circle cx="8" cy="8" r="6"/><path d="M18.1 10.4A6 6 0 1 1 10.3 18"/><path d="M7 6h1v4"/><path d="m16.7 13.9.7.7-2.8 2.8"/>',
  zap: '<path d="M4 14a1 1 0 0 1-.8-1.6l9.9-10.2a.5.5 0 0 1 .9.5l-1.9 6A1 1 0 0 0 13 10h7a1 1 0 0 1 .8 1.6l-9.9 10.2a.5.5 0 0 1-.9-.5l1.9-6A1 1 0 0 0 11 14z"/>',
  key: '<path d="m15.5 7.5 2.3 2.3a1 1 0 0 0 1.4 0l2.1-2.1a1 1 0 0 0 0-1.4L19 4"/><path d="m21 2-9.6 9.6"/><circle cx="7.5" cy="15.5" r="5.5"/>',
  menu: '<path d="M4 12h16M4 6h16M4 18h16"/>', x: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>', check: '<path d="M20 6 9 17l-5-5"/>',
  msg: '<path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/>', mail: '<rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-9 5.7a2 2 0 0 1-2 0L2 7"/>',
  clock: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
  note: '<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M16 13H8M16 17H8"/>',
  flame: '<path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.4-.5-2-1-3-1.1-2.1-.2-4 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.2.4-2.3 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M6.3 17.7l-1.4 1.4M19.1 4.9l-1.4 1.4"/>',
  snow: '<path d="M2 12h20M12 2v20M4.9 4.9l14.2 14.2M19.1 4.9 4.9 19.1"/>',
  sparkle: '<path d="M9.9 15.5a2 2 0 0 0-1.4-1.4l-6.1-1.6a.5.5 0 0 1 0-1l6.1-1.6a2 2 0 0 0 1.4-1.4l1.6-6.1a.5.5 0 0 1 1 0l1.6 6.1a2 2 0 0 0 1.4 1.4l6.1 1.6a.5.5 0 0 1 0 1l-6.1 1.6a2 2 0 0 0-1.4 1.4l-1.6 6.1a.5.5 0 0 1-1 0z"/>',
  camera: '<path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3z"/><circle cx="12" cy="13" r="3"/>',
  ban: '<circle cx="12" cy="12" r="10"/><path d="m4.9 4.9 14.2 14.2"/>',
  palette: '<circle cx="12" cy="12" r="10"/><circle cx="8" cy="10" r="1"/><circle cx="12" cy="7" r="1"/><circle cx="16" cy="10" r="1"/>',
  music: '<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>',
  mic: '<path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v3"/>',
  gem: '<path d="M6 3h12l4 6-10 13L2 9Z"/><path d="M11 3 8 9l4 13 4-13-3-6M2 9h20"/>',
  mega: '<path d="m3 11 18-5v12L3 14v-3z"/><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"/>',
  repeat: '<path d="m17 2 4 4-4 4"/><path d="M3 11v-1a4 4 0 0 1 4-4h14"/><path d="m7 22-4-4 4-4"/><path d="M21 13v1a4 4 0 0 1-4 4H3"/>',
  folder: '<path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.7-.9l-.8-1.2A2 2 0 0 0 7.9 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/>',
  film: '<rect width="18" height="18" x="3" y="3" rx="2"/><path d="M7 3v18M3 7.5h4M3 12h18M3 16.5h4M17 3v18M17 7.5h4M17 16.5h4"/>',
  trend: '<path d="m22 7-8.5 8.5-5-5L2 17"/><path d="M16 7h6v6"/>',
};
const ic = (n, s = 18) => `<svg class="i" width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${IC[n] || ''}</svg>`;
// troca emojis antigos por ícones de traço fino em toda a interface
const EMO = { '💬': 'msg', '✉️': 'mail', '✉': 'mail', '📞': 'phone', '⏰': 'clock', '📝': 'note', '🔥': 'flame', '🌤': 'sun', '❄️': 'snow', '❄': 'snow', '🎬': 'clap', '🎞️': 'film', '🧑‍🎤': 'user', '🧬': 'user', '📸': 'camera', '🚫': 'ban', '🎨': 'palette', '🎵': 'music', '🎙': 'mic', '💎': 'gem', '📣': 'mega', '🔑': 'key', '☎': 'phone', '✦': 'sparkle', '▣': 'globe', '◎': 'users', '◧': 'dash', '➜': 'arrow', '↻': 'repeat', '🌐': 'globe', '🌍': 'globe', '🖥': 'monitor', '📱': 'mobile', '⚙': 'settings', '☰': 'menu', '✕': 'x', '🎉': '', '👋': '' };
const EMO_RE = new RegExp('(' + Object.keys(EMO).sort((a, b) => b.length - a.length).map(k => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|') + ')|[\u{1F1E6}-\u{1F1FF}]{2}\\s?', 'gu');
function iconify(root) {
  if (!root) return;
  const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, { acceptNode: n => (!n.parentElement || n.parentElement.closest('textarea,option,script,style,.msg,.noic,input') ? NodeFilter.FILTER_REJECT : (EMO_RE.lastIndex = 0, EMO_RE.test(n.nodeValue)) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP) });
  const nodes = []; while (w.nextNode()) nodes.push(w.currentNode);
  for (const n of nodes) {
    const span = document.createElement('span'); span.className = 'icw';
    span.innerHTML = esc(n.nodeValue).replace(EMO_RE, (m, k) => k ? (EMO[k] ? ic(EMO[k], 16) : '') : '');
    n.replaceWith(...span.childNodes);
  }
}
new MutationObserver(ms => { for (const m of ms) for (const n of m.addedNodes) if (n.nodeType === 1) iconify(n); else if (n.nodeType === 3 && n.parentElement) iconify(n.parentElement); }).observe(document.documentElement, { childList: true, subtree: true });

/* ---------------- funis e sequências pré-feitos ---------------- */
const FUNNELS = {
  servicos: { name: 'Serviços com IA (sites, SEO, automações)', stages: [['novo', 'Novo', '#A79FB5'], ['contactado', 'Contactado', '#FF8FBB'], ['respondeu', 'Respondeu', '#8B5CFF'], ['call', 'Call marcada', '#FFC53D'], ['proposta', 'Proposta enviada', '#FF8A3D'], ['fechado', 'Fechado', '#2BD98A', 'won'], ['perdido', 'Perdido', '#7C7489', 'lost'], ['nao', 'Não contactar', '#FF5C7A', 'lost']] },
  videos: { name: 'Vídeos e conteúdo com IA', stages: [['novo', 'Novo', '#A79FB5'], ['contactado', 'Contactado', '#FF8FBB'], ['briefing', 'Briefing', '#8B5CFF'], ['amostra', 'Amostra enviada', '#FFC53D'], ['proposta', 'Proposta', '#FF8A3D'], ['fechado', 'Fechado', '#2BD98A', 'won'], ['perdido', 'Perdido', '#7C7489', 'lost']] },
  produtos: { name: 'Venda de produtos / exportação', stages: [['novo', 'Novo', '#A79FB5'], ['contactado', 'Contactado', '#FF8FBB'], ['catalogo', 'Catálogo/amostra', '#8B5CFF'], ['negociacao', 'Negociação', '#FFC53D'], ['encomenda', 'Encomenda', '#FF8A3D'], ['pago', 'Pago', '#2BD98A', 'won'], ['perdido', 'Perdido', '#7C7489', 'lost']] },
  infoproduto: { name: 'Infoproduto / curso', stages: [['novo', 'Interessado', '#A79FB5'], ['conteudo', 'Conteúdo enviado', '#8B5CFF'], ['checkout', 'Checkout enviado', '#FFC53D'], ['comprou', 'Comprou', '#2BD98A', 'won'], ['naocomprou', 'Não comprou', '#7C7489', 'lost']] },
};
const SEQS = [
  { id: 'site-pt', name: 'Site novo · 5 toques (PT)', builtin: true, steps: [
    { day: 0, ch: 'wa', text: 'Olá{{ nome}}! Vi a {{empresa}} no Google: ótimas avaliações, mas não encontrei um site. Fiz um esboço de um site para vocês. Posso mostrar-lhe em 5 minutos?' },
    { day: 2, ch: 'email', subject: 'Um site para a {{empresa}}', text: 'Olá{{ nome}},\n\nFaço sites para negócios em {{cidade}}. Vi a {{empresa}} no Google e preparei uma versão de site para vocês, pronta a mostrar.\n\nSe fizer sentido, diga-me 2 ou 3 horários e mostro-lhe em 10 minutos.\n\n{{assinatura}}\n\nSe preferir não receber mais e-mails, responda "não".' },
    { day: 4, ch: 'call', text: '1. Olá, falo com o responsável da {{empresa}}?\n2. Sou {{assinatura}}. Enviei-lhe uma mensagem sobre um site que preparei para vocês.\n3. Tem 5 minutos hoje ou amanhã para eu lho mostrar no ecrã?\n4. Se não: qual é a melhor altura para falarmos?' },
    { day: 7, ch: 'wa', text: 'Olá{{ nome}}, só para não se perder: o site da {{empresa}} continua guardado. Quer que lhe envie o link para ver quando tiver um minuto?' },
    { day: 10, ch: 'email', subject: 'Fecho o assunto?', text: 'Olá{{ nome}},\n\nNão quero insistir. Se agora não é o momento para o site da {{empresa}}, sem problema: diga-me e não volto a escrever.\n\nSe ainda tiver interesse, é só responder a este e-mail.\n\n{{assinatura}}' },
  ] },
  { id: 'site-en', name: 'Website · 5 touches (EN)', builtin: true, steps: [
    { day: 0, ch: 'wa', text: 'Hi{{ nome}}! I found {{empresa}} on Google: great reviews, but no website. I put together a quick draft for you. Can I show you in 5 minutes?' },
    { day: 2, ch: 'email', subject: 'A website for {{empresa}}', text: 'Hi{{ nome}},\n\nI build websites for businesses in {{cidade}}. I came across {{empresa}} on Google and already put a version together for you.\n\nIf it is worth a look, send me two or three times that work and I will walk you through it in 10 minutes.\n\n{{assinatura}}\n\nReply "no" and I won\'t email again.' },
    { day: 4, ch: 'call', text: '1. Hi, is this the owner of {{empresa}}?\n2. This is {{assinatura}}. I sent you a note about a website draft I made for you.\n3. Do you have 5 minutes today or tomorrow so I can share my screen?\n4. If not: when is a better time?' },
    { day: 7, ch: 'wa', text: 'Hi{{ nome}}, quick follow-up: the website draft for {{empresa}} is still saved. Want me to send you the link?' },
    { day: 10, ch: 'email', subject: 'Should I close this out?', text: 'Hi{{ nome}},\n\nI don\'t want to keep bugging you. If now isn\'t the right time for a new website, no problem, just let me know.\n\nIf you are still interested, simply reply to this email.\n\n{{assinatura}}' },
  ] },
  { id: 'reativar', name: 'Reativar lead frio (PT)', builtin: true, steps: [
    { day: 0, ch: 'wa', text: 'Olá{{ nome}}! Há algum tempo falámos sobre a {{empresa}}. Tenho uma ideia nova que pode trazer mais clientes. Posso partilhar?' },
    { day: 5, ch: 'email', subject: 'Uma ideia para a {{empresa}}', text: 'Olá{{ nome}},\n\nEstive a ver a {{empresa}} outra vez e tenho uma sugestão rápida para atrair mais clientes este mês. Quer que lha envie?\n\n{{assinatura}}\n\nSe não quiser receber mais e-mails, responda "não".' },
    { day: 12, ch: 'wa', text: 'Olá{{ nome}}, última mensagem da minha parte. Se um dia precisar de ajuda com o site ou com IA para a {{empresa}}, estou por aqui.' },
  ] },
];
const CH = { wa: ['WhatsApp', '💬'], email: ['E-mail', '✉️'], call: ['Ligação', '📞'] };
const TEMPS = [['quente', 'Quente', 'var(--warm)'], ['morno', 'Morno', '#FF8FBB'], ['frio', 'Frio', '#8FB3FF']];
const SUGG = ['Dentistas em Austin, Texas, sem site', 'Restaurantes em Lisboa com menos de 80 avaliações', 'Canalizadores em Braga sem site', 'Advogados em Miami', 'Ginásios em São Paulo', 'Supermercados em Houston'];

let CFG = {}, ME = null, TOKEN = null, DB = null, SEARCH = null, BUSY = {};

/* ---------------- armazenamento: Supabase (conta do utilizador) ---------------- */
let READONLY = false, saveT = null, saveWarned = false;
function normalize() {
  DB ||= {};
  DB.leads ||= {}; DB.searches ||= []; DB.sites ||= {}; DB.profile ||= {}; DB.gh ||= null;
  DB.sequences ||= []; DB.sales ||= []; DB.products ||= []; DB.pay ||= {}; DB.studio ||= [];
  for (const l of Object.values(DB.leads)) { l.funnel ||= 'servicos'; l.status ||= 'novo'; l.activities ||= []; if (!l.temp && l.analysis?.temperature) l.temp = l.analysis.temperature; }
  for (const s of Object.values(DB.sites)) s.leadId ??= null;
}
async function load() { DB = await droplyDB.loadAll(); normalize(); }
function save() {
  if (READONLY) { if (!saveWarned) { saveWarned = true; toast('O teu plano expirou: podes ver os dados, mas as alterações não são guardadas. Renova para continuar.', true); } return; }
  setSync('a guardar');
  clearTimeout(saveT); saveT = setTimeout(flush, 1500);
}
async function flush() {
  clearTimeout(saveT); saveT = null;
  if (!DB || READONLY) return;
  try { await droplyDB.saveAll(DB); setSync('guardado'); }
  catch (e) { setSync('erro'); toast('Não consegui guardar: ' + e.message, true); }
}
function setSync(st) { const el = $('#sync'); if (el) { el.dataset.st = st; el.textContent = st === 'a guardar' ? 'A guardar...' : st === 'erro' ? 'Erro ao guardar' : 'Guardado'; } }
addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden' && saveT) flush(); });
addEventListener('beforeunload', e => { if (saveT) { flush(); e.preventDefault(); e.returnValue = ''; } });
const allSeqs = () => [...SEQS, ...DB.sequences];
const funnelOf = l => FUNNELS[l?.funnel] || FUNNELS.servicos;
const stageOf = l => funnelOf(l).stages.find(s => s[0] === l.status) || funnelOf(l).stages[0];
const isWon = l => stageOf(l)[3] === 'won', isLost = l => stageOf(l)[3] === 'lost';
function logAct(l, t, text) { l.activities ||= []; l.activities.unshift({ t, at: Date.now(), text }); l.lastAt = Date.now(); save(); }
function fill(tpl, l) {
  const city = (l.address || '').split(',').slice(-3, -1).join(',').trim() || (l.address || '').split(',')[0] || '';
  const sig = [DB.profile.name || ME?.name, DB.profile.company].filter(Boolean).join(' · ');
  return String(tpl).replace(/\{\{ ?nome\}\}/g, m => l.contact ? (m.includes(' ') ? ' ' : '') + l.contact.split(' ')[0] : '')
    .replace(/\{\{empresa\}\}/g, l.name || '').replace(/\{\{cidade\}\}/g, city).replace(/\{\{assinatura\}\}/g, DB.profile.signature || sig);
}

/* ---------------- UI helpers ---------------- */
let tT;
function toast(m, err = false) { const t = $('#toast'); t.textContent = m; t.className = 'on' + (err ? ' err' : ''); clearTimeout(tT); tT = setTimeout(() => t.className = '', 3600); }
function modal(html, cls = 'drawer') { const m = $('#modal'); m.innerHTML = `<div class="${cls}">${html}</div>`; m.hidden = false; m.className = 'modal' + (cls === 'dialog' ? ' center' : ''); m.onclick = e => { if (e.target === m) closeModal(); }; return m; }
function closeModal() { $('#modal').hidden = true; $('#modal').innerHTML = ''; if (location.hash.startsWith('#/lead/')) history.replaceState(null, '', '#/crm'); }
async function copy(text) { try { await navigator.clipboard.writeText(text); toast('Copiado ✓'); } catch { toast('Não consegui copiar. Seleciona e copia à mão.', true); } }
const mobBtn = () => `<button class="ib mob" aria-label="Menu" onclick="document.getElementById('side').classList.toggle('open')">${ic('menu')}</button>`;
const head = (t, extra = '', sub = '') => `<div class="top">${mobBtn()}<div><h1 class="h">${t}</h1>${sub ? `<p class="mu" style="font-size:13.5px">${sub}</p>` : ''}</div><span class="sp"></span>${extra}</div>`;
const tempTag = t => { const x = TEMPS.find(a => a[0] === t); return x ? `<span class="tag"><i class="dt" style="background:${x[2]}"></i>${x[1]}</span>` : ''; };
function download(name, content, type) { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([content], { type })); a.download = name; a.click(); }

/* ---------------- API e sessão ---------------- */
async function api(path, data) {
  const token = await droplyDB.token();
  if (!token) { logout(true); throw new Error('Sessão expirada. Entra outra vez.'); }
  const r = await fetch('/api/' + path, { method: data ? 'POST' : 'GET', headers: { Authorization: 'Bearer ' + token, ...(data ? { 'Content-Type': 'application/json' } : {}) }, body: data ? JSON.stringify(data) : undefined });
  const j = await r.json().catch(() => ({ error: 'Resposta inválida do servidor.' }));
  if (r.status === 401) { logout(true); }
  if (r.status === 402 && j.code === 'no_plan' && ME) { ME = { ...ME, allowed: false }; READONLY = true; renewBanner(); }
  if (!r.ok) throw new Error(j.error || 'Erro ' + r.status);
  return j;
}
async function refreshMe() { try { const m = await api('me'); ME = { ...ME, ...m }; } catch {} }
async function logout(expired = false) {
  if (saveT) await flush();
  try { await droplyDB.signOut(); } catch {}
  ME = null; DB = null; READONLY = false;
  history.replaceState(null, '', location.pathname);
  renderLogin(expired ? 'A tua sessão expirou. Entra outra vez.' : '');
}
const authBox = (inner, wide = false) => `<div class="login"><div class="box auth${wide ? ' wide' : ''}"><a href="/" class="alogo">${logo(52)}</a>${inner}</div></div>`;
function renderLogin(msg = '') {
  $('#root').innerHTML = authBox(`<div class="h">Entrar no <span class="gt">droply</span></div>
  <p>Encontra clientes, vende, entrega e recebe.</p>
  <form id="lf" class="aform" autocomplete="on">
   <label class="lb">Email ou nome de utilizador</label><input class="in" id="lu" name="username" autocomplete="username" required placeholder="tu@email.com ou o_teu_nome">
   <label class="lb">Palavra-passe</label><input class="in" id="lp" type="password" name="password" autocomplete="current-password" required minlength="1" placeholder="••••••••">
   ${msg ? `<p class="aerr">${esc(msg)}</p>` : ''}
   <button class="btn pri big" id="lb">Entrar</button>
   <a href="javascript:void 0" id="fp" class="alink">Esqueci a palavra-passe</a>
  </form>
  <div class="anote">Ainda não tens acesso? <a href="/#precos">Escolhe um plano</a>. Depois do pagamento recebes o teu link de acesso.</div>
  <small>Ao entrar aceitas os <a href="/termos.html">Termos</a> e a <a href="/privacidade.html">Política de Privacidade</a>.</small>`);
  $('#lu').focus();
  $('#lf').onsubmit = async e => {
    e.preventDefault(); const b = $('#lb'); b.disabled = true; b.innerHTML = '<span class="spin"></span>';
    try { await droplyDB.signIn($('#lu').value, $('#lp').value); await afterAuth(); }
    catch (err) { b.disabled = false; b.textContent = 'Entrar'; let p = $('.aerr'); if (!p) { p = document.createElement('p'); p.className = 'aerr'; $('#lb').before(p); } p.textContent = err.message; }
  };
  $('#fp').onclick = () => {
    const m = modal(`<div class="h" style="font-size:22px">Recuperar a palavra-passe</div><p class="mu" style="margin-top:6px">Escreve o teu email. Se tiver conta, enviamos um link para definires uma nova palavra-passe.</p>
    <label class="lb">Email</label><input class="in" id="re" type="email" placeholder="tu@email.com" value="${esc(($('#lu').value || '').includes('@') ? $('#lu').value : '')}">
    <div class="row-acts" style="margin-top:14px"><button class="btn pri" id="rs">Enviar link</button>${CFG.supportWhatsApp ? `<a class="btn" target="_blank" rel="noopener" href="https://wa.me/${CFG.supportWhatsApp}?text=${encodeURIComponent('Olá! Preciso de um novo link de acesso ao droply.')}">Pedir novo link ao suporte</a>` : ''}</div>
    <p class="mu2" style="font-size:12.5px;margin-top:10px">Se o email não chegar em alguns minutos, vê o spam ou pede um novo link ao suporte.</p>`, 'dialog');
    $('#rs', m).onclick = async () => { const b = $('#rs', m); b.disabled = true; try { await droplyDB.resetPassword($('#re', m).value); closeModal(); toast('Se o email tiver conta, o link chega em instantes ✓'); } catch (e) { b.disabled = false; toast(e.message, true); } };
  };
}
/* criar conta (destino do link de acesso) e nova palavra-passe */
async function renderCreateAccount() {
  let prof = null; try { prof = await droplyDB.profile(); } catch {}
  const hasUser = !!prof?.username;
  $('#root').innerHTML = authBox(`<div class="h" style="font-size:34px">${hasUser ? 'Nova palavra-passe' : 'Cria a tua conta'}</div>
  <p>${hasUser ? 'Define uma nova palavra-passe para entrares no droply.' : 'Bem-vindo ao droply! Escolhe como queres entrar daqui em diante.'}</p>
  <form id="cf" class="aform">
   ${hasUser ? '' : `<div class="avpick"><label class="avp" for="cfA"><img id="cfI" alt="" hidden><span id="cfL">${ic('camera', 22)}</span></label><div><b>Foto de perfil</b><small>Opcional · JPG ou PNG até 2 MB</small><input type="file" id="cfA" accept="image/jpeg,image/png,image/webp,image/gif" hidden><label for="cfA" class="alink" style="margin:0">Escolher foto</label></div></div>
   <label class="lb">O teu nome</label><input class="in" id="cfN" required value="${esc(prof?.full_name || '')}" placeholder="Ex.: Ana Silva">
   <label class="lb">Nome de utilizador</label><div class="unw"><span>@</span><input class="in" id="cfU" required autocomplete="username" placeholder="ana_silva" pattern="[a-zA-Z0-9_.]{3,30}"></div><small id="cfUm" class="hint">3 a 30 caracteres: letras, números, _ ou .</small>`}
   <label class="lb">Palavra-passe</label><input class="in" id="cfP" type="password" minlength="8" required autocomplete="new-password" placeholder="Mínimo 8 caracteres">
   <label class="lb">Confirmar palavra-passe</label><input class="in" id="cfP2" type="password" minlength="8" required autocomplete="new-password">
   <p class="aerr" id="cfE" hidden></p>
   <button class="btn pri big" id="cfB">${hasUser ? 'Guardar e entrar' : 'Criar conta e entrar'}</button>
  </form>
  <small>Conta: <b>${esc(prof?.email || '')}</b></small>`);
  let file = null, uOK = hasUser, uT;
  const err = m => { const e = $('#cfE'); e.hidden = !m; e.textContent = m || ''; };
  if (!hasUser) {
    $('#cfA').onchange = e => { const f = e.target.files[0]; if (!f) return; if (f.size > 2 * 1024 * 1024) { e.target.value = ''; return err('A foto tem de ter no máximo 2 MB.'); } file = f; const i = $('#cfI'); i.src = URL.createObjectURL(f); i.hidden = false; $('#cfL').hidden = true; err(''); };
    $('#cfU').oninput = () => { clearTimeout(uT); uOK = false; const v = $('#cfU').value.trim().toLowerCase(), h = $('#cfUm');
      if (!/^[a-z0-9_.]{3,30}$/.test(v)) { h.textContent = '3 a 30 caracteres: letras, números, _ ou .'; h.className = 'hint'; return; }
      h.textContent = 'A verificar...'; h.className = 'hint';
      uT = setTimeout(async () => { try { uOK = await droplyDB.usernameAvailable(v); h.textContent = uOK ? '@' + v + ' está disponível ✓' : '@' + v + ' já está em uso'; h.className = 'hint ' + (uOK ? 'ok' : 'bad'); } catch { h.textContent = 'Não consegui verificar.'; } }, 350); };
  }
  $('#cf').onsubmit = async e => {
    e.preventDefault(); err('');
    const pw = $('#cfP').value; if (pw.length < 8) return err('A palavra-passe precisa de pelo menos 8 caracteres.');
    if (pw !== $('#cfP2').value) return err('As palavras-passe não coincidem.');
    if (!hasUser && !uOK) return err('Escolhe um nome de utilizador disponível.');
    const b = $('#cfB'); b.disabled = true; b.innerHTML = '<span class="spin"></span>';
    try {
      await droplyDB.finishInvite(hasUser ? { password: pw } : { password: pw, username: $('#cfU').value.trim().toLowerCase(), fullName: $('#cfN').value.trim() });
      if (file) { try { await droplyDB.uploadAvatar(file); } catch (x) { toast('Conta criada, mas a foto falhou: ' + x.message, true); } }
      history.replaceState(null, '', location.pathname + '#/'); toast(hasUser ? 'Palavra-passe atualizada ✓' : 'Conta criada ✓ Bem-vindo!'); start();
    } catch (x) { b.disabled = false; b.textContent = hasUser ? 'Guardar e entrar' : 'Criar conta e entrar'; err(x.message); }
  };
}
async function afterAuth() {
  if (location.hash.startsWith('#/criar-conta')) return renderCreateAccount();
  let prof = null; try { prof = await droplyDB.profile(); } catch {}
  if (prof && !prof.username) { history.replaceState(null, '', location.pathname + '#/criar-conta'); return renderCreateAccount(); }
  return start();
}
function renderNoAccess() {
  const first = (ME.name || '').split(' ')[0];
  $('#root').innerHTML = `<div class="login plansp"><div class="box wide">
  <div style="display:flex;justify-content:center">${logo(56)}</div>
  <div class="h" style="font-size:clamp(30px,5vw,42px)">Olá${first ? ', ' + esc(first) : ''}!<br><span class="gt">Falta ativar o teu plano.</span></div>
  <p>A conta <b>${esc(ME.email)}</b> ainda não tem um plano ativo. Escolhe um plano e paga no checkout. Assim que o pagamento for confirmado, ativamos o teu acesso.</p>
  ${plansHTML('')}
  <div style="display:flex;gap:10px;justify-content:center;margin-top:18px;flex-wrap:wrap">${CFG.supportWhatsApp ? `<a class="btn" href="https://wa.me/${CFG.supportWhatsApp}?text=${encodeURIComponent('Olá! Já paguei o droply. Conta: ' + ME.email)}" target="_blank" rel="noopener">Já paguei · falar com o suporte</a>` : ''}<button class="btn" id="rf">Já foi ativado · entrar</button><button class="btn ghost" id="out">Sair</button></div>
  <small>Pagamento mensal em kwanzas, por Multicaixa Express ou referência.</small></div></div>`;
  $$('[data-buy]').forEach(b => b.onclick = () => payModal(b.dataset.buy));
  $('#out').onclick = () => logout();
  $('#rf').onclick = () => start();
}
function renewBanner() {
  if (!READONLY || $('#rbar')) return;
  const url = ME?.renewUrl || CFG.checkout?.[ME?.lastPlan || 'basico'];
  $('.main')?.insertAdjacentHTML('afterbegin', `<div class="rbar" id="rbar">${ic('clock', 16)}<span>O teu plano ${esc(ME?.lastPlan === 'pro' ? 'Pro' : 'Básico')} expirou${ME?.until ? ' a ' + new Date(ME.until).toLocaleDateString('pt-PT') : ''}. Continuas a ver os teus dados, mas não podes editar.</span><a class="btn sm pri" href="${esc(url || '#/planos')}" target="_blank" rel="noopener">Renovar</a></div>`);
}

/* ---------------- shell ---------------- */
function dueSteps() {
  const out = [], end = today0() + DAY;
  for (const l of Object.values(DB.leads)) {
    if (isLost(l) || isWon(l)) continue;
    if (l.seq) { const s = allSeqs().find(x => x.id === l.seq.id); if (s) s.steps.forEach((st, i) => { if (l.seq.done.includes(i)) return; const at = l.seq.start + st.day * DAY; if (at < end && i === l.seq.done.length) out.push({ l, s, st, i, at }); }); }
    if (l.nextAt && l.nextAt < end) out.push({ l, at: l.nextAt, manual: true });
  }
  return out.sort((a, b) => a.at - b.at);
}
function shell() {
  const n = Object.keys(DB.leads).length, due = dueSteps().length;
  const first = (ME.name || ME.email).split(' ')[0];
  const av = ME.picture ? `<img src="${esc(ME.picture)}" alt="" referrerpolicy="no-referrer">` : `<span>${esc(first[0].toUpperCase())}</span>`;
  $('#root').innerHTML = `<div class="app">
  <aside class="side" id="side">
   <div class="sbtop"><a class="logo" href="#/" aria-label="droply">${logo(22)}</a><button class="ib mob" aria-label="Fechar" onclick="document.getElementById('side').classList.remove('open')">${ic('x')}</button></div>
   <button class="ws" id="wsBtn"><span class="wsav">${esc(first[0].toUpperCase())}</span><b>${esc(first)}'s droply</b>${ic('down', 16)}</button>
   <nav class="nav">
    <a href="#/" data-r="home">${ic('pen')}<span>Encontrar clientes</span></a>
    <a href="javascript:void 0" id="palBtn">${ic('search')}<span>Pesquisar</span><kbd>Ctrl K</kbd></a>
    <a href="#/dashboard" data-r="dashboard">${ic('dash')}<span>Dashboard</span></a>
    <a href="#/crm" data-r="clientes">${ic('users')}<span>Clientes</span>${due ? `<em class="cnt hot">${due}</em>` : n ? `<em class="cnt">${n}</em>` : ''}</a>
    <a href="#/sites" data-r="sites">${ic('globe')}<span>Sites</span></a>
    <a href="#/estudio" data-r="estudio">${ic('clap')}<span>Estúdio IA</span>${isPro() ? '' : '<em class="cnt pro">PRO</em>'}</a>
    <a href="#/vendas" data-r="vendas">${ic('wallet')}<span>Vendas</span></a>
   </nav>
   <div class="shd">Pesquisas recentes</div>
   <div class="saved">${DB.searches.slice(0, 8).map(x => `<a data-sid="${x.id}"><i style="color:${colorOf(x.label)}">${esc((x.label[0] || '?').toUpperCase())}</i><span>${esc(x.label)}</span></a>`).join('') || '<p class="sempty">As tuas pesquisas aparecem aqui.</p>'}
    ${DB.searches.length ? '<a href="#/pesquisas" class="vall">Ver tudo</a>' : ''}</div>
   <div class="sfoot">
    <a class="promo" href="#/numeros"><div><b>${isPro() ? 'O teu número grátis' : 'Número internacional'}</b><small>${isPro() ? 'Pede o teu número de qualquer país' : 'Grátis no plano Pro'}</small></div><span class="art">${ic('phone', 20)}</span></a>
    <div class="mrow"><button class="me" id="meBtn" aria-label="Conta">${av}</button><span id="sync" class="sync" data-st="guardado">Guardado</span></div>
   </div>
  </aside>
  <main class="main"><div class="scroll" id="view"></div></main></div>`;
  $$('.saved a[data-sid]').forEach(a => a.onclick = () => openSearch(a.dataset.sid));
  $('#wsBtn').onclick = e => wsMenu(e.currentTarget);
  $('#meBtn').onclick = e => meMenu(e.currentTarget);
  $('#palBtn').onclick = palette;
}
/* popovers (como os menus da Lovable) */
function pop(anchor, html, place = 'below') {
  closePop();
  const r = anchor.getBoundingClientRect(), d = document.createElement('div');
  d.className = 'pop'; d.id = 'pop'; d.innerHTML = html; document.body.appendChild(d);
  const w = d.offsetWidth, h = d.offsetHeight;
  let x = r.left, y = place === 'above' ? r.top - h - 8 : r.bottom + 6;
  x = Math.max(8, Math.min(x, innerWidth - w - 8)); y = Math.max(8, Math.min(y, innerHeight - h - 8));
  d.style.left = x + 'px'; d.style.top = y + 'px';
  setTimeout(() => document.addEventListener('mousedown', outPop), 0);
  d.addEventListener('click', e => { if (e.target.closest('a,[data-close]')) closePop(); });
  return d;
}
function outPop(e) { if (!e.target.closest('#pop')) closePop(); }
function closePop() { $('#pop')?.remove(); document.removeEventListener('mousedown', outPop); }
document.addEventListener('keydown', e => { if (e.key === 'Escape') closePop(); if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k' && ME?.allowed) { e.preventDefault(); palette(); } });
function usageRows() {
  if (!ME?.usage) return '';
  const row = (k, t) => { const u = ME.usage[k]; if (!u || (!u.limit && k === 'studio')) return ''; const pct = Math.min(100, u.used / Math.max(1, u.limit) * 100); return `<div class="ur"><span>${t}</span><span>${ME.admin ? u.used + ' · ilimitado' : u.used + ' / ' + u.limit}</span></div><div class="bar"><i style="width:${ME.admin ? 3 : pct}%"></i></div>`; };
  return row('search', 'Pesquisas') + row('analyze', 'Análises com IA') + row('site', 'Sites') + row('studio', 'Estúdio IA');
}
function wsMenu(a) {
  const first = (ME.name || ME.email).split(' ')[0];
  pop(a, `<div class="phd"><span class="wsav lg">${esc(first[0].toUpperCase())}</span><div><b>${esc(first)}'s droply</b><small>${ME.admin ? 'Administrador · sem limites' : 'Plano ' + esc(ME.planInfo?.name || '') + (ME.until ? ' · renova a ' + fmtDate(ME.until) : '')}</small></div></div>
  <div class="pcard"><div class="ur" style="margin:0 0 6px"><b>Uso este mês</b><a href="#/planos" class="plink">${isPro() ? 'Planos' : 'Passar para o Pro'}</a></div>${usageRows()}<small class="mu2">Os limites renovam no dia 1 de cada mês.</small></div>
  <a href="#/definicoes" class="pi">${ic('settings')}Definições</a>
  ${ME.staff ? `<a href="#/admin" class="pi">${ic('key')}Acessos de clientes</a>` : ''}
  ${!isPro() ? `<a href="#/planos" class="pi grad">${ic('zap')}Passar para o Pro</a>` : ''}`).classList.add('wide');
}
function meMenu(a) {
  const wa = CFG.supportWhatsApp ? `https://wa.me/${CFG.supportWhatsApp}?text=${encodeURIComponent('Olá! Preciso de ajuda com o droply. Conta: ' + ME.email)}` : '';
  const d = pop(a, `<div class="phd">${ME.picture ? `<img src="${esc(ME.picture)}" alt="" referrerpolicy="no-referrer">` : ''}<div><b>${esc(ME.name || '')}</b><small>${esc(ME.email)}</small></div></div>
  <a href="#/definicoes" class="pi">${ic('user')}Perfil e tom de voz</a>
  <a href="javascript:void 0" class="pi" id="pCur">${ic('coins')}Moeda<span class="pv">${esc(DB.profile.currency || '—')}</span></a>
  <a href="#/planos" class="pi">${ic('zap')}Planos<span class="pv">${ME.admin ? 'Admin' : esc(ME.planInfo?.name || '')}</span></a>
  <div class="psep"></div>
  ${wa ? `<a href="${wa}" target="_blank" rel="noopener" class="pi">${ic('help')}Suporte</a>` : ''}
  <a href="/" class="pi">${ic('home')}Página inicial</a>
  <div class="psep"></div>
  <a href="javascript:void 0" class="pi" id="pOut">${ic('logout')}Sair</a>`, 'above');
  $('#pCur', d).onclick = () => askCurrency(true);
  $('#pOut', d).onclick = () => logout();
}
/* pesquisa rápida (Ctrl+K) */
function palette() {
  const m = modal(`<div class="pal"><div class="palin">${ic('search')}<input id="palQ" placeholder="Procurar clientes, sites, pesquisas..." autocomplete="off"><kbd>Esc</kbd></div><div id="palR" class="palr"></div></div>`, 'dialog');
  m.querySelector('.dialog').classList.add('paldlg');
  const items = [
    ...[['#/', 'pen', 'Encontrar clientes'], ['#/dashboard', 'dash', 'Dashboard'], ['#/crm', 'users', 'Clientes'], ['#/pipeline', 'users', 'Funil'], ['#/followups', 'repeat', 'Follow-ups'], ['#/sites', 'globe', 'Sites'], ['#/estudio', 'clap', 'Estúdio IA'], ['#/vendas', 'wallet', 'Vendas'], ['#/definicoes', 'settings', 'Definições']].map(([h, i, t]) => ({ h, i, t, g: 'Ir para' })),
    ...Object.values(DB.leads).map(l => ({ h: '#/lead/' + l.id, i: 'user', t: l.name, s: (l.address || '').split(',').slice(-2).join(',').trim(), g: 'Clientes' })),
    ...Object.values(DB.sites).map(x => ({ h: '#/site/' + x.id, i: 'globe', t: x.name || 'Site', g: 'Sites' })),
    ...DB.searches.map(x => ({ sid: x.id, i: 'folder', t: x.label, s: x.leadIds.length + ' empresas', g: 'Pesquisas' })),
  ];
  const draw = () => {
    const q = $('#palQ').value.trim().toLowerCase();
    const list = items.filter(x => !q || (x.t + ' ' + (x.s || '')).toLowerCase().includes(q)).slice(0, 40);
    let g = ''; $('#palR').innerHTML = list.map((x, i) => `${x.g !== g ? `<div class="palg">${(g = x.g)}</div>` : ''}<a class="palit${i ? '' : ' on'}" ${x.sid ? `data-sid="${x.sid}" href="javascript:void 0"` : `href="${x.h}"`}>${ic(x.i)}<span>${esc(x.t)}</span>${x.s ? `<small>${esc(x.s)}</small>` : ''}</a>`).join('') || '<p class="mu" style="padding:18px">Sem resultados.</p>';
    $$('#palR [data-sid]').forEach(a => a.onclick = () => { closeModal(); openSearch(a.dataset.sid); });
    $$('#palR a[href^="#"]').forEach(a => a.addEventListener('click', () => closeModal()));
  };
  $('#palQ').oninput = draw;
  $('#palQ').onkeydown = e => {
    const all = $$('#palR .palit'), i = all.findIndex(x => x.classList.contains('on'));
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); const j = Math.max(0, Math.min(all.length - 1, i + (e.key === 'ArrowDown' ? 1 : -1))); all.forEach((x, k) => x.classList.toggle('on', k === j)); all[j]?.scrollIntoView({ block: 'nearest' }); }
    if (e.key === 'Enter') { e.preventDefault(); all[Math.max(0, i)]?.click(); }
    if (e.key === 'Escape') closeModal();
  };
  draw(); setTimeout(() => $('#palQ').focus(), 30);
}
function renderQuota() {}

/* ---------------- router ---------------- */
function route() {
  if (!ME) return;
  const h = location.hash.replace(/^#/, '') || '/';
  const [path, qs] = h.split('?');
  const parts = path.split('/').filter(Boolean);
  const r = parts[0] || 'home';
  if (r !== 'lead' && !$('#modal').hidden && DB?.profile?.currency) { $('#modal').hidden = true; $('#modal').innerHTML = ''; }
  const nav = { lead: 'clientes', site: 'sites', leads: 'clientes', crm: 'clientes', pipeline: 'clientes', followups: 'clientes', procurar: 'home' }[r] || r;
  $$('.nav a').forEach(a => a.classList.toggle('on', a.dataset.r === nav));
  $('#side')?.classList.remove('open');
  $('#view').scrollTop = 0;
  const q = new URLSearchParams(qs || '');
  const V = { home: viewSearch, pesquisas: viewSearches, dashboard: viewHome, planos: viewPlans, procurar: viewSearch, crm: viewCRM, leads: viewCRM, pipeline: viewPipeline, followups: viewFollowups, sites: () => viewSites(q), estudio: () => viewStudio(parts[1]), vendas: () => viewSales(parts[1]), numeros: viewNumbers, definicoes: viewSettings };
  if (['crm', 'leads', 'pipeline', 'followups'].includes(r)) { V[r](); return clientTabs(r === 'leads' ? 'crm' : r); }
  if (r === 'lead') { viewCRM(); clientTabs('crm'); return openLead(parts[1]); }
  if (r === 'site') return viewSite(parts[1]);
  if (r === 'admin' && ME.staff) return viewAdmin();
  if (V[r]) return V[r]();
  location.hash = '#/';
}
window.addEventListener('hashchange', route);
function clientTabs(on) {
  const t = $('#view .top'); if (!t) return;
  t.insertAdjacentHTML('afterend', `<div class="tabs big">${[['crm', 'Lista'], ['pipeline', 'Funil'], ['followups', 'Follow-ups']].map(([k, n]) => `<a href="#/${k}" class="${k === on ? 'on' : ''}">${n}${k === 'followups' && dueSteps().length ? ` <span class="cnt hot">${dueSteps().length}</span>` : ''}</a>`).join('')}</div>`);
}
/* moeda: o utilizador escolhe (nunca automático) */
function askCurrency(force = false) {
  if (DB.profile.currency && !force) return;
  const m = modal(`<div style="text-align:center">${logo(44)}</div><div class="h" style="font-size:24px;text-align:center;margin-top:12px">Em que moeda trabalhas?</div>
  <p class="mu" style="text-align:center;margin-top:6px">Usamos esta moeda no Dashboard, nas vendas e nos checkouts. Podes mudar depois nas Definições, e cada lead ou venda pode ter outra moeda.</p>
  <div class="curgrid">${CURRENCIES.map(c => `<button data-cur="${c}"><b>${c}</b><small>${CUR_NAMES[c]}</small></button>`).join('')}</div>`, 'dialog');
  m.onclick = null;
  $$('[data-cur]', m).forEach(b => b.onclick = () => { DB.profile.currency = b.dataset.cur; for (const l of Object.values(DB.leads)) l.currency ||= b.dataset.cur; save(); closeModal(); toast('Moeda: ' + b.dataset.cur + ' ✓'); route(); });
}

/* ================= PAINEL ================= */
/* câmbios do dia (open.er-api.com, grátis, inclui AOA e MZN) */
let RATES = null;
async function loadRates() {
  try { const c = JSON.parse(localStorage.getItem('droply:rates') || 'null'); if (c && Date.now() - c.at < 6 * 36e5) { RATES = c; return RATES; } } catch {}
  try { const j = await (await fetch('https://open.er-api.com/v6/latest/USD')).json(); if (j.rates) { RATES = { at: Date.now(), day: j.time_last_update_utc, rates: j.rates }; try { localStorage.setItem('droply:rates', JSON.stringify(RATES)); } catch {} } } catch {}
  return RATES;
}
function conv(v, from, to) {
  v = Number(v) || 0; if (!from || from === to) return v;
  const r = RATES?.rates; if (!r || !r[from] || !r[to]) return null;
  return v / r[from] * r[to];
}
function salesStats(view) {
  const base = DB.profile.currency, cur = view || DB.profile.viewCur || base, m0 = new Date(); m0.setDate(1); m0.setHours(0, 0, 0, 0);
  const miss = {};
  const val = (v, c) => { const x = conv(v, c || base, cur); if (x == null) { miss[c] = (miss[c] || 0) + (Number(v) || 0); return 0; } return x; };
  const sum = arr => arr.reduce((a, s) => a + val(s.value, s.currency), 0);
  const paid = DB.sales.filter(s => s.status === 'pago'), pend = DB.sales.filter(s => s.status === 'pendente'), canc = DB.sales.filter(s => s.status === 'cancelado' || s.status === 'reembolsado');
  const leads = Object.values(DB.leads), open = leads.filter(l => !isWon(l) && !isLost(l));
  const contacted = leads.filter(l => l.status !== 'novo').length, won = leads.filter(isWon).length;
  const months = [...Array(6)].map((_, i) => { const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - 5 + i); d.setHours(0, 0, 0, 0); const e = new Date(d); e.setMonth(e.getMonth() + 1); return { label: d.toLocaleDateString('pt-PT', { month: 'short' }), v: sum(paid.filter(s => s.at >= d.getTime() && s.at < e.getTime())) }; });
  const total = sum(paid);
  const byCur = paid.reduce((a, s) => (a[s.currency || base] = (a[s.currency || base] || 0) + (Number(s.value) || 0), a), {});
  return { cur, base, total, month: sum(paid.filter(s => s.at >= m0.getTime())), pend: sum(pend), pendN: pend.length, canc: sum(canc), cancN: canc.length, opp: open.reduce((a, l) => a + val(l.value, l.currency), 0), oppN: open.length, conv: contacted ? Math.round(won / contacted * 100) : 0, won, months, byCur, miss, other: {} };
}
function chart(months, cur) {
  const max = Math.max(1, ...months.map(m => m.v));
  return `<div class="chart">${months.map(m => `<div><span class="v">${m.v ? money(m.v, cur) : ''}</span><i style="height:${Math.max(3, m.v / max * 100)}%"></i><span>${m.label}</span></div>`).join('')}</div>`;
}
function viewHome() {
  if (!RATES) loadRates().then(() => { if (location.hash.startsWith('#/dashboard')) viewHome(); });
  const st = salesStats(), due = dueSteps(), first = (ME.name || '').split(' ')[0];
  const EXTRA = ['AOA', 'USD', 'EUR', 'BRL', 'MZN', 'GBP'].filter(c => c !== st.cur).slice(0, 4);
  const hot = Object.values(DB.leads).filter(l => l.temp === 'quente' && !isWon(l) && !isLost(l)).slice(0, 6);
  const acts = Object.values(DB.leads).flatMap(l => (l.activities || []).map(a => ({ ...a, l }))).sort((a, b) => b.at - a.at).slice(0, 8);
  const calls = Object.values(DB.leads).reduce((a, l) => a + (l.activities || []).filter(x => x.t === 'call').length, 0);
  $('#view').innerHTML = `<div class="page">${head('Dashboard', `<label class="curpick">${ic('coins', 16)}<span>Ver em</span><select id="vCur">${CURRENCIES.map(c => `<option value="${c}" ${c === st.cur ? 'selected' : ''}>${c}</option>`).join('')}</select>${ic('down', 14)}</label><a class="btn pri" href="#/">Encontrar clientes</a>`, `Olá${first ? ', ' + esc(first) : ''}. Tudo o que faturaste, convertido para a moeda que escolheres.`)}
  <div class="fx card">
   <div class="fxm"><small>Total faturado</small><b class="gt">${money(st.total, st.cur)}</b><span>${CUR_NAMES[st.cur] || st.cur}${Object.keys(st.byCur).length > 1 || (Object.keys(st.byCur)[0] && Object.keys(st.byCur)[0] !== st.cur) ? ' · convertido de ' + Object.keys(st.byCur).join(', ') : ''}</span></div>
   <div class="fxo">${EXTRA.map(c => { const v = conv(st.total, st.cur, c); return `<button data-vc="${c}"><small>${c}</small><b>${v == null ? '—' : money(v, c)}</b></button>`; }).join('')}</div>
   <p class="fxn">${RATES ? `Câmbio de mercado do dia (${new Date(RATES.at).toLocaleDateString('pt-PT')}). Valores aproximados — o banco pode aplicar outra taxa.` : 'A carregar o câmbio do dia...'}${Object.keys(st.miss).length ? ' Sem câmbio para: ' + Object.keys(st.miss).join(', ') + '.' : ''}</p>
  </div>
  <div class="kpis">
   <div class="kpi"><small>Receita total</small><b>${money(st.total, st.cur)}</b><span>${Object.entries(st.byCur).map(([c, v]) => money(v, c)).join(' + ') || 'vendas pagas'}</span></div>
   <div class="kpi"><small>Este mês</small><b class="gt">${money(st.month, st.cur)}</b><span>${new Date().toLocaleDateString('pt-PT', { month: 'long' })}</span></div>
   <div class="kpi"><small>Oportunidades abertas</small><b>${money(st.opp, st.cur)}</b><span>${st.oppN} leads em curso</span></div>
   <div class="kpi"><small>Taxa de conversão</small><b>${st.conv}%</b><span>${st.won} fechados</span></div>
   <div class="kpi"><small>Pendente</small><b style="color:var(--warm)">${money(st.pend, st.cur)}</b><span>${st.pendN} pagamentos</span></div>
   <div class="kpi"><small>Canceladas/reembolsos</small><b style="color:var(--red)">${money(st.canc, st.cur)}</b><span>${st.cancN} vendas</span></div>
  </div>
  <div class="cols2">
   <div class="card pad"><div class="ch3">Receita dos últimos 6 meses <a class="btn sm ghost" href="#/vendas">Ver vendas →</a></div>${chart(st.months, st.cur)}</div>
   <div class="card pad"><div class="ch3">Para hoje <a class="btn sm ghost" href="#/followups">Todos →</a></div>
    ${due.slice(0, 6).map(d => `<a class="li" href="#/lead/${d.l.id}"><span>${d.manual ? '⏰' : CH[d.st.ch][1]}</span><div><b>${esc(d.l.name)}</b><small>${d.manual ? 'Follow-up marcado' : esc(d.s.name) + ' · passo ' + (d.i + 1)}${d.at < today0() ? ' · <span style="color:var(--red)">atrasado</span>' : ''}</small></div></a>`).join('') || '<p class="mu" style="padding:10px 0">Nada para hoje. 🎉</p>'}</div>
  </div>
  <div class="cols2">
   <div class="card pad"><div class="ch3">🔥 Leads quentes <a class="btn sm ghost" href="#/crm">CRM →</a></div>
    ${hot.map(l => `<a class="li" href="#/lead/${l.id}"><span class="dot" style="background:${colorOf(l.name)}">${esc(l.name[0])}</span><div><b>${esc(l.name)}</b><small>${esc(stageOf(l)[1])}${l.value ? ' · ' + money(l.value, l.currency || st.cur) : ''}</small></div></a>`).join('') || '<p class="mu" style="padding:10px 0">Marca leads como quentes no CRM para os veres aqui.</p>'}</div>
   <div class="card pad"><div class="ch3">Atividade recente <span class="mu2" style="font-size:12px">${calls} chamadas registadas</span></div>
    ${acts.map(a => `<a class="li" href="#/lead/${a.l.id}"><span>${({ call: '📞', wa: '💬', email: '✉️', note: '📝', stage: '➜', seq: '↻', sale: '€' })[a.t] || '•'}</span><div><b>${esc(a.l.name)}</b><small>${esc(a.text)} · ${fmtDT(a.at)}</small></div></a>`).join('') || '<p class="mu" style="padding:10px 0">Ainda sem atividade.</p>'}</div>
  </div>
  <div class="quick">${[['#/', '✦', 'Encontrar clientes', 'Google Maps + IA'], ['#/sites?novo=1', '▣', 'Criar um site', 'Qualquer site, com IA'], ['#/estudio/influencer', '🎬', 'Criar influencer IA', 'Perfil, prompts, roteiros'], ['#/vendas/checkout', '€', 'Criar checkout', 'Link de pagamento']].map(([h, i, t, s]) => `<a class="card qa" href="${h}"><i>${i}</i><b>${t}</b><small>${s}</small></a>`).join('')}</div></div>`;
  const setV = c => { DB.profile.viewCur = c; save(); viewHome(); };
  $('#vCur').onchange = e => setV(e.target.value);
  $$('[data-vc]').forEach(b => b.onclick = () => setV(b.dataset.vc));
}

/* ================= ENCONTRAR CLIENTES ================= */
let HTAB = null;
function viewSearch() {
  const first = (ME.name || '').split(' ')[0];
  const tabs = [...(SEARCH ? [['res', 'Esta pesquisa']] : []), ['recent', 'Leads recentes'], ['hot', 'Quentes'], ['searches', 'Pesquisas']];
  if (!HTAB || !tabs.find(t => t[0] === HTAB)) HTAB = tabs[0][0];
  $('#view').innerHTML = `<div class="home"><div class="hbg"></div><div class="mobtop">${mobBtn()}</div>
  <div class="hero">
   <a class="toppill" href="${isPro() ? '#/numeros' : '#/planos'}"><span class="tpi">${ic('phone', 14)}</span>${isPro() ? 'Pede o teu número internacional grátis' : 'Número internacional grátis no plano Pro'}${ic('arrow', 15)}</a>
   <h1 class="hh">Que clientes procuras hoje${first ? ', ' + esc(first) : ''}?</h1>
   <div class="pbox"><textarea id="q" rows="2" placeholder="Pede ao droply para encontrar clínicas dentárias em Austin sem site..."></textarea>
    <div class="row"><button class="ib round" id="plusB" aria-label="Filtros rápidos">${ic('plus')}</button>
     <span class="chip" data-add=" nos Estados Unidos">EUA</span><span class="chip" data-add=" em Portugal">Portugal</span><span class="chip" data-add=" no Reino Unido">Reino Unido</span><span class="chip" data-add=" sem site">Sem site</span>
     <span class="sp"></span><span class="src">Google Maps ${ic('down', 14)}</span><button class="send" id="go" aria-label="Encontrar">${ic('up')}</button></div></div>
  </div>
  <div class="lower"><div class="lhd"><div class="seg">${tabs.map(([k, t]) => `<button data-ht="${k}" class="${k === HTAB ? 'on' : ''}">${t}</button>`).join('')}</div><span class="sp"></span><a class="vall2" href="${HTAB === 'searches' ? '#/pesquisas' : '#/crm'}">Ver tudo ${ic('arrow', 16)}</a></div>
   <div id="results">${homeTab()}</div></div></div>`;
  const q = $('#q');
  try { const pre = localStorage.getItem('droply:q'); if (pre) { q.value = pre; localStorage.removeItem('droply:q'); q.focus(); } } catch {}
  q.onkeydown = e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); doSearch(); } };
  $$('[data-add]').forEach(c => c.onclick = () => { q.value = (q.value.trim() + c.dataset.add).trim(); q.focus(); });
  $('#plusB').onclick = e => { const d = pop(e.currentTarget, `<div class="pgh">Sugestões</div>${SUGG.map(x => `<a href="javascript:void 0" class="pi" data-s="${esc(x)}">${ic('sparkle')}${esc(x)}</a>`).join('')}`); $$('[data-s]', d).forEach(c => c.onclick = () => { q.value = c.dataset.s; closePop(); doSearch(); }); d.classList.add('wide'); };
  $('#go').onclick = doSearch;
  $$('[data-ht]').forEach(b => b.onclick = () => { HTAB = b.dataset.ht; viewSearch(); });
  bindResults();
}
function homeTab() {
  if (HTAB === 'res' && SEARCH) return resultsHTML();
  if (HTAB === 'searches') return DB.searches.length ? `<div class="pgrid">${DB.searches.map(searchCard).join('')}</div>` : emptyHome();
  let L = Object.values(DB.leads).sort((a, b) => (b.lastAt || b.addedAt || 0) - (a.lastAt || a.addedAt || 0));
  if (HTAB === 'hot') L = L.filter(l => l.temp === 'quente' && !isWon(l) && !isLost(l));
  return L.length ? `<div class="pgrid">${L.slice(0, 12).map(leadCard).join('')}</div>` : (HTAB === 'hot' ? '<div class="empty"><p>Ainda não tens leads quentes. Analisa leads com IA ou marca-os como quentes.</p></div>' : emptyHome());
}
const emptyHome = () => `<div class="empty">${logo(40)}<div class="h">Ainda sem clientes</div><p>Escreve acima quem procuras e o droply encontra-os no Google Maps.</p></div>`;
const searchCard = x => `<a class="pcard2" href="javascript:void 0" data-sid="${x.id}"><div class="thumb" style="--c:${colorOf(x.label)}"><span class="big">${esc((x.label[0] || '?').toUpperCase())}</span><span class="badge">${x.leadIds.length} empresas</span></div><div class="meta"><span class="mav" style="background:${colorOf(x.label)}">${esc((x.label[0] || '?').toUpperCase())}</span><div><b>${esc(x.label)}</b><small>Pesquisa de ${fmtDate(x.at)}</small></div></div></a>`;
function viewSearches() {
  $('#view').innerHTML = `<div class="page">${head('Pesquisas', '<a class="btn pri" href="#/">Nova pesquisa</a>')}
  <div class="filters"><div class="sin">${ic('search', 16)}<input class="in" id="fq" placeholder="Procurar pesquisas..."></div></div>
  <div class="pgrid" id="sg">${DB.searches.map(searchCard).join('') || '<div class="empty">Ainda sem pesquisas.</div>'}</div></div>`;
  const bind = () => $$('#sg [data-sid]').forEach(a => a.onclick = () => openSearch(a.dataset.sid));
  $('#fq').oninput = e => { const q = e.target.value.toLowerCase(); $('#sg').innerHTML = DB.searches.filter(x => x.label.toLowerCase().includes(q) || x.prompt.toLowerCase().includes(q)).map(searchCard).join(''); bind(); };
  bind();
}
async function doSearch() {
  const prompt = $('#q').value.trim(); if (prompt.length < 4) return toast('Escreve que clientes procuras.', true);
  const b = $('#go'); b.disabled = true; b.innerHTML = '<span class="spin"></span>';
  try {
    const r = await api('search', { prompt });
    const s = { id: uid(), label: r.plan.label || prompt.slice(0, 40), prompt, plan: r.plan, leadIds: [], next: r.nextPageToken, at: Date.now() };
    addLeads(r.leads, s);
    DB.searches.unshift(s); DB.searches = DB.searches.slice(0, 50); save();
    SEARCH = s; HTAB = 'res'; shell(); route(); setTimeout(() => $('.lower')?.scrollIntoView({ behavior: 'smooth' }), 80);
    toast(r.leads.length ? `${r.leads.length} empresas encontradas ✓` : 'Nenhuma empresa passou nos filtros. Tenta alargar a pesquisa.');
    refreshMe();
  } catch (e) { toast(e.message, true); } finally { b.disabled = false; b.innerHTML = ic('up'); }
}
function newLead(l, extra = {}) { return { funnel: DB.profile.funnel || 'servicos', status: 'novo', notes: '', activities: [], addedAt: Date.now(), currency: DB.profile.currency, ...l, ...extra }; }
function addLeads(list, s) {
  for (const l of list) {
    if (!DB.leads[l.id]) DB.leads[l.id] = newLead(l, { search: s.label });
    else Object.assign(DB.leads[l.id], { phone: l.phone || DB.leads[l.id].phone, website: l.website || DB.leads[l.id].website, rating: l.rating, reviews: l.reviews });
    if (!s.leadIds.includes(l.id)) s.leadIds.push(l.id);
  }
}
async function loadMore() {
  const s = SEARCH; if (!s?.next) return;
  const b = $('#more'); b.disabled = true; b.innerHTML = '<span class="spin"></span>';
  try { const r = await api('search', { plan: s.plan, pageToken: s.next }); addLeads(r.leads, s); s.next = r.nextPageToken; save(); $('#results').innerHTML = homeTab(); bindResults(); refreshMe(); toast(`+${r.leads.length} empresas`); }
  catch (e) { toast(e.message, true); b.disabled = false; b.textContent = 'Carregar mais (1 pesquisa)'; }
}
function openSearch(id) { SEARCH = DB.searches.find(s => s.id === id); HTAB = 'res'; if (location.hash !== '#/' && location.hash !== '') location.hash = '#/'; else route(); setTimeout(() => $('.lower')?.scrollIntoView({ behavior: 'smooth' }), 80); }
function leadTags(l) {
  const t = [];
  if (!l.website && l.source !== 'manual') t.push('<span class="tag p">SEM SITE</span>');
  if (l.analysis) for (const n of (l.analysis.needs || []).filter(n => l.website || !/site/i.test(n.title)).slice(0, 2)) t.push(`<span class="tag ${n.severity === 'alta' ? 'r' : 'w'}">${esc(n.title.toUpperCase())}</span>`);
  if (l.analysis?.emails?.length || l.email) t.push('<span class="tag g">E-MAIL</span>');
  return t.join('');
}
function leadCard(l) {
  const sc = l.analysis?.score, c = colorOf(l.name), st = stageOf(l);
  return `<div class="pcard2 lead" data-lead="${l.id}"><div class="thumb" style="--c:${c}"><span class="big">${esc((l.name[0] || '?').toUpperCase())}</span>
   ${sc != null ? `<span class="score">${sc}</span>` : ''}<span class="badge">${!l.website && l.source !== 'manual' ? 'Sem site' : esc(st[1])}</span>
   <div class="hov">${l.analysis ? '<button class="btn sm pri" data-open>Ver mensagens</button>' : `<button class="btn sm pri" data-an="${l.id}">${BUSY[l.id] ? '<span class="spin"></span>' : ic('sparkle', 15) + ' Analisar'}</button>`}</div></div>
   <div class="meta"><span class="mav" style="background:${c}">${esc((l.name[0] || '?').toUpperCase())}</span><div style="min-width:0"><b>${esc(l.name)}</b><small>${l.rating ? l.rating + '★ · ' : ''}${l.reviews ?? 0} avaliações${l.category ? ' · ' + esc(l.category) : ''}</small></div></div>
   <div class="tags">${leadTags(l).replace('<span class="tag p">SEM SITE</span>', '')}${tempTag(l.temp)}</div></div>`;
}
function resultsHTML() {
  const s = SEARCH; const leads = s.leadIds.map(id => DB.leads[id]).filter(Boolean);
  return `<div class="rhd"><div><b>${esc(s.label)}</b><small>${leads.length} empresas · já estão nos teus Clientes</small></div><span class="sp"></span>
  <button class="btn sm" id="anAll">${ic('sparkle', 15)} Analisar as 5 melhores</button></div>
  <div class="pgrid">${leads.map(leadCard).join('') || '<div class="empty">Nenhum resultado com estes filtros.</div>'}</div>
  ${s.next ? '<div style="text-align:center;margin-top:18px"><button class="btn" id="more">Carregar mais (1 pesquisa)</button></div>' : ''}`;
}
function bindResults() {
  $$('#results [data-sid]').forEach(a => a.onclick = () => openSearch(a.dataset.sid));
  $$('#results [data-lead]').forEach(c => c.onclick = e => {
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
  BUSY[id] = true; rerender();
  try { const a = await api('analyze', { lead: l, profile: DB.profile }); l.analysis = a; if (!l.temp) l.temp = a.temperature; if (!l.email && a.emails?.[0]) l.email = a.emails[0]; save(); if (!quiet) toast('Análise pronta ✓'); refreshMe(); }
  catch (e) { toast(e.message, true); }
  finally { delete BUSY[id]; rerender(); if (location.hash === '#/lead/' + id) openLead(id); }
}
function rerender() {
  if ($('#results')) { $('#results').innerHTML = homeTab(); bindResults(); }
  if ($('#crmT')) renderCRM();
}

/* ================= CRM ================= */
function viewCRM() {
  const L = Object.values(DB.leads), acts = L.flatMap(l => l.activities || []);
  const c = t => acts.filter(a => a.t === t).length;
  $('#view').innerHTML = `<div class="page">${head('Clientes', '<button class="btn sm" id="csv">Exportar CSV</button><button class="btn sm pri" id="addL">+ Novo lead</button>', 'Todos os teus contactos, o que fizeste com cada um e o próximo passo.')}
  <div class="kpis small">
   <div class="kpi"><small>Leads</small><b>${L.length}</b></div>
   <div class="kpi"><small>🔥 Quentes</small><b style="color:var(--warm)">${L.filter(l => l.temp === 'quente').length}</b></div>
   <div class="kpi"><small>🌤 Mornos</small><b>${L.filter(l => l.temp === 'morno').length}</b></div>
   <div class="kpi"><small>❄️ Frios</small><b>${L.filter(l => l.temp === 'frio').length}</b></div>
   <div class="kpi"><small>📞 Chamadas</small><b>${c('call')}</b></div>
   <div class="kpi"><small>💬 WhatsApp</small><b>${c('wa')}</b></div>
   <div class="kpi"><small>✉️ E-mails</small><b>${c('email')}</b></div>
  </div>
  <div class="filters"><input class="in" id="lf" placeholder="Procurar por nome, cidade..."><select class="in" id="lt"><option value="">Todas as temperaturas</option>${TEMPS.map(t => `<option value="${t[0]}">${t[1]}</option>`).join('')}</select>
  <select class="in" id="lfu"><option value="">Todos os funis</option>${Object.entries(FUNNELS).map(([k, f]) => `<option value="${k}">${f.name}</option>`).join('')}</select>
  <select class="in" id="lst"><option value="">Em curso e fechados</option><option value="open">Só em curso</option><option value="won">Só ganhos</option><option value="lost">Só perdidos</option></select></div>
  <div id="crmT"></div></div>`;
  ['lf', 'lt', 'lfu', 'lst'].forEach(i => $('#' + i).oninput = renderCRM);
  $('#csv').onclick = exportCSV; $('#addL').onclick = addLeadModal;
  renderCRM();
}
function filteredLeads() {
  const f = ($('#lf')?.value || '').toLowerCase(), t = $('#lt')?.value, fu = $('#lfu')?.value, st = $('#lst')?.value;
  return Object.values(DB.leads).filter(l => (!f || (l.name + (l.address || '') + (l.category || '') + (l.contact || '')).toLowerCase().includes(f)) && (!t || l.temp === t) && (!fu || l.funnel === fu)
    && (!st || (st === 'open' ? !isWon(l) && !isLost(l) : st === 'won' ? isWon(l) : isLost(l))))
    .sort((a, b) => (b.lastAt || b.addedAt) - (a.lastAt || a.addedAt));
}
function renderCRM() {
  const L = filteredLeads();
  $('#crmT').innerHTML = L.length ? `<table class="tb"><thead><tr><th>Lead</th><th>Contacto</th><th>Temperatura</th><th>Fase</th><th>Valor</th><th>Atividade</th><th>Próximo passo</th></tr></thead><tbody>
  ${L.map(l => { const nx = l.nextAt ? fmtDate(l.nextAt) : l.seq ? 'Sequência' : '—'; const a = l.activities || [];
    return `<tr data-id="${l.id}"><td><b>${esc(l.name)}</b><br><span class="mu" style="font-size:12px">${esc(l.contact || (l.address || '').split(',').slice(-2).join(',').trim())}</span></td>
  <td style="font-size:12.5px">${esc(l.phone || '—')}<br><span class="mu">${esc(l.email || l.analysis?.emails?.[0] || '')}</span></td>
  <td>${tempTag(l.temp) || '<span class="mu2">—</span>'}</td><td><span class="tag" style="color:${stageOf(l)[2]}">${esc(stageOf(l)[1])}</span></td>
  <td>${l.value ? money(l.value, l.currency || DB.profile.currency) : '—'}</td>
  <td style="font-size:12px" class="mu">📞${a.filter(x => x.t === 'call').length} 💬${a.filter(x => x.t === 'wa').length} ✉️${a.filter(x => x.t === 'email').length}</td>
  <td style="font-size:12.5px">${l.nextAt && l.nextAt < today0() + DAY ? `<b style="color:var(--warm)">${nx}</b>` : nx}</td></tr>`; }).join('')}</tbody></table>`
    : `<div class="empty">${logo(48)}<div class="h">Ainda não tens leads aqui</div><p>Encontra clientes com o droply ou adiciona um lead à mão.</p><div class="row-acts" style="justify-content:center"><a class="btn pri" href="#/procurar">Encontrar clientes ✦</a><button class="btn" onclick="document.getElementById('addL').click()">+ Novo lead</button></div></div>`;
  $$('#crmT tr[data-id]').forEach(r => r.onclick = () => location.hash = '#/lead/' + r.dataset.id);
}
function addLeadModal() {
  const m = modal(`<div class="h" style="font-size:22px">Novo lead</div>
  <label class="lb">Empresa ou nome *</label><input class="in" id="nN">
  <div class="g2"><div><label class="lb">Pessoa de contacto</label><input class="in" id="nC"></div><div><label class="lb">Telefone / WhatsApp</label><input class="in" id="nP" placeholder="+351..."></div></div>
  <div class="g2"><div><label class="lb">E-mail</label><input class="in" id="nE"></div><div><label class="lb">Cidade / morada</label><input class="in" id="nA"></div></div>
  <div class="g2"><div><label class="lb">Funil</label><select class="in" id="nF">${Object.entries(FUNNELS).map(([k, f]) => `<option value="${k}">${f.name}</option>`).join('')}</select></div><div><label class="lb">Temperatura</label><select class="in" id="nT">${TEMPS.map(t => `<option value="${t[0]}">${t[1]}</option>`).join('')}</select></div></div>
  <div class="g2"><div><label class="lb">Valor previsto</label><input class="in" id="nV" type="number" min="0"></div><div><label class="lb">Moeda</label><select class="in" id="nM">${CURRENCIES.map(c => `<option ${c === DB.profile.currency ? 'selected' : ''}>${c}</option>`).join('')}</select></div></div>
  <label class="lb">Site (opcional)</label><input class="in" id="nW" placeholder="https://">
  <div class="row-acts" style="margin-top:16px"><button class="btn pri" id="nS">Guardar lead</button><button class="btn ghost" onclick="document.getElementById('modal').hidden=true">Cancelar</button></div>`, 'dialog');
  $('#nF', m).value = DB.profile.funnel || 'servicos'; $('#nT', m).value = 'morno';
  $('#nS', m).onclick = () => {
    const name = $('#nN', m).value.trim(); if (!name) return toast('Escreve o nome.', true);
    const id = 'm_' + uid();
    DB.leads[id] = newLead({ id, name, contact: $('#nC', m).value.trim(), phone: $('#nP', m).value.trim(), email: $('#nE', m).value.trim(), address: $('#nA', m).value.trim(), website: $('#nW', m).value.trim(), source: 'manual' }, { funnel: $('#nF', m).value, temp: $('#nT', m).value, value: Number($('#nV', m).value) || 0, currency: $('#nM', m).value });
    logAct(DB.leads[id], 'note', 'Lead criado à mão'); closeModal(); shell(); location.hash = '#/lead/' + id;
  };
}
function exportCSV() {
  const rows = [['Nome', 'Contacto', 'Telefone', 'E-mail', 'Morada', 'Site', 'Funil', 'Fase', 'Temperatura', 'Valor', 'Moeda', 'Chamadas', 'WhatsApp', 'E-mails', 'Pontuação', 'Necessidades', 'Notas']];
  for (const l of filteredLeads()) { const a = l.activities || []; rows.push([l.name, l.contact, l.phone, l.email || l.analysis?.emails?.join(' '), l.address, l.website, funnelOf(l).name, stageOf(l)[1], l.temp, l.value, l.currency, a.filter(x => x.t === 'call').length, a.filter(x => x.t === 'wa').length, a.filter(x => x.t === 'email').length, l.analysis?.score ?? '', (l.analysis?.needs || []).map(n => n.title).join('; '), l.notes]); }
  download('droply-crm.csv', '﻿' + rows.map(r => r.map(c => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',')).join('\n'), 'text/csv');
}

/* ---------- ficha do lead ---------- */
function callLog(l, after) {
  const m = modal(`<div class="h" style="font-size:20px">Como correu a chamada?</div><p class="mu">${esc(l.name)} · ${esc(l.phone)}</p>
  <div class="stages" id="co" style="margin-top:12px">${['Atendeu · interessado', 'Atendeu · sem interesse', 'Não atendeu', 'Caixa de correio', 'Número errado', 'Ligar mais tarde'].map((x, i) => `<button class="${i ? '' : 'on'}" data-o="${x}">${x}</button>`).join('')}</div>
  <label class="lb">Notas</label><textarea class="in" id="cn" rows="3"></textarea>
  <label class="lb">Voltar a ligar em</label><select class="in" id="cl"><option value="">Não marcar</option><option value="1">Amanhã</option><option value="3">3 dias</option><option value="7">1 semana</option></select>
  <div class="row-acts" style="margin-top:14px"><button class="btn pri" id="cs">Guardar</button></div>`, 'dialog');
  let o = 'Atendeu · interessado';
  $$('#co button', m).forEach(b => b.onclick = () => { o = b.dataset.o; $$('#co button', m).forEach(x => x.classList.toggle('on', x === b)); });
  $('#cs', m).onclick = () => {
    logAct(l, 'call', o + ($('#cn', m).value.trim() ? ' · ' + $('#cn', m).value.trim() : ''));
    if (o.includes('interessado') && !o.includes('sem')) l.temp = 'quente'; if (o.includes('sem interesse')) l.temp = 'frio';
    const d = $('#cl', m).value; if (d) l.nextAt = today0() + Number(d) * DAY + 10 * 3600e3;
    if (l.status === 'novo') l.status = funnelOf(l).stages[1][0];
    save(); closeModal(); toast('Chamada registada ✓'); after ? after() : openLead(l.id);
  };
}
function openLead(id) {
  const l = DB.leads[id]; if (!l) { closeModal(); return; }
  const a = l.analysis, msg = a?.messages || {}, wa = phoneDigits(l.phone), email = l.email || a?.emails?.[0] || '';
  const F = funnelOf(l), seq = l.seq && allSeqs().find(s => s.id === l.seq.id);
  const m = modal(`<button class="btn sm x" id="xx">✕</button>
  <div style="display:flex;gap:12px;align-items:center"><div class="av" style="width:48px;height:48px;border-radius:50%;background:${colorOf(l.name)};display:flex;align-items:center;justify-content:center;font:800 20px 'Plus Jakarta Sans';flex:none">${esc(l.name[0])}</div>
  <div style="min-width:0"><div class="h" style="font-size:24px">${esc(l.name)}</div><div class="mu">${esc(l.contact || l.category || '')}${l.reviews ? ' · ' + l.reviews + ' avaliações' : ''}${l.rating ? ' · ' + l.rating + '★' : ''}</div></div>
  ${a ? `<div class="score" style="font-size:34px;color:${a.score >= 80 ? 'var(--warm)' : '#fff'}">${a.score}</div>` : ''}</div>
  <div class="row-acts" style="margin-top:14px">
   ${l.phone ? `<a class="btn pri" id="dCall" href="tel:${esc(l.phone)}">📞 Ligar</a>` : ''}
   ${wa ? `<a class="btn wa" id="dWaCall" href="https://wa.me/${wa}" target="_blank" rel="noopener">💬 WhatsApp</a>` : ''}
   ${email ? `<a class="btn" id="dMail" href="mailto:${esc(email)}">✉️ E-mail</a>` : ''}
   <button class="btn" id="dNote">📝 Nota</button>
  </div>
  <div class="g3 sec">
   <div><label class="lb">Funil</label><select class="in" id="dF">${Object.entries(FUNNELS).map(([k, f]) => `<option value="${k}" ${k === l.funnel ? 'selected' : ''}>${f.name}</option>`).join('')}</select></div>
   <div><label class="lb">Temperatura</label><div class="stages">${TEMPS.map(t => `<button data-tp="${t[0]}" class="${l.temp === t[0] ? 'on' : ''}">${t[1]}</button>`).join('')}</div></div>
   <div><label class="lb">Valor</label><div style="display:flex;gap:6px"><input class="in" id="dV" type="number" min="0" value="${l.value || ''}"><select class="in" id="dM" style="width:90px">${CURRENCIES.map(c => `<option ${c === (l.currency || DB.profile.currency) ? 'selected' : ''}>${c}</option>`).join('')}</select></div></div>
  </div>
  <div class="sec"><label class="lb" style="margin-top:0">Fase</label><div class="stages">${F.stages.map(s => `<button data-st="${s[0]}" class="${l.status === s[0] ? 'on' : ''}">${s[1]}</button>`).join('')}</div></div>
  <div class="kv">
   <div><small>Telefone</small><span>${esc(l.phone || '—')}</span></div>
   <div><small>E-mail</small><span>${esc(email || (a ? 'Não encontrado no site' : '—'))}</span></div>
   <div><small>Site</small><span>${l.website ? `<a href="${esc(l.website)}" target="_blank" rel="noopener">${esc(l.website.replace(/^https?:\/\//, '').slice(0, 40))}</a>` : '<span style="color:var(--p)">Não tem site</span>'}</span></div>
   <div><small>Morada</small><span>${esc(l.address || '—')}${l.maps ? ` · <a href="${esc(l.maps)}" target="_blank" rel="noopener">Mapa ↗</a>` : ''}</span></div>
   ${a?.socials && Object.keys(a.socials).length ? `<div style="grid-column:1/-1"><small>Redes sociais</small><span>${Object.entries(a.socials).map(([k, v]) => `<a href="${esc(v)}" target="_blank" rel="noopener">${k}</a>`).join(' · ')}</span></div>` : ''}
  </div>
  <div class="sec card pad"><div class="ch3" style="margin:0">↻ Follow-up</div>
   ${seq ? `<p style="margin-top:6px">Na sequência <b>${esc(seq.name)}</b> · passo ${Math.min(l.seq.done.length + 1, seq.steps.length)} de ${seq.steps.length}</p>
    <div class="seqline">${seq.steps.map((s, i) => `<span class="${l.seq.done.includes(i) ? 'ok' : i === l.seq.done.length ? 'cur' : ''}" title="Dia ${s.day}">${CH[s.ch][1]}<small>D${s.day}</small></span>`).join('')}</div>
    <div class="row-acts">${l.seq.done.length < seq.steps.length ? '<button class="btn pri sm" id="fire">Disparar próximo passo</button>' : '<span class="tag g">SEQUÊNCIA CONCLUÍDA</span>'}<button class="btn sm ghost" id="unseq">Sair da sequência</button></div>`
    : `<div class="g2" style="margin-top:8px"><select class="in" id="sqSel">${allSeqs().map(s => `<option value="${s.id}">${esc(s.name)}</option>`).join('')}</select><button class="btn pri" id="sqGo">Iniciar sequência</button></div>`}
   <div class="g2" style="margin-top:10px"><div><label class="lb">Lembrete manual</label><input class="in" type="date" id="dNext" value="${l.nextAt ? new Date(l.nextAt).toISOString().slice(0, 10) : ''}"></div></div></div>
  ${!a ? (l.source === 'manual' && !l.website ? '' : `<div class="sec card pad" style="text-align:center"><p class="mu">Analisa este lead para veres o que precisa, a pontuação e as mensagens prontas.</p><button class="btn pri" id="anOne" style="margin-top:12px">${BUSY[id] ? '<span class="spin"></span> A analisar...' : 'Analisar com IA ✦ (1 análise)'}</button></div>`) : `
  <div class="sec"><h3>Resumo</h3><p>${esc(a.summary)}</p></div>
  <div class="sec"><h3>O que esta empresa precisa</h3>${(a.needs || []).map(n => `<div class="need"><span class="tag ${n.severity === 'alta' ? 'r' : n.severity === 'media' ? 'w' : ''}" style="height:fit-content">${esc(n.severity)}</span><div><b>${esc(n.title)}</b> <span class="mu2">· ${esc(n.service || '')}</span><p>${esc(n.detail)}</p></div></div>`).join('')}
   ${a.bestOffer ? `<div class="need" style="border-color:rgba(255,61,139,.4)"><span class="tag p" style="height:fit-content">OFERTA</span><div><b>${esc(a.bestOffer.service)}</b> <span class="mu2">· ${esc(a.bestOffer.priceHint || '')}</span><p>${esc(a.bestOffer.why)}</p></div></div>` : ''}</div>
  <div class="sec"><h3>Mensagens prontas</h3>
   <div class="tabs"><button data-tab="wa" class="on">WhatsApp</button><button data-tab="em">E-mail</button><button data-tab="call">Ligação</button><button data-tab="fu">Seguimento</button></div>
   <div data-pane="wa"><div class="msg" contenteditable="true" id="mWa">${esc(msg.whatsapp)}</div>${a.translation ? `<div class="msg tr">🇵🇹 ${esc(a.translation)}</div>` : ''}
    <div class="row-acts">${wa ? '<a class="btn wa" id="sendWa" target="_blank" rel="noopener">Enviar no WhatsApp</a>' : ''}<button class="btn" data-copy="mWa">Copiar</button></div></div>
   <div data-pane="em" hidden><input class="in" id="mSub" value="${esc(msg.email?.subject || '')}"><div class="msg" contenteditable="true" id="mEm" style="margin-top:8px">${esc(msg.email?.body || '')}</div>
    <div class="row-acts">${email ? '<a class="btn pri" id="sendEm">Enviar por e-mail</a>' : '<span class="note">E-mail não encontrado. Procura no Google ou nas redes.</span>'}<button class="btn" data-copy="mEm">Copiar</button></div></div>
   <div data-pane="call" hidden><div class="msg" id="mCall">${esc((msg.call || []).map((x, i) => (i + 1) + '. ' + x).join('\n'))}</div><div class="row-acts">${l.phone ? `<a class="btn pri" id="callScript" href="tel:${esc(l.phone)}">Ligar ${esc(l.phone)}</a>` : ''}<button class="btn" data-copy="mCall">Copiar guião</button></div></div>
   <div data-pane="fu" hidden><div class="msg" contenteditable="true" id="mFu">${esc(msg.followup || '')}</div><div class="row-acts"><button class="btn" data-copy="mFu">Copiar</button></div></div>
  </div>
  <div class="row-acts sec"><button class="btn sm" id="reAn">Analisar outra vez</button></div>`}
  <div class="sec"><h3>Site com IA</h3><button class="btn pri" id="mkSite">${Object.values(DB.sites).some(s => s.leadId === id) ? 'Abrir o site desta empresa' : 'Criar site para este lead ✦ (1 site)'}</button></div>
  <div class="sec"><h3>Histórico</h3><div class="timeline">${(l.activities || []).map(x => `<div><span>${({ call: '📞', wa: '💬', email: '✉️', note: '📝', stage: '➜', seq: '↻', sale: '€' })[x.t] || '•'}</span><div><b>${esc(x.text)}</b><small>${fmtDT(x.at)}</small></div></div>`).join('') || '<p class="mu">Ainda sem atividade.</p>'}</div></div>
  <div class="sec"><h3>Notas</h3><textarea class="in" id="notes" rows="3" placeholder="O que falaram, próximos passos...">${esc(l.notes)}</textarea></div>
  <div class="row-acts sec"><button class="btn sm ghost" id="del" style="color:var(--red)">Apagar lead</button></div>`);
  const D = m, re = () => openLead(id);
  $('#xx', D).onclick = closeModal;
  const call = e => { setTimeout(() => callLog(l), 600); };
  $('#dCall', D) && ($('#dCall', D).onclick = call); $('#callScript', D) && ($('#callScript', D).onclick = call);
  $('#dWaCall', D) && ($('#dWaCall', D).onclick = () => logAct(l, 'wa', 'Conversa aberta no WhatsApp'));
  $('#dMail', D) && ($('#dMail', D).onclick = () => logAct(l, 'email', 'E-mail aberto'));
  $('#dNote', D).onclick = () => { const t = prompt('Nota:'); if (t) { logAct(l, 'note', t); re(); } };
  $('#dF', D).onchange = e => { l.funnel = e.target.value; l.status = funnelOf(l).stages[0][0]; save(); re(); rerender(); };
  $$('[data-tp]', D).forEach(b => b.onclick = () => { l.temp = b.dataset.tp; save(); $$('[data-tp]', D).forEach(x => x.classList.toggle('on', x === b)); rerender(); });
  $('#dV', D).oninput = e => { l.value = Number(e.target.value) || 0; save(); };
  $('#dM', D).onchange = e => { l.currency = e.target.value; save(); };
  $$('[data-st]', D).forEach(b => b.onclick = () => setStage(l, b.dataset.st, re));
  $$('[data-tab]', D).forEach(b => b.onclick = () => { $$('[data-tab]', D).forEach(x => x.classList.toggle('on', x === b)); $$('[data-pane]', D).forEach(p => p.hidden = p.dataset.pane !== b.dataset.tab); });
  $$('[data-copy]', D).forEach(b => b.onclick = () => copy($('#' + b.dataset.copy).innerText));
  $('#anOne', D) && ($('#anOne', D).onclick = () => analyze(id)); $('#reAn', D) && ($('#reAn', D).onclick = () => analyze(id));
  const sw = $('#sendWa', D); if (sw) sw.onclick = () => { sw.href = `https://wa.me/${wa}?text=${encodeURIComponent($('#mWa').innerText)}`; logAct(l, 'wa', 'Mensagem enviada no WhatsApp'); if (l.status === 'novo') l.status = F.stages[1][0]; save(); rerender(); };
  const se = $('#sendEm', D); if (se) se.onclick = () => { se.href = `mailto:${email}?subject=${encodeURIComponent($('#mSub').value)}&body=${encodeURIComponent($('#mEm').innerText)}`; logAct(l, 'email', 'E-mail enviado: ' + $('#mSub').value); if (l.status === 'novo') l.status = F.stages[1][0]; save(); rerender(); };
  $('#sqGo', D) && ($('#sqGo', D).onclick = () => { l.seq = { id: $('#sqSel', D).value, start: today0() + 9 * 3600e3, done: [] }; logAct(l, 'seq', 'Entrou na sequência ' + allSeqs().find(s => s.id === l.seq.id).name); shell(); location.hash = '#/lead/' + id; re(); toast('Sequência iniciada. O 1.º passo está em Follow-ups ✓'); });
  $('#unseq', D) && ($('#unseq', D).onclick = () => { l.seq = null; save(); re(); });
  $('#fire', D) && ($('#fire', D).onclick = () => fireStep(l, () => re()));
  $('#dNext', D).onchange = e => { l.nextAt = e.target.value ? new Date(e.target.value + 'T09:00').getTime() : null; save(); toast(l.nextAt ? 'Lembrete marcado ✓' : 'Lembrete removido'); };
  $('#notes', D).oninput = e => { l.notes = e.target.value; save(); };
  $('#mkSite', D).onclick = () => { const ex = Object.values(DB.sites).find(s => s.leadId === id); closeModal(); if (ex) location.hash = '#/site/' + ex.id; else createSite({ leadId: id }); };
  $('#del', D).onclick = () => { if (!confirm('Apagar este lead?')) return; delete DB.leads[id]; DB.searches.forEach(s => s.leadIds = s.leadIds.filter(x => x !== id)); save(); closeModal(); shell(); route(); };
}
function setStage(l, st, after) {
  const old = stageOf(l)[1]; l.status = st; const ns = stageOf(l);
  logAct(l, 'stage', `${old} → ${ns[1]}`); rerender();
  if (ns[3] === 'won' && confirm('Fechaste negócio! Queres registar a venda no painel de receita?')) { saleModal({ leadId: l.id, client: l.name, value: l.value, currency: l.currency }); return; }
  if (ns[3] === 'lost' && l.seq) { l.seq = null; save(); }
  after && after();
}
function fireStep(l, after) {
  const s = allSeqs().find(x => x.id === l.seq?.id); if (!s) return;
  const i = l.seq.done.length, st = s.steps[i]; if (!st) return;
  const text = fill(st.text, l), subj = fill(st.subject || '', l), email = l.email || l.analysis?.emails?.[0];
  const m = modal(`<div class="h" style="font-size:20px">${CH[st.ch][1]} ${CH[st.ch][0]} · passo ${i + 1} de ${s.steps.length}</div><p class="mu">${esc(l.name)} · ${esc(s.name)}</p>
  ${st.ch === 'email' ? `<label class="lb">Assunto</label><input class="in" id="fS" value="${esc(subj)}">` : ''}
  <label class="lb">${st.ch === 'call' ? 'Guião' : 'Mensagem'} (podes editar)</label><div class="msg" contenteditable="true" id="fT">${esc(text)}</div>
  <div class="row-acts" style="margin-top:14px">
   ${st.ch === 'wa' ? (phoneDigits(l.phone) ? '<a class="btn wa" id="fGo" target="_blank" rel="noopener">Enviar no WhatsApp</a>' : '<span class="note">Sem telefone.</span>') : ''}
   ${st.ch === 'email' ? (email ? '<a class="btn pri" id="fGo">Enviar por e-mail</a>' : '<span class="note">Sem e-mail. Copia e envia por outro canal.</span>') : ''}
   ${st.ch === 'call' ? (l.phone ? `<a class="btn pri" id="fGo" href="tel:${esc(l.phone)}">Ligar ${esc(l.phone)}</a>` : '<span class="note">Sem telefone.</span>') : ''}
   <button class="btn" id="fC">Copiar</button><button class="btn ghost" id="fD">Marcar como feito</button><button class="btn ghost" id="fK">Saltar</button></div>`, 'dialog');
  const done = (log = true) => { l.seq.done.push(i); if (log) logAct(l, st.ch, `${s.name} · passo ${i + 1}`); if (l.status === funnelOf(l).stages[0][0]) l.status = funnelOf(l).stages[1][0]; save(); closeModal(); shell(); route(); after && after(); };
  $('#fC', m).onclick = () => copy($('#fT', m).innerText);
  $('#fD', m).onclick = () => done(); $('#fK', m).onclick = () => { l.seq.done.push(i); save(); closeModal(); shell(); route(); };
  const go = $('#fGo', m); if (go) go.onclick = () => {
    const t = $('#fT', m).innerText;
    if (st.ch === 'wa') go.href = `https://wa.me/${phoneDigits(l.phone)}?text=${encodeURIComponent(t)}`;
    if (st.ch === 'email') go.href = `mailto:${email}?subject=${encodeURIComponent($('#fS', m).value)}&body=${encodeURIComponent(t)}`;
    if (st.ch === 'call') { setTimeout(() => { l.seq.done.push(i); save(); callLog(l, () => { shell(); route(); }); }, 600); return; }
    setTimeout(() => done(), 400);
  };
}

/* ================= PIPELINE E FUNIS ================= */
function viewPipeline() {
  const fk = DB.profile.pipeFunnel || 'servicos', F = FUNNELS[fk];
  const by = k => Object.values(DB.leads).filter(l => (l.funnel || 'servicos') === fk && l.status === k);
  const total = k => by(k).reduce((a, l) => a + (Number(l.value) || 0), 0);
  $('#view').innerHTML = `<div class="page" style="max-width:none">${head('Pipeline e funis', `<select class="in" id="pf" style="width:auto">${Object.entries(FUNNELS).map(([k, f]) => `<option value="${k}" ${k === fk ? 'selected' : ''}>${f.name}</option>`).join('')}</select>`, 'Arrasta os cartões entre as fases. Cada tipo de negócio tem o seu funil pronto.')}
  <div class="kan">${F.stages.map(([k, n, c]) => `<div class="col" data-col="${k}"><h4><i style="background:${c}"></i>${n}<span>${by(k).length}</span></h4>${total(k) ? `<div class="mu2" style="font-size:11.5px;margin:-6px 4px 8px">${money(total(k), DB.profile.currency)}</div>` : ''}
  ${by(k).map(l => `<div class="kc" draggable="true" data-id="${l.id}"><b>${esc(l.name)}</b><small>${esc((l.address || l.contact || '').split(',').slice(-2).join(',').trim())}</small><div class="tags" style="margin-top:6px">${tempTag(l.temp)}${l.value ? `<span class="tag">${money(l.value, l.currency || DB.profile.currency)}</span>` : ''}</div></div>`).join('')}</div>`).join('')}</div>
  <div class="card pad" style="margin-top:16px"><div class="ch3" style="margin:0">Funis prontos</div><div class="grid" style="margin-top:10px">${Object.entries(FUNNELS).map(([k, f]) => `<div class="card pad" style="background:var(--panel2)"><b>${f.name}</b><div class="tags" style="margin-top:8px">${f.stages.map(s => `<span class="tag" style="color:${s[2]}">${s[1]}</span>`).join('')}</div></div>`).join('')}</div></div></div>`;
  $('#pf').onchange = e => { DB.profile.pipeFunnel = e.target.value; save(); viewPipeline(); };
  $$('.kc').forEach(c => { c.ondragstart = e => e.dataTransfer.setData('id', c.dataset.id); c.onclick = () => location.hash = '#/lead/' + c.dataset.id; });
  $$('.col').forEach(col => {
    col.ondragover = e => { e.preventDefault(); col.classList.add('over'); };
    col.ondragleave = () => col.classList.remove('over');
    col.ondrop = e => { e.preventDefault(); const l = DB.leads[e.dataTransfer.getData('id')]; if (l && l.status !== col.dataset.col) setStage(l, col.dataset.col, viewPipeline); else viewPipeline(); };
  });
}

/* ================= FOLLOW-UPS ================= */
function viewFollowups() {
  const due = dueSteps();
  $('#view').innerHTML = `<div class="page">${head('Follow-ups', '<button class="btn sm" id="newSeq">+ Nova sequência</button><button class="btn sm pri" id="aiSeq">Criar sequência com IA ✦</button>', 'Sequências prontas por WhatsApp, e-mail e chamada. Tu só disparas.')}
  <div class="card pad"><div class="ch3" style="margin:0">Para hoje (${due.length})</div>
   ${due.map(d => `<div class="li"><span>${d.manual ? '⏰' : CH[d.st.ch][1]}</span><div style="flex:1"><b>${esc(d.l.name)}</b><small>${d.manual ? 'Lembrete marcado' : esc(d.s.name) + ' · passo ' + (d.i + 1) + ' · ' + CH[d.st.ch][0]} · ${d.at < today0() ? '<span style="color:var(--red)">atrasado</span>' : 'hoje'}</small></div>
    ${d.manual ? `<a class="btn sm" href="#/lead/${d.l.id}">Abrir</a><button class="btn sm ghost" data-clr="${d.l.id}">Feito</button>` : `<button class="btn sm pri" data-fire="${d.l.id}">Disparar</button>`}</div>`).join('') || '<p class="mu" style="padding:10px 0">Tudo em dia. Abre um lead no CRM e inicia uma sequência.</p>'}</div>
  <div class="ch3" style="margin-top:22px">Sequências</div><div class="grid">${allSeqs().map(s => `<div class="card pad"><div style="display:flex;align-items:center;gap:8px"><b style="flex:1">${esc(s.name)}</b>${s.builtin ? '<span class="tag">PRONTA</span>' : `<button class="btn sm ghost" data-ed="${s.id}">Editar</button>`}</div>
   <div class="seqline" style="margin-top:10px">${s.steps.map(st => `<span>${CH[st.ch][1]}<small>D${st.day}</small></span>`).join('')}</div>
   <small class="mu">${Object.values(DB.leads).filter(l => l.seq?.id === s.id).length} leads nesta sequência</small>
   <div class="row-acts"><button class="btn sm" data-dup="${s.id}">Duplicar e editar</button></div></div>`).join('')}</div></div>`;
  $$('[data-fire]').forEach(b => b.onclick = () => fireStep(DB.leads[b.dataset.fire], viewFollowups));
  $$('[data-clr]').forEach(b => b.onclick = () => { const l = DB.leads[b.dataset.clr]; l.nextAt = null; logAct(l, 'note', 'Lembrete concluído'); shell(); route(); });
  $$('[data-ed]').forEach(b => b.onclick = () => seqEditor(DB.sequences.find(s => s.id === b.dataset.ed)));
  $$('[data-dup]').forEach(b => b.onclick = () => { const s = allSeqs().find(x => x.id === b.dataset.dup); seqEditor({ ...JSON.parse(JSON.stringify(s)), id: uid(), name: s.name + ' (cópia)', builtin: false }, true); });
  $('#newSeq').onclick = () => seqEditor({ id: uid(), name: 'Nova sequência', steps: [{ day: 0, ch: 'wa', text: 'Olá{{ nome}}! ' }] }, true);
  $('#aiSeq').onclick = () => {
    const m = modal(`<div class="h" style="font-size:20px">Criar sequência com IA</div>
    <label class="lb">O que vendes</label><input class="in" id="aS" placeholder="Ex.: sites para clínicas dentárias">
    <label class="lb">Para quem (país, tipo de cliente)</label><input class="in" id="aP" placeholder="Ex.: dentistas nos EUA">
    <label class="lb">Língua das mensagens</label><select class="in" id="aL"><option>Português (Portugal)</option><option>Português (Brasil)</option><option>Inglês</option><option>Espanhol</option><option>Francês</option></select>
    <label class="lb">Número de passos e duração</label><input class="in" id="aN" value="5 passos em 12 dias">
    <div class="row-acts" style="margin-top:14px"><button class="btn pri" id="aGo">Criar ✦ (1 estúdio)</button></div>`, 'dialog');
    $('#aGo', m).onclick = async () => { const b = $('#aGo', m); b.disabled = true; b.innerHTML = '<span class="spin"></span>';
      try { const r = await api('studio', { mode: 'sequence', input: { servico: $('#aS', m).value, publico: $('#aP', m).value, lingua: $('#aL', m).value, passos: $('#aN', m).value, tom: DB.profile.toneRaw || '' } });
        const seq = { id: uid(), name: r.nome || 'Sequência IA', steps: (r.passos || []).map(p => ({ day: Number(p.dia) || 0, ch: ['wa', 'email', 'call'].includes(p.canal) ? p.canal : 'wa', subject: p.assunto || '', text: p.texto || '' })) };
        refreshMe(); seqEditor(seq, true); } catch (e) { toast(e.message, true); b.disabled = false; b.textContent = 'Tentar outra vez'; } };
  };
}
function seqEditor(seq, isNew = false) {
  const draw = () => {
    const m = modal(`<button class="btn sm x" id="xx">✕</button><div class="h" style="font-size:22px">Editar sequência</div>
    <p class="mu" style="font-size:13px">Variáveis: {{ nome}} (nome da pessoa, se souberes), {{empresa}}, {{cidade}}, {{assinatura}}.</p>
    <label class="lb">Nome</label><input class="in" id="sN" value="${esc(seq.name)}">
    ${seq.steps.map((s, i) => `<div class="card pad" style="margin-top:12px"><div style="display:flex;gap:8px;align-items:center"><b>Passo ${i + 1}</b><span class="sp" style="flex:1"></span>
     <label class="mu" style="font-size:12px">Dia</label><input class="in" type="number" min="0" data-k="day" data-i="${i}" value="${s.day}" style="width:70px">
     <select class="in" data-k="ch" data-i="${i}" style="width:130px">${Object.entries(CH).map(([k, v]) => `<option value="${k}" ${k === s.ch ? 'selected' : ''}>${v[1]} ${v[0]}</option>`).join('')}</select><button class="btn sm ghost" data-rm="${i}">✕</button></div>
     ${s.ch === 'email' ? `<input class="in" data-k="subject" data-i="${i}" value="${esc(s.subject || '')}" placeholder="Assunto" style="margin-top:8px">` : ''}
     <textarea class="in" data-k="text" data-i="${i}" rows="4" style="margin-top:8px">${esc(s.text)}</textarea></div>`).join('')}
    <div class="row-acts" style="margin-top:12px"><button class="btn" id="sAdd">+ Passo</button><span style="flex:1"></span>${!isNew ? '<button class="btn ghost" id="sDel" style="color:var(--red)">Apagar</button>' : ''}<button class="btn pri" id="sSave">Guardar sequência</button></div>`);
    $('#xx', m).onclick = closeModal;
    $$('[data-k]', m).forEach(el => el.oninput = el.onchange = () => { const s = seq.steps[el.dataset.i]; s[el.dataset.k] = el.dataset.k === 'day' ? Number(el.value) || 0 : el.value; if (el.dataset.k === 'ch') draw(); });
    $('#sN', m).oninput = e => seq.name = e.target.value;
    $$('[data-rm]', m).forEach(b => b.onclick = () => { seq.steps.splice(b.dataset.rm, 1); draw(); });
    $('#sAdd', m).onclick = () => { seq.steps.push({ day: (seq.steps.at(-1)?.day || 0) + 3, ch: 'wa', text: '' }); draw(); };
    $('#sDel', m) && ($('#sDel', m).onclick = () => { if (!confirm('Apagar esta sequência?')) return; DB.sequences = DB.sequences.filter(s => s.id !== seq.id); save(); closeModal(); viewFollowups(); });
    $('#sSave', m).onclick = () => { seq.steps.sort((a, b) => a.day - b.day); const i = DB.sequences.findIndex(s => s.id === seq.id); if (i >= 0) DB.sequences[i] = seq; else DB.sequences.push(seq); save(); closeModal(); toast('Sequência guardada ✓'); if (location.hash.startsWith('#/followups')) viewFollowups(); };
  };
  draw();
}

/* ================= SITES ================= */
async function createSite({ leadId = null, brief = '', name = '' }) {
  const l = leadId ? DB.leads[leadId] : null;
  const key = 'site:' + (leadId || uid()); BUSY[key] = name || l?.name || 'Novo site';
  location.hash = '#/sites'; toast('A criar o site com IA... pode levar até 1 minuto.'); viewSites(new URLSearchParams());
  try {
    const r = await api('site', l ? { lead: l, analysis: l.analysis } : { brief });
    const id = uid(); DB.sites[id] = { id, leadId, name: name || l?.name || 'Novo site', brief, html: r.html, createdAt: Date.now(), updatedAt: Date.now(), versions: [] }; save();
    refreshMe(); shell(); location.hash = '#/site/' + id;
  } catch (e) { toast(e.message, true); } finally { delete BUSY[key]; if (location.hash.startsWith('#/sites')) viewSites(new URLSearchParams()); }
}
function newSiteModal() {
  const ideas = ['Landing page para um curso online de marketing com IA', 'Portfólio de um fotógrafo de casamentos em Luanda', 'Site de uma pastelaria em Lisboa com menu e encomendas por WhatsApp', 'Página de vendas para um ebook sobre investir em criptomoedas para iniciantes', 'Site para uma agência de vídeos com IA para marcas'];
  const m = modal(`<div class="h" style="font-size:22px">Criar um site com IA</div><p class="mu" style="font-size:13.5px">Descreve qualquer site: negócio, portfólio, landing page, loja, evento, infoproduto.</p>
  <label class="lb">Nome do projeto</label><input class="in" id="sNm" placeholder="Ex.: Pastelaria Doce Lar">
  <label class="lb">Descreve o site</label><textarea class="in" id="sBr" rows="6" placeholder="O que é, para quem, secções que queres, cores, contactos, língua..."></textarea>
  <div class="tags" style="margin-top:10px">${ideas.map(x => `<span class="chip" data-i="${esc(x)}">${esc(x)}</span>`).join('')}</div>
  <div class="row-acts" style="margin-top:14px"><button class="btn pri" id="sGo">Criar site ✦ (1 site)</button></div>`, 'dialog');
  $$('[data-i]', m).forEach(c => c.onclick = () => { $('#sBr', m).value = c.dataset.i; });
  $('#sGo', m).onclick = () => { const brief = $('#sBr', m).value.trim(); if (brief.length < 10) return toast('Descreve o site com mais detalhe.', true); const name = $('#sNm', m).value.trim() || brief.slice(0, 40); closeModal(); createSite({ brief, name }); };
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
    history.replaceState(null, '', '/app' + (back || '#/sites')); return true;
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
  const pending = Object.entries(BUSY).filter(([k]) => k.startsWith('site:')).map(([, v]) => v);
  $('#view').innerHTML = `<div class="page">${head('Sites com IA', `${DB.gh?.token ? `<span class="tag g">GITHUB · @${esc(DB.gh.login || 'ligado')}</span>` : '<button class="btn sm" id="gh">Ligar GitHub</button>'}<button class="btn sm pri" id="nsite">+ Criar site</button>`, 'Cria qualquer site com IA, edita com instruções simples e publica grátis no GitHub + Vercel.')}
  ${pending.length ? `<div class="card pad" style="margin-top:16px;display:flex;gap:10px;align-items:center"><span class="spin"></span> A criar: ${pending.map(esc).join(', ')}</div>` : ''}
  <div class="grid">${S.map(s => `<a class="card lead" href="#/site/${s.id}" style="text-decoration:none"><div style="height:150px;border-radius:12px;overflow:hidden;background:#fff;position:relative"><iframe srcdoc="${esc(s.html)}" style="width:400%;height:400%;transform:scale(.25);transform-origin:0 0;border:0;pointer-events:none" sandbox="allow-scripts" loading="lazy"></iframe></div><b>${esc(s.name)}</b><small>${s.repo ? '🌐 ' + esc(s.repo) : 'Ainda não publicado'} · ${fmtDate(s.updatedAt)}</small></a>`).join('')}</div>
  ${!S.length && !pending.length ? `<div class="empty">${logo(48)}<div class="h">Ainda não criaste sites</div><p>Cria um site do zero ou a partir de um lead do CRM.</p><button class="btn pri" onclick="document.getElementById('nsite').click()" style="margin-top:14px">+ Criar site</button></div>` : ''}</div>`;
  $('#gh') && ($('#gh').onclick = connectGithub);
  $('#nsite').onclick = newSiteModal;
  if (qs.get('novo')) { history.replaceState(null, '', '#/sites'); newSiteModal(); }
}
function viewSite(id) {
  const s = DB.sites[id]; if (!s) return (location.hash = '#/sites');
  const l = s.leadId ? DB.leads[s.leadId] : null;
  $('#view').innerHTML = `<div class="page" style="max-width:none"><div class="top">${mobBtn()}<a class="btn sm" href="#/sites">←</a><h1 class="h" style="font-size:24px">${esc(s.name)}</h1><span class="sp"></span>
  <button class="btn sm" id="dl">Descarregar HTML</button><button class="btn sm" id="open">Ecrã inteiro</button></div>
  <div class="editor"><div class="pane">
   <div class="card pad"><b>Pede alterações</b><textarea class="in" id="ins" rows="4" style="margin-top:8px" placeholder="Ex.: muda as cores para azul-escuro, acrescenta uma secção de preços, põe o botão de WhatsApp maior"></textarea>
   <button class="btn pri" id="edit" style="margin-top:10px;width:100%">Aplicar com IA ✦ (1 site)</button>${s.versions?.length ? '<button class="btn sm ghost" id="undo" style="margin-top:6px;width:100%">↶ Desfazer última alteração</button>' : ''}</div>
   <div class="card pad"><b>Publicar grátis</b>
    <div class="steps" style="margin-top:10px">
     <div><span>${DB.gh?.token ? `GitHub ligado como <b>@${esc(DB.gh.login || '')}</b>` : '<button class="btn sm" id="gh">Ligar o meu GitHub</button>'}</span></div>
     <div><span>Enviar para um repositório${s.repo ? `<br><a href="https://github.com/${esc(s.repo)}" target="_blank" rel="noopener" class="mu">github.com/${esc(s.repo)} ↗</a>` : ''}<br><button class="btn sm" id="push" style="margin-top:6px" ${DB.gh?.token ? '' : 'disabled'}>${s.repo ? 'Atualizar no GitHub' : 'Enviar para o GitHub'}</button></span></div>
     <div><span>Publicar na Vercel (só na 1.ª vez)<br>${s.repo ? `<a class="btn sm pri" style="margin-top:6px" href="https://vercel.com/new/import?s=${encodeURIComponent('https://github.com/' + s.repo)}" target="_blank" rel="noopener">Publicar na Vercel ↗</a>` : '<span class="mu2">Primeiro envia para o GitHub.</span>'}</span></div>
    </div><p class="note" style="margin-top:12px">Fica num endereço grátis tipo <b>nome.vercel.app</b>. Depois, cada "Atualizar no GitHub" publica sozinho.</p></div>
   ${l ? `<a class="btn sm" href="#/lead/${l.id}">Ver o lead</a>` : ''}
  </div>
  <div class="frame"><div class="bar"><i style="background:#FF5C7A"></i><i style="background:#FFC53D"></i><i style="background:#2BD98A"></i><span style="margin-left:8px">${esc(slug(s.name))}.vercel.app</span><span style="margin-left:auto;display:flex;gap:6px"><button class="btn sm ghost" data-w="100%">🖥</button><button class="btn sm ghost" data-w="390px">📱</button></span></div>
  <div style="flex:1;display:flex;justify-content:center;background:#E9E6EE"><iframe id="pv" sandbox="allow-scripts allow-popups" style="width:100%;height:100%"></iframe></div></div></div></div>`;
  $('#pv').srcdoc = s.html;
  $$('[data-w]').forEach(b => b.onclick = () => $('#pv').style.width = b.dataset.w);
  $('#dl').onclick = () => download(slug(s.name) + '.html', s.html, 'text/html');
  $('#open').onclick = () => { const w = window.open(); if (w) { w.document.write(s.html); w.document.close(); } };
  $('#gh') && ($('#gh').onclick = connectGithub);
  $('#push').onclick = () => pushGithub(s);
  $('#undo') && ($('#undo').onclick = () => { s.html = s.versions.pop(); s.updatedAt = Date.now(); save(); viewSite(id); });
  $('#edit').onclick = async () => {
    const ins = $('#ins').value.trim(); if (!ins) return toast('Diz o que queres mudar.', true);
    const b = $('#edit'); b.disabled = true; b.innerHTML = '<span class="spin"></span> A aplicar...';
    try { const r = await api('site', l ? { lead: l, analysis: l.analysis, instructions: ins, currentHtml: s.html } : { instructions: ins, currentHtml: s.html }); s.versions = [...(s.versions || []), s.html].slice(-5); s.html = r.html; s.updatedAt = Date.now(); save(); refreshMe(); toast('Alteração aplicada ✓'); viewSite(id); }
    catch (e) { toast(e.message, true); b.disabled = false; b.textContent = 'Aplicar com IA ✦ (1 site)'; }
  };
}
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

/* ================= ESTÚDIO IA ================= */
const STUDIO = {
  influencer: { t: 'Influencer de IA', i: '🧑‍🎤', d: 'Perfil, posicionamento, estratégia, prompts de imagem consistentes e roteiros de vídeo.', f: [
    ['nome', 'Nome (opcional)', 'Ex.: Luna Costa'], ['nicho', 'Nicho', 'Ex.: beleza natural, fitness, finanças pessoais'], ['produto', 'O que vai vender', 'Ex.: sérum facial da minha marca, curso, links de afiliado'],
    ['publico', 'Público-alvo', 'Ex.: mulheres 25-40 em Portugal e Brasil'], ['aparencia', 'Aparência e características', 'Ex.: mulher, 27 anos, cabelo cacheado castanho, sardas, estilo minimalista'],
    ['estilo', 'Estilo de conteúdo e personalidade', 'Ex.: calma, educativa, divertida, estética clean'], ['plataformas', 'Plataformas', 'Instagram, TikTok'], ['lingua', 'Língua dos conteúdos', 'Português (Brasil)'],
    ['referencias', 'Vídeos virais de referência (cola descrições, transcrições ou links)', 'Ex.: "POV: acordas às 5h..." com 2M views; gancho com pergunta...', 'ta']] },
  scripts: { t: 'Roteiros virais', i: '🎞️', d: 'Roteiros de vídeos curtos com base em vídeos virais que tu escolhes.', f: [
    ['tema', 'Tema ou produto', 'Ex.: site com IA para restaurantes'], ['plataforma', 'Plataforma', 'TikTok / Reels / Shorts'], ['publico', 'Público', 'Ex.: donos de restaurantes'],
    ['quantidade', 'Quantos roteiros', '3'], ['lingua', 'Língua', 'Português (Portugal)'], ['personagem', 'Influencer/character sheet (opcional)', 'Cola aqui o character sheet do teu influencer', 'ta'],
    ['referencias', 'Referências virais', 'Cola descrições ou transcrições de vídeos que bombaram', 'ta']] },
  ad: { t: 'Anúncio em vídeo', i: '📣', d: 'Anúncios com IA para supermercados, restaurantes, clínicas e lojas, cena a cena.', f: [
    ['negocio', 'Negócio', 'Ex.: supermercado familiar em Houston'], ['oferta', 'Produto ou oferta', 'Ex.: promoção de fim de semana em fruta fresca'], ['publico', 'Público', 'Ex.: famílias do bairro'],
    ['duracao', 'Duração', '15 segundos'], ['formato', 'Formato', '9:16 para Reels/TikTok'], ['lingua', 'Língua do anúncio', 'Inglês'], ['estilo', 'Estilo visual', 'Ex.: quente, cinematográfico, cores vivas']] },
  offer: { t: 'Oferta e pacotes', i: '💎', d: 'Cria a oferta do teu serviço de IA: pacotes, preços, objeções e pitch.', f: [
    ['servico', 'Serviço ou produto', 'Ex.: vídeos com IA para marcas de moda'], ['publico', 'Para quem', 'Ex.: lojas online nos EUA'], ['moeda', 'Moeda', 'USD'], ['diferencial', 'O teu diferencial', 'Ex.: entrega em 48 h, 10 vídeos por mês']] },
};
function viewStudio(tab) {
  if (!isPro()) return upsell('🎬', 'O Estúdio IA é do plano Pro', 'Cria influenciadores de IA, roteiros virais, anúncios em vídeo e ofertas prontas a vender — com prompts para colar no Veo, Kling, Midjourney ou Google AI Studio.', ['Influencer de IA com cara consistente', 'Roteiros virais a partir de referências', 'Anúncios em vídeo com IA para negócios', 'Ofertas, pacotes e sequências com IA']);
  const k = STUDIO[tab] ? tab : null;
  if (!k) {
    $('#view').innerHTML = `<div class="page">${head('Estúdio IA', '', 'Cria influenciadores de IA, roteiros virais, anúncios e ofertas. O droply dá-te os prompts prontos a colar no Google AI Studio, Veo, Kling, Midjourney ou outra IA.')}
    <div class="quick">${Object.entries(STUDIO).map(([k, s]) => `<a class="card qa" href="#/estudio/${k}"><i>${s.i}</i><b>${s.t}</b><small>${s.d}</small></a>`).join('')}</div>
    <div class="ch3" style="margin-top:22px">Criações guardadas</div><div class="grid">${DB.studio.map(x => `<a class="card pad" href="#/estudio/${x.mode}?id=${x.id}" style="text-decoration:none"><b>${STUDIO[x.mode]?.i || ''} ${esc(x.title)}</b><small class="mu">${STUDIO[x.mode]?.t || ''} · ${fmtDate(x.at)}</small></a>`).join('') || '<p class="mu">Ainda nada. Começa por criar um influencer.</p>'}</div></div>`;
    return;
  }
  const S = STUDIO[k], q = new URLSearchParams(location.hash.split('?')[1] || ''), saved = DB.studio.find(x => x.id === q.get('id'));
  $('#view').innerHTML = `<div class="page">${head(`${S.i} ${S.t}`, '<a class="btn sm" href="#/estudio">← Estúdio</a>', S.d)}
  <div class="studio"><div class="card pad"><div id="sf">${S.f.map(([n, l, p, t]) => `<label class="lb">${l}</label>${t === 'ta' ? `<textarea class="in" rows="4" data-f="${n}" placeholder="${esc(p)}"></textarea>` : `<input class="in" data-f="${n}" placeholder="${esc(p)}">`}`).join('')}</div>
  <button class="btn pri" id="sGo" style="margin-top:14px;width:100%">Gerar com IA ✦ (1 estúdio)</button>
  <p class="note" style="margin-top:10px">Depois copia os prompts e cola na tua IA de imagem ou vídeo. Usa a mesma imagem de referência e o mesmo "character sheet" para a pessoa sair sempre igual.</p></div>
  <div id="sOut">${saved ? studioOut(saved.mode, saved.out) : '<div class="empty" style="padding:40px 10px">O resultado aparece aqui.</div>'}</div></div></div>`;
  if (saved) { Object.entries(saved.input).forEach(([n, v]) => { const el = $(`[data-f="${n}"]`); if (el) el.value = v; }); bindOut(); }
  $('#sGo').onclick = async () => {
    const input = Object.fromEntries($$('[data-f]').map(el => [el.dataset.f, el.value.trim()]));
    const b = $('#sGo'); b.disabled = true; b.innerHTML = '<span class="spin"></span> A criar... (até 1 min)';
    try { const out = await api('studio', { mode: k, input });
      const title = out.perfil?.nome || out.nome || out.conceito?.slice(0, 40) || input.tema || input.negocio || input.servico || S.t;
      DB.studio.unshift({ id: uid(), mode: k, title, input, out, at: Date.now() }); DB.studio = DB.studio.slice(0, 40); save();
      $('#sOut').innerHTML = studioOut(k, out); bindOut(); refreshMe(); toast('Pronto ✓'); }
    catch (e) { toast(e.message, true); } finally { b.disabled = false; b.textContent = 'Gerar com IA ✦ (1 estúdio)'; }
  };
}
const cp = (t, label = 'Copiar') => `<button class="btn sm" data-cp="${esc(t)}">${label}</button>`;
const block = (title, text, big = false) => text ? `<div class="pblock"><div class="pbh"><b>${title}</b>${cp(text)}</div><div class="msg ${big ? '' : 'sm'}">${esc(text)}</div></div>` : '';
const list = a => (a || []).map(x => `<li>${esc(typeof x === 'string' ? x : JSON.stringify(x))}</li>`).join('');
function studioOut(k, o) {
  if (k === 'influencer') { const p = o.perfil || {}, e = o.estrategia || {};
    return `<div class="card pad"><div class="h" style="font-size:22px">${esc(p.nome)} <span class="mu" style="font-size:15px">${esc(p.handle || '')}</span></div><p style="margin-top:6px">${esc(p.bio)}</p>
    <div class="kv"><div><small>Personalidade</small><span>${esc(p.personalidade)}</span></div><div><small>Tom de voz</small><span>${esc(p.tomDeVoz)}</span></div><div style="grid-column:1/-1"><small>História</small><span>${esc(p.historia)}</span></div></div></div>
    <div class="card pad"><h3>Posicionamento</h3><p>${esc(o.posicionamento)}</p><h3 style="margin-top:12px">Estratégia</h3><p class="mu">${esc((e.plataformas || []).join(', '))} · ${esc(e.frequencia || '')}</p>
     ${(e.pilaresDeConteudo || []).map(x => `<div class="need"><div><b>${esc(x.pilar)}</b><p>${esc((x.exemplos || []).join(' · '))}</p></div></div>`).join('')}
     <p style="margin-top:8px"><b>Monetização:</b> ${esc(e.monetizacao || '')}</p><p class="mu" style="margin-top:6px">${esc((e.hashtags || []).join(' '))}</p></div>
    <div class="card pad">${block('🧬 Character sheet (cola no início de TODOS os prompts)', o.characterSheet, true)}${block('🚫 Negative prompt', o.negativePrompt)}</div>
    <div class="card pad"><h3>📸 Prompts de imagem</h3>${(o.imagePrompts || []).map(x => block(`${esc(x.cena)} · ${esc(x.formato || '')}`, x.prompt)).join('')}</div>
    <div class="card pad"><h3>🎬 Roteiros de vídeo</h3>${(o.videoScripts || []).map(v => `<div class="pblock"><b>${esc(v.titulo)}</b> <span class="mu2">· ${esc(v.duracao || '')}</span><p style="margin-top:4px"><b>Gancho:</b> ${esc(v.gancho)}</p><ol class="ol">${list(v.roteiro)}</ol><p><b>CTA:</b> ${esc(v.cta)}</p>${block('Prompt de vídeo', v.videoPrompt)}</div>`).join('')}</div>
    <div class="card pad"><h3>Dicas para manter a mesma cara</h3><ul class="ol">${list(o.dicasConsistencia)}</ul></div>`; }
  if (k === 'scripts') return `<div class="card pad"><h3>Porque é que as referências funcionam</h3><p>${esc(o.analiseReferencias)}</p></div>${(o.roteiros || []).map(r => `<div class="card pad"><div class="h" style="font-size:18px">${esc(r.titulo)}</div><p class="mu">${esc(r.estrutura || '')} · ${esc(r.duracao || '')}</p><p style="margin-top:6px"><b>Gancho:</b> ${esc(r.gancho)}</p>
    <table class="tb"><thead><tr><th>Tempo</th><th>Visual</th><th>Fala</th></tr></thead><tbody>${(r.roteiro || []).map(x => `<tr><td>${esc(x.tempo)}</td><td>${esc(x.visual)}</td><td>${esc(x.fala)}</td></tr>`).join('')}</tbody></table>
    <p style="margin-top:8px"><b>CTA:</b> ${esc(r.cta)}</p>${block('Legenda', (r.legenda || '') + '\n\n' + (r.hashtags || []).join(' '))}${block('Prompt de vídeo', r.videoPrompt)}</div>`).join('')}`;
  if (k === 'ad') return `<div class="card pad"><div class="h" style="font-size:20px">${esc(o.conceito)}</div><p class="mu">${esc(o.publico || '')} · ${esc(o.duracao || '')} · 🎵 ${esc(o.musica || '')}</p>${block('🎨 Estilo visual (cola em todas as cenas)', o.estiloVisual)}</div>
    <div class="card pad"><h3>Cenas</h3>${(o.cenas || []).map(c => `<div class="pblock"><b>${esc(c.tempo)}</b> · ${esc(c.visual)}<p class="mu" style="margin-top:4px">🎙 ${esc(c.voz)}</p>${block('Prompt', c.prompt)}</div>`).join('')}</div>
    <div class="card pad"><p><b>Texto final:</b> ${esc(o.textoFinal)}</p>${block('Legenda', (o.legenda || '') + '\n\n' + (o.hashtags || []).join(' '))}<h3 style="margin-top:10px">Variações</h3><ul class="ol">${list(o.variacoes)}</ul></div>`;
  if (k === 'offer') return `<div class="card pad"><div class="h" style="font-size:22px">${esc(o.nome)}</div><p style="margin-top:6px"><b>${esc(o.promessa)}</b></p><p class="mu">${esc(o.paraQuem)}</p><ul class="ol">${list(o.entregaveis)}</ul></div>
    <div class="grid">${(o.pacotes || []).map(p => `<div class="card pad"><b>${esc(p.nome)}</b><div class="h gt" style="font-size:24px;margin:6px 0">${esc(p.preco)}</div><ul class="ol">${list(p.inclui)}</ul></div>`).join('')}</div>
    <div class="card pad"><p><b>Garantia:</b> ${esc(o.garantia)}</p><h3 style="margin-top:10px">Objeções</h3>${(o.objecoes || []).map(x => `<div class="need"><div><b>${esc(x.objecao)}</b><p>${esc(x.resposta)}</p></div></div>`).join('')}${block('Pitch curto', o.pitchCurto)}${block('Mensagem de WhatsApp', o.mensagemWhatsApp)}
    <div class="row-acts"><a class="btn pri" href="#/vendas/checkout">Criar checkout para esta oferta →</a></div></div>`;
  return '';
}
function bindOut() { $$('[data-cp]').forEach(b => b.onclick = () => copy(b.dataset.cp)); }

/* ================= VENDAS E CHECKOUT ================= */
const SALE_ST = [['pago', 'Pago', 'var(--won)'], ['pendente', 'Pendente', 'var(--warm)'], ['cancelado', 'Cancelado', 'var(--red)'], ['reembolsado', 'Reembolsado', '#A79FB5']];
const PAY = [['iban', 'Transferência bancária (IBAN)', 'PT50 0000 0000 0000 0000 0000 0'], ['mcx', 'Multicaixa Express (Angola)', '923 000 000'], ['mpesa', 'M-Pesa / e-Mola (Moçambique)', '84 000 0000'], ['pix', 'Pix (Brasil)', 'chave Pix'],
  ['paypal', 'Link PayPal', 'https://paypal.me/...'], ['stripe', 'Link de pagamento Stripe', 'https://buy.stripe.com/...'], ['wise', 'Wise', 'link ou dados Wise'], ['payoneer', 'Payoneer', 'link de pedido de pagamento'], ['outro', 'Outro método', 'instruções']];
function viewSales(tab = 'resumo') {
  const st = salesStats();
  const tabs = [['resumo', 'Receita'], ['checkout', 'Checkouts'], ['metodos', 'Meios de pagamento']];
  $('#view').innerHTML = `<div class="page">${head('Vendas e checkout', '<button class="btn sm pri" id="addS">+ Registar venda</button>', 'A tua receita, os teus links de pagamento e os meios para receber.')}
  <div class="tabs big">${tabs.map(([k, n]) => `<a href="#/vendas/${k}" class="${k === tab ? 'on' : ''}">${n}</a>`).join('')}</div><div id="sv"></div></div>`;
  $('#addS').onclick = () => saleModal({});
  if (tab === 'checkout') return salesCheckout();
  if (tab === 'metodos') return salesMethods();
  $('#sv').innerHTML = `<div class="kpis">
   <div class="kpi"><small>Receita total</small><b>${money(st.total, st.cur)}</b><span>${Object.entries(st.other).map(([c, v]) => '+ ' + money(v, c)).join(' ') || 'pagas'}</span></div>
   <div class="kpi"><small>Este mês</small><b class="gt">${money(st.month, st.cur)}</b></div>
   <div class="kpi"><small>Pendente</small><b style="color:var(--warm)">${money(st.pend, st.cur)}</b><span>${st.pendN}</span></div>
   <div class="kpi"><small>Canceladas/reembolsos</small><b style="color:var(--red)">${money(st.canc, st.cur)}</b><span>${st.cancN}</span></div>
   <div class="kpi"><small>Oportunidades</small><b>${money(st.opp, st.cur)}</b><span>${st.oppN} leads</span></div>
   <div class="kpi"><small>Ticket médio</small><b>${money(DB.sales.filter(s => s.status === 'pago').length ? st.total / DB.sales.filter(s => s.status === 'pago').length : 0, st.cur)}</b></div></div>
  <div class="card pad"><div class="ch3">Receita por mês (${st.cur})</div>${chart(st.months, st.cur)}</div>
  <div class="card pad" style="margin-top:14px"><div class="ch3" style="margin:0">Vendas</div>
  ${DB.sales.length ? `<table class="tb"><thead><tr><th>Data</th><th>Cliente</th><th>Produto</th><th>Valor</th><th>Método</th><th>Estado</th></tr></thead><tbody>${[...DB.sales].sort((a, b) => b.at - a.at).map(s => { const x = SALE_ST.find(z => z[0] === s.status) || SALE_ST[0]; return `<tr data-s="${s.id}"><td>${fmtDate(s.at)}</td><td><b>${esc(s.client)}</b></td><td>${esc(s.product || '')}</td><td>${money(s.value, s.currency || st.cur)}</td><td class="mu">${esc(s.method || '')}</td><td><span class="tag" style="color:${x[2]}">${x[1]}</span></td></tr>`; }).join('')}</tbody></table>` : '<p class="mu" style="padding:10px 0">Ainda sem vendas. Regista uma venda ou fecha um lead no CRM.</p>'}</div>`;
  $$('tr[data-s]').forEach(r => r.onclick = () => saleModal(DB.sales.find(s => s.id === r.dataset.s)));
}
function saleModal(s) {
  const isNew = !s.id; s = { id: uid(), status: 'pago', at: Date.now(), currency: DB.profile.currency, ...s };
  const m = modal(`<div class="h" style="font-size:22px">${isNew ? 'Registar venda' : 'Editar venda'}</div>
  <label class="lb">Cliente</label><input class="in" id="vC" value="${esc(s.client || '')}">
  <label class="lb">Produto / serviço</label><input class="in" id="vP" value="${esc(s.product || '')}" list="prods"><datalist id="prods">${DB.products.map(p => `<option value="${esc(p.name)}">`).join('')}</datalist>
  <div class="g2"><div><label class="lb">Valor</label><input class="in" id="vV" type="number" min="0" value="${s.value || ''}"></div><div><label class="lb">Moeda</label><select class="in" id="vM">${CURRENCIES.map(c => `<option ${c === s.currency ? 'selected' : ''}>${c}</option>`).join('')}</select></div></div>
  <div class="g2"><div><label class="lb">Estado</label><select class="in" id="vS">${SALE_ST.map(x => `<option value="${x[0]}" ${x[0] === s.status ? 'selected' : ''}>${x[1]}</option>`).join('')}</select></div><div><label class="lb">Data</label><input class="in" type="date" id="vD" value="${new Date(s.at).toISOString().slice(0, 10)}"></div></div>
  <label class="lb">Método de pagamento</label><input class="in" id="vMt" value="${esc(s.method || '')}" placeholder="Ex.: Multicaixa Express, PayPal, transferência">
  <div class="row-acts" style="margin-top:16px"><button class="btn pri" id="vSave">Guardar</button>${!isNew ? '<button class="btn ghost" id="vDel" style="color:var(--red)">Apagar</button>' : ''}</div>`, 'dialog');
  $('#vSave', m).onclick = () => {
    Object.assign(s, { client: $('#vC', m).value.trim() || 'Cliente', product: $('#vP', m).value.trim(), value: Number($('#vV', m).value) || 0, currency: $('#vM', m).value, status: $('#vS', m).value, at: new Date($('#vD', m).value + 'T12:00').getTime(), method: $('#vMt', m).value.trim() });
    const i = DB.sales.findIndex(x => x.id === s.id); if (i >= 0) DB.sales[i] = s; else DB.sales.push(s);
    if (s.leadId && DB.leads[s.leadId] && isNew) logAct(DB.leads[s.leadId], 'sale', `Venda registada: ${money(s.value, s.currency)}`);
    save(); closeModal(); toast('Venda guardada ✓'); route();
  };
  $('#vDel', m) && ($('#vDel', m).onclick = () => { DB.sales = DB.sales.filter(x => x.id !== s.id); save(); closeModal(); route(); });
}
const b64u = o => btoa(unescape(encodeURIComponent(JSON.stringify(o)))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
function checkoutLink(p) {
  const pay = Object.fromEntries(Object.entries(DB.pay.methods || {}).filter(([, v]) => v));
  const data = { v: 1, s: DB.pay.seller || DB.profile.company || ME.name, w: phoneDigits(DB.pay.whatsapp), e: DB.pay.email || '', p: { n: p.name, d: p.desc, v: p.price, c: p.currency, b: p.bullets }, m: pay };
  return location.origin + '/checkout#' + b64u(data);
}
function salesCheckout() {
  const ok = Object.values(DB.pay.methods || {}).some(Boolean);
  $('#sv').innerHTML = `${!ok ? '<div class="note" style="margin-bottom:14px">Primeiro configura pelo menos um meio de pagamento em <a href="#/vendas/metodos">Meios de pagamento</a>.</div>' : ''}
  <div class="row-acts" style="margin-top:0"><button class="btn pri" id="pNew">+ Novo produto / checkout</button></div>
  <div class="grid">${DB.products.map(p => `<div class="card pad"><div style="display:flex;gap:8px"><b style="flex:1">${esc(p.name)}</b><button class="btn sm ghost" data-pe="${p.id}">Editar</button></div><div class="h gt" style="font-size:24px;margin:6px 0">${money(p.price, p.currency)}</div><p class="mu" style="font-size:13px">${esc(p.desc || '')}</p>
  <div class="row-acts"><button class="btn sm pri" data-pc="${p.id}">Copiar link</button><a class="btn sm" href="${esc(checkoutLink(p))}" target="_blank" rel="noopener">Ver checkout ↗</a>${DB.pay.whatsapp ? '' : ''}</div></div>`).join('') || '<p class="mu">Ainda não tens produtos. Cria um para gerar o link de checkout.</p>'}</div>
  <p class="note" style="margin-top:14px">O checkout do droply mostra o produto, o preço e os teus meios de pagamento. Quando o cliente paga, envia-te o comprovativo pelo WhatsApp ou e-mail e tu registas a venda aqui. Para pagamentos automáticos com cartão, cola o teu link do Stripe ou PayPal nos meios de pagamento.</p>`;
  $('#pNew').onclick = () => productModal({});
  $$('[data-pe]').forEach(b => b.onclick = () => productModal(DB.products.find(p => p.id === b.dataset.pe)));
  $$('[data-pc]').forEach(b => b.onclick = () => copy(checkoutLink(DB.products.find(p => p.id === b.dataset.pc))));
}
function productModal(p) {
  const isNew = !p.id; p = { id: uid(), currency: DB.profile.currency, ...p };
  const m = modal(`<div class="h" style="font-size:22px">${isNew ? 'Novo produto' : 'Editar produto'}</div>
  <label class="lb">Nome</label><input class="in" id="pN" value="${esc(p.name || '')}" placeholder="Ex.: Site profissional com IA">
  <label class="lb">Descrição</label><textarea class="in" id="pD" rows="3">${esc(p.desc || '')}</textarea>
  <label class="lb">O que inclui (um por linha)</label><textarea class="in" id="pB" rows="4" placeholder="Site de uma página&#10;Domínio grátis .vercel.app&#10;Botão de WhatsApp">${esc((p.bullets || []).join('\n'))}</textarea>
  <div class="g2"><div><label class="lb">Preço</label><input class="in" type="number" min="0" id="pV" value="${p.price || ''}"></div><div><label class="lb">Moeda</label><select class="in" id="pM">${CURRENCIES.map(c => `<option ${c === p.currency ? 'selected' : ''}>${c}</option>`).join('')}</select></div></div>
  <div class="row-acts" style="margin-top:16px"><button class="btn pri" id="pS">Guardar</button>${!isNew ? '<button class="btn ghost" id="pX" style="color:var(--red)">Apagar</button>' : ''}</div>`, 'dialog');
  $('#pS', m).onclick = () => { Object.assign(p, { name: $('#pN', m).value.trim() || 'Produto', desc: $('#pD', m).value.trim(), bullets: $('#pB', m).value.split('\n').map(x => x.trim()).filter(Boolean).slice(0, 8), price: Number($('#pV', m).value) || 0, currency: $('#pM', m).value });
    const i = DB.products.findIndex(x => x.id === p.id); if (i >= 0) DB.products[i] = p; else DB.products.push(p); save(); closeModal(); location.hash = '#/vendas/checkout'; route(); };
  $('#pX', m) && ($('#pX', m).onclick = () => { DB.products = DB.products.filter(x => x.id !== p.id); save(); closeModal(); route(); });
}
function salesMethods() {
  const M = DB.pay.methods || {};
  $('#sv').innerHTML = `<div class="card pad" style="max-width:760px"><div class="g2"><div><label class="lb" style="margin-top:0">Nome do vendedor</label><input class="in" id="mS" value="${esc(DB.pay.seller || DB.profile.company || '')}"></div><div><label class="lb" style="margin-top:0">WhatsApp para comprovativos</label><input class="in" id="mW" value="${esc(DB.pay.whatsapp || '')}" placeholder="+244..."></div></div>
  <label class="lb">E-mail para comprovativos</label><input class="in" id="mE" value="${esc(DB.pay.email || '')}">
  ${PAY.map(([k, n, ph]) => `<label class="lb">${n}</label><input class="in" data-pm="${k}" value="${esc(M[k] || '')}" placeholder="${esc(ph)}">`).join('')}
  <div class="row-acts" style="margin-top:16px"><button class="btn pri" id="mSave">Guardar meios de pagamento</button></div>
  <p class="note" style="margin-top:12px">Estes dados aparecem nos teus links de checkout. Só preenches o que queres mostrar aos clientes.</p></div>`;
  $('#mSave').onclick = () => { DB.pay = { seller: $('#mS').value.trim(), whatsapp: $('#mW').value.trim(), email: $('#mE').value.trim(), methods: Object.fromEntries($$('[data-pm]').map(el => [el.dataset.pm, el.value.trim()])) }; save(); toast('Meios de pagamento guardados ✓'); };
}

/* ================= NÚMEROS ================= */
function upsell(icon, title, text, items) {
  $('#view').innerHTML = `<div class="page" style="max-width:640px">${head('')}<div class="card pad upsell"><i>${icon}</i><div class="h">${title}</div><p class="mu">${text}</p><ul class="ol">${items.map(x => `<li>${esc(x)}</li>`).join('')}</ul><a class="btn pri" href="#/planos">Passar para o Pro · ${kz(CFG.plans?.pro?.price)}/mês</a></div></div>`;
}
function viewNumbers() {
  if (!isPro()) return upsell('☎', 'Número internacional grátis no Pro', 'Um número local passa confiança a clientes lá fora. No plano Pro recebes um número de qualquer país (Portugal, EUA, Reino Unido, Brasil...) para usar no WhatsApp Business, sem pagar mais nada.', ['Número de qualquer país', 'Pronto para WhatsApp Business', 'Ativo enquanto o Pro estiver ativo']);
  const opts = [['🇵🇹', 'Portugal'], ['🇺🇸', 'Estados Unidos'], ['🇬🇧', 'Reino Unido'], ['🇧🇷', 'Brasil'], ['🇪🇸', 'Espanha'], ['🇫🇷', 'França'], ['🌍', 'Outro país']];
  $('#view').innerHTML = `<div class="page" style="max-width:760px">${head('O teu número grátis', '', 'Incluído no teu plano Pro. Escolhe o país e pede ao suporte — entregamos o número pronto para o WhatsApp Business.')}
  <div class="card pad" style="margin-top:18px"><label class="lb" style="margin-top:0">País</label><div class="stages" id="cty">${opts.map(([f, n], i) => `<button data-c="${n}" class="${i ? '' : 'on'}">${f} ${n}</button>`).join('')}</div>
  <label class="lb">Para que vais usar</label><select class="in" id="use"><option>WhatsApp Business</option><option>Chamadas</option><option>WhatsApp e chamadas</option></select>
  <label class="lb">Notas (opcional)</label><textarea class="in" id="nn" rows="2" placeholder="Ex.: preciso de um número de Lisboa"></textarea>
  <div class="row-acts" style="margin-top:16px">${CFG.supportWhatsApp ? '<a class="btn wa" id="ask" target="_blank" rel="noopener">Pedir no WhatsApp do suporte</a>' : ''}${CFG.supportEmail ? '<a class="btn" id="askm">Pedir por e-mail</a>' : ''}</div>
  ${!CFG.supportWhatsApp && !CFG.supportEmail ? '<p class="note" style="margin-top:12px">Falta configurar SUPPORT_WHATSAPP na Vercel.</p>' : ''}</div>
  <p class="note" style="margin-top:14px">O número é entregue depois do primeiro pagamento confirmado e fica ativo enquanto o teu plano Pro estiver ativo. 1 número por conta.</p></div>`;
  let c = opts[0][1];
  $$('#cty button').forEach(b => b.onclick = () => { c = b.dataset.c; $$('#cty button').forEach(x => x.classList.toggle('on', x === b)); });
  const text = () => `Olá! Sou cliente Pro e quero o meu número grátis de ${c} no droply.\nUso: ${$('#use').value}\nConta: ${ME.email}\n${$('#nn').value}`;
  $('#ask') && ($('#ask').onclick = () => $('#ask').href = `https://wa.me/${CFG.supportWhatsApp}?text=${encodeURIComponent(text())}`);
  $('#askm') && ($('#askm').onclick = () => $('#askm').href = `mailto:${CFG.supportEmail}?subject=${encodeURIComponent('Número de ' + c)}&body=${encodeURIComponent(text())}`);
}

/* ================= DEFINIÇÕES ================= */
function viewSettings() {
  const p = DB.profile;
  $('#view').innerHTML = `<div class="page" style="max-width:760px">${head('Definições')}
  <div class="card pad" style="margin-top:18px"><div class="h" style="font-size:18px">Perfil</div>
   <div class="avpick" style="margin-top:12px"><label class="avp" for="sfA">${ME.picture ? `<img src="${esc(ME.picture)}" alt="">` : `<span>${ic('camera', 22)}</span>`}</label><div><b>${esc(ME.name || '')}</b><small>@${esc(ME.username || '')} · ${esc(ME.email)}</small><input type="file" id="sfA" accept="image/jpeg,image/png,image/webp,image/gif" hidden><label for="sfA" class="alink" style="margin:0">Trocar foto</label></div></div>
   <div class="g2"><div><label class="lb">Nome</label><input class="in" id="sfN" value="${esc(ME.name || '')}"></div><div><label class="lb">Nome de utilizador</label><input class="in" id="sfU" value="${esc(ME.username || '')}"></div></div>
   <div class="row-acts"><button class="btn sm pri" id="sfS">Guardar perfil</button><button class="btn sm" id="sfP">Mudar palavra-passe</button></div></div>
  <div class="card pad" style="margin-top:14px"><div class="h" style="font-size:18px">O teu negócio</div>
   <div class="g2"><div><label class="lb">Moeda principal</label><select class="in" id="pCur">${CURRENCIES.map(c => `<option value="${c}" ${c === p.currency ? 'selected' : ''}>${c} · ${CUR_NAMES[c]}</option>`).join('')}</select></div>
   <div><label class="lb">Funil por defeito</label><select class="in" id="pFun">${Object.entries(FUNNELS).map(([k, f]) => `<option value="${k}" ${k === (p.funnel || 'servicos') ? 'selected' : ''}>${f.name}</option>`).join('')}</select></div></div></div>
  <div class="card pad" style="margin-top:14px"><div class="h" style="font-size:18px">O teu tom de voz</div><p class="mu" style="font-size:13.5px">O droply usa isto para escrever as mensagens como tu.</p>
   <label class="lb">Nome que assina as mensagens</label><input class="in" id="pName" value="${esc(p.name || ME.name || '')}">
   <label class="lb">Empresa / marca</label><input class="in" id="pCo" value="${esc(p.company || '')}" placeholder="Ex.: Drop Code Studio">
   <label class="lb">Serviços que vendes</label><input class="in" id="pSv" value="${esc(p.services || 'sites com IA, SEO, GEO, automações')}">
   <label class="lb">Como falas</label><textarea class="in" id="pTone" rows="3" placeholder="Ex.: direto, simpático, sem formalidades, frases curtas">${esc(p.toneRaw ?? '')}</textarea>
   <label class="lb">Exemplo de uma mensagem tua (opcional)</label><textarea class="in" id="pEx" rows="3">${esc(p.example || '')}</textarea>
   <label class="lb">Assinatura</label><textarea class="in" id="pSig" rows="2" placeholder="Nome · Empresa · site · telefone">${esc(p.signature || '')}</textarea></div>
  <div class="row-acts"><button class="btn pri" id="pSave">Guardar definições</button></div>
  <div class="card pad" style="margin-top:14px"><div class="h" style="font-size:18px">Integrações</div>
   <div style="display:flex;align-items:center;gap:10px;margin-top:12px"><b>GitHub</b><span class="mu">${DB.gh?.token ? 'Ligado como @' + esc(DB.gh.login || '') : 'Não ligado'}</span><span style="flex:1"></span>${DB.gh?.token ? '<button class="btn sm" id="ghOff">Desligar</button>' : '<button class="btn sm" id="ghOn">Ligar</button>'}</div></div>
  <div class="card pad" style="margin-top:14px"><div class="h" style="font-size:18px">Os teus dados</div>
   <p class="mu" style="font-size:13.5px;margin-top:4px">Clientes, vendas, sites e criações ficam guardados na tua conta droply, na nuvem. Entras em qualquer dispositivo e está tudo lá.</p>
   <div class="row-acts"><button class="btn" id="exp">Exportar cópia (.json)</button><label class="btn">Importar cópia<input type="file" id="imp" accept="application/json" hidden></label><button class="btn ghost" id="wipe" style="color:var(--red)">Apagar todos os dados</button></div></div>
  <div class="card pad" style="margin-top:14px"><div class="h" style="font-size:18px">O teu plano</div><p style="margin-top:6px">${ME.staff ? (ME.role === 'admin' ? 'Administrador' : 'Equipa') + ' · sem limites' : READONLY ? `Plano <b>${ME.lastPlan === 'pro' ? 'Pro' : 'Básico'}</b> · <span style="color:var(--red)">expirado</span>` : `Plano <b>${esc(ME.planInfo?.name || '')}</b>${ME.until ? ' · válido até ' + new Date(ME.until).toLocaleDateString('pt-PT') : ''}`}</p><div class="row-acts">${!ME.staff ? `<a class="btn sm pri" href="${esc(ME.renewUrl || CFG.checkout?.[ME.plan || ME.lastPlan || 'basico'] || '#/planos')}" target="_blank" rel="noopener">Renovar</a>` : ''}<a class="btn sm" href="#/planos">Ver planos</a>${ME.staff ? '<a class="btn sm" href="#/admin">Acessos de clientes</a>' : ''}</div></div>
  <div class="row-acts" style="margin-top:14px"><button class="btn" id="lo">Terminar sessão</button><a class="btn ghost" href="/" target="_blank">Página do droply</a><a class="btn ghost" href="/privacidade.html" target="_blank">Privacidade</a><a class="btn ghost" href="/termos.html" target="_blank">Termos</a></div></div>`;
  $('#pSave').onclick = () => { const tone = $('#pTone').value.trim(), ex = $('#pEx').value.trim(); Object.assign(DB.profile, { currency: $('#pCur').value, funnel: $('#pFun').value, name: $('#pName').value.trim(), company: $('#pCo').value.trim(), services: $('#pSv').value.trim(), toneRaw: tone, tone: tone + (ex ? '\nExemplo de mensagem do vendedor: ' + ex : ''), example: ex, signature: $('#pSig').value.trim() }); save(); toast('Guardado ✓'); };
  $('#ghOn') && ($('#ghOn').onclick = connectGithub);
  $('#ghOff') && ($('#ghOff').onclick = () => { DB.gh = null; save(); viewSettings(); });
  $('#exp').onclick = () => download(`droply-copia-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify({ ...DB, gh: null }, null, 1), 'application/json');
  $('#imp').onchange = async e => { try { const d = JSON.parse(await e.target.files[0].text()); if (!d.leads) throw 0; DB = { ...DB, ...d, profile: { ...DB.profile, ...d.profile }, gh: DB.gh }; normalize(); save(); toast('Cópia importada ✓'); shell(); route(); } catch { toast('Ficheiro inválido.', true); } };
  $('#wipe').onclick = () => { if (!confirm('Apagar TODOS os teus clientes, vendas, sites e criações da tua conta? Não dá para desfazer.')) return; DB = { profile: DB.profile, gh: DB.gh, pay: DB.pay }; normalize(); save(); shell(); route(); };
  $('#sfA').onchange = async e => { const f = e.target.files[0]; if (!f) return; try { toast('A enviar a foto...'); ME.picture = await droplyDB.uploadAvatar(f); toast('Foto atualizada ✓'); shell(); route(); } catch (x) { toast(x.message, true); } };
  $('#sfS').onclick = async () => { const u = $('#sfU').value.trim().toLowerCase(), n = $('#sfN').value.trim();
    try { if (u !== ME.username) { if (!/^[a-z0-9_.]{3,30}$/.test(u)) throw new Error('Nome de utilizador: 3 a 30 caracteres (letras, números, _ ou .).'); if (!(await droplyDB.usernameAvailable(u))) throw new Error('@' + u + ' já está em uso.'); }
      await droplyDB.updateProfile({ full_name: n, username: u }); Object.assign(ME, { name: n, username: u }); toast('Perfil guardado ✓'); shell(); route(); } catch (x) { toast(x.message, true); } };
  $('#sfP').onclick = () => { const m = modal(`<div class="h" style="font-size:22px">Mudar palavra-passe</div><label class="lb">Nova palavra-passe</label><input class="in" type="password" id="np1" minlength="8" placeholder="Mínimo 8 caracteres"><label class="lb">Confirmar</label><input class="in" type="password" id="np2"><div class="row-acts" style="margin-top:14px"><button class="btn pri" id="npS">Guardar</button></div>`, 'dialog');
    $('#npS', m).onclick = async () => { const a = $('#np1', m).value; if (a.length < 8) return toast('Mínimo 8 caracteres.', true); if (a !== $('#np2', m).value) return toast('As palavras-passe não coincidem.', true); try { await droplyDB.finishInvite({ password: a }); closeModal(); toast('Palavra-passe atualizada ✓'); } catch (x) { toast(x.message, true); } }; };
  $('#lo').onclick = () => logout();
}

/* ================= ACESSOS (admin / equipa) ================= */
const PLN = { basic: 'Básico', basico: 'Básico', pro: 'Pro' };
function accessResult(r, title) {
  const msg = `Olá! O teu acesso ao droply (plano ${PLN[r.plan] || r.plan}) está pronto 🎉\n\n1. Abre este link (válido 24 h): ${r.link}\n2. Escolhe o teu nome de utilizador, a palavra-passe e a tua foto.\n3. Depois entras sempre em ${location.origin}/app\n\nO plano é válido até ${new Date(r.valid_until).toLocaleDateString('pt-PT')}.`;
  const m = modal(`<div class="h" style="font-size:22px">${title}</div><p class="mu" style="margin-top:6px">${esc(r.email)} · Plano ${esc(PLN[r.plan] || r.plan || '')}${r.valid_until ? ' · válido até ' + new Date(r.valid_until).toLocaleDateString('pt-PT') : ''}</p>
  ${r.link ? `<label class="lb">Link de acesso (válido 24 h)</label><div class="paym"><div style="min-width:0"><b style="font-size:12px">${esc(r.link)}</b></div></div>
  <div class="row-acts" style="margin-top:12px"><button class="btn pri" id="arC">Copiar link</button><a class="btn wa" target="_blank" rel="noopener" href="https://wa.me/?text=${encodeURIComponent(msg)}">Enviar no WhatsApp</a><a class="btn" href="mailto:${esc(r.email)}?subject=${encodeURIComponent('O teu acesso ao droply')}&body=${encodeURIComponent(msg)}">Enviar por email</a></div>` : '<p style="margin-top:10px">Acesso renovado ✓</p>'}`, 'dialog');
  $('#arC', m) && ($('#arC', m).onclick = () => copy(r.link));
}
async function viewAdmin() {
  $('#view').innerHTML = `<div class="page">${head('Acessos de clientes', '<button class="btn pri" id="naB">Novo acesso</button>', 'Quando um cliente paga na Kursinha, cria-lhe o acesso aqui e envia o link. Todos os meses, ao pagar, clica em "+1 mês".')}
  <div class="filters"><div class="sin">${ic('search', 16)}<input class="in" id="aq" placeholder="Procurar por email ou nome..."></div><select class="in" id="af" style="width:auto"><option value="">Todos</option><option value="active">Ativos</option><option value="expired">Expirados</option><option value="canceled">Cancelados</option><option value="pending">Sem conta criada</option></select></div>
  <div class="kpis small" id="ak"></div>
  <div id="al" class="card" style="padding:4px 16px;margin-top:12px;overflow-x:auto"><p class="mu" style="padding:12px 0"><span class="spin"></span></p></div></div>`;
  let rows = [], roles = {};
  const fmt = d => d ? new Date(d).toLocaleDateString('pt-PT') : '—';
  const stTag = r => ({ active: '<span class="tag g">Ativo</span>', expired: '<span class="tag r">Expirado</span>', canceled: '<span class="tag">Cancelado</span>' })[r.status] || `<span class="tag">${esc(r.status)}</span>`;
  const draw = () => {
    const q = $('#aq').value.trim().toLowerCase(), f = $('#af').value;
    const list = rows.filter(r => (!q || (r.email + ' ' + (r.full_name || '') + ' ' + (r.username || '')).toLowerCase().includes(q)) && (!f || (f === 'pending' ? !r.has_account : r.status === f)));
    $('#ak').innerHTML = `<div class="kpi"><small>Clientes</small><b>${rows.length}</b></div><div class="kpi"><small>Ativos</small><b style="color:var(--won)">${rows.filter(r => r.status === 'active').length}</b></div><div class="kpi"><small>Expirados</small><b style="color:var(--red)">${rows.filter(r => r.status === 'expired').length}</b></div><div class="kpi"><small>Pro</small><b>${rows.filter(r => r.plan_id === 'pro').length}</b></div><div class="kpi"><small>Básico</small><b>${rows.filter(r => r.plan_id === 'basic').length}</b></div>`;
    $('#al').innerHTML = list.length ? `<table class="tb"><thead><tr><th>Cliente</th><th>Plano</th><th>Estado</th><th>Válido até</th><th>Conta</th><th></th></tr></thead><tbody>${list.map(r => `<tr>
      <td><b>${esc(r.full_name || r.email)}</b><br><small class="mu">${esc(r.email)}${r.username ? ' · @' + esc(r.username) : ''}${roles[r.email] === 'staff' ? ' · <span class="tag p">Equipa</span>' : ''}</small></td>
      <td>${esc(PLN[r.plan_id] || r.plan_id)}</td><td>${stTag(r)}</td><td>${fmt(r.current_period_end)}</td><td>${r.has_account ? 'Criada' : '<span class="mu">Convite pendente</span>'}</td>
      <td style="text-align:right;white-space:nowrap"><button class="btn sm" data-ren="${esc(r.email)}">+1 mês</button> <button class="btn sm ghost" data-lk="${esc(r.email)}">Novo link</button> <button class="btn sm ghost" data-more="${esc(r.email)}" aria-label="Mais">⋯</button></td></tr>`).join('')}</tbody></table>`
      : `<div class="empty" style="padding:40px 10px"><p>${rows.length ? 'Nenhum cliente com este filtro.' : 'Ainda sem clientes. Quando alguém pagar, clica em "Novo acesso".'}</p></div>`;
    $$('[data-ren]').forEach(b => b.onclick = async () => { b.disabled = true; try { const r = await droplyDB.renewAccess(b.dataset.ren); toast('Renovado até ' + fmt(r.valid_until) + ' ✓'); reload(); } catch (e) { toast(e.message, true); b.disabled = false; } });
    $$('[data-lk]').forEach(b => b.onclick = async () => { b.disabled = true; try { const r = await droplyDB.newLink(b.dataset.lk); const row = rows.find(x => x.email === b.dataset.lk); accessResult({ ...r, plan: row?.plan_id, valid_until: row?.current_period_end }, 'Novo link de acesso'); } catch (e) { toast(e.message, true); } b.disabled = false; });
    $$('[data-more]').forEach(b => b.onclick = e => { const em = b.dataset.more, staff = roles[em] === 'staff';
      const d = pop(e.currentTarget, `<a href="javascript:void 0" class="pi" data-x="cancel" style="color:var(--red)">${ic('ban')}Cancelar acesso</a>${ME.role === 'admin' && roles[em] !== 'admin' ? `<a href="javascript:void 0" class="pi" data-x="role">${ic('key')}${staff ? 'Remover da equipa' : 'Tornar equipa'}</a>` : ''}`);
      $('[data-x="cancel"]', d).onclick = async () => { closePop(); if (!confirm('Cancelar o acesso de ' + em + '? O cliente deixa de poder editar.')) return; try { await droplyDB.cancelAccess(em); toast('Acesso cancelado'); reload(); } catch (x) { toast(x.message, true); } };
      $('[data-x="role"]', d) && ($('[data-x="role"]', d).onclick = async () => { closePop(); try { await droplyDB.setRole(em, staff ? 'user' : 'staff'); toast(staff ? 'Removido da equipa' : 'Agora faz parte da equipa ✓'); reload(); } catch (x) { toast(x.message, true); } }); });
  };
  const reload = async () => {
    try { rows = await droplyDB.listClients(); const p = await droplyDB.sb.from('profiles').select('email,role'); roles = Object.fromEntries((p.data || []).map(x => [x.email, x.role])); draw(); }
    catch (e) { $('#al').innerHTML = `<p class="note" style="margin:12px 0">${esc(e.message)}</p>`; }
  };
  $('#aq').oninput = draw; $('#af').onchange = draw;
  $('#naB').onclick = () => {
    const m = modal(`<div class="h" style="font-size:22px">Novo acesso</div><p class="mu" style="margin-top:6px">Usa o email com que o cliente pagou na Kursinha. Se já tiver conta, o plano é renovado por mais 1 mês.</p>
    <label class="lb">Email do cliente</label><input class="in" id="nE" type="email" placeholder="cliente@email.com">
    <label class="lb">Nome</label><input class="in" id="nN" placeholder="Nome do cliente">
    <label class="lb">Plano</label><div class="stages" id="nP"><button data-p="basic" class="on">Básico · ${kz(CFG.plans?.basico?.price)}</button><button data-p="pro">Pro · ${kz(CFG.plans?.pro?.price)}</button></div>
    <div class="row-acts" style="margin-top:16px"><button class="btn pri" id="nG">Criar acesso e gerar link</button></div>`, 'dialog');
    let plan = 'basic'; $$('#nP button', m).forEach(b => b.onclick = () => { plan = b.dataset.p; $$('#nP button', m).forEach(x => x.classList.toggle('on', x === b)); });
    $('#nE', m).focus();
    $('#nG', m).onclick = async () => { const b = $('#nG', m); b.disabled = true; b.innerHTML = '<span class="spin"></span>';
      try { const r = await droplyDB.createAccess($('#nE', m).value.trim(), plan, $('#nN', m).value.trim()); accessResult(r, 'Acesso criado ✓'); reload(); }
      catch (e) { toast(e.message, true); b.disabled = false; b.textContent = 'Criar acesso e gerar link'; } };
  };
  reload();
}

/* ================= PLANOS E CHECKOUT ================= */
const PLAN_FEAT = {
  basico: p => [`${p.search} pesquisas por mês (até ${p.search * 20} negócios)`, `${p.analyze} análises de leads com IA`, `${p.site} sites com IA por mês`, 'CRM, funil e follow-ups', 'Mensagens prontas: WhatsApp, e-mail e chamada', 'Vendas, checkouts e Dashboard'],
  pro: p => ['Tudo do Básico, com limites maiores', `${p.search} pesquisas por mês (até ${p.search * 20} negócios)`, `${p.analyze} análises · ${p.site} sites por mês`, `Estúdio IA: ${p.studio} gerações (influencer IA, roteiros, anúncios)`, 'Número internacional grátis, de qualquer país', 'Suporte prioritário no WhatsApp'],
};
function plansHTML(cur) {
  const P = CFG.plans || {};
  return `<div class="plans">${['basico', 'pro'].map(k => { const p = P[k]; if (!p) return ''; return `<div class="plan ${k === 'pro' ? 'hl' : ''}">
   ${k === 'basico' ? '<span class="badge">Preço de lançamento</span>' : '<span class="badge g">Mais escolhido</span>'}
   <b class="pn">${p.name}</b><div class="pp"><span class="h">${kz(p.price)}</span><small>/mês</small></div>
   <ul>${PLAN_FEAT[k](p).map(x => `<li>${esc(x)}</li>`).join('')}</ul>
   ${cur === k ? '<button class="btn" disabled>O teu plano atual</button>' : `<button class="btn ${k === 'pro' ? 'pri' : ''}" data-buy="${k}">Escolher ${p.name}</button>`}</div>`; }).join('')}</div>`;
}
function payModal(k) {
  const p = CFG.plans[k], url = (ME?.lastPlan === k && ME?.renewUrl) || CFG.checkout?.[k];
  if (url) window.open(url, '_blank', 'noopener');
  const msg = `Olá! Paguei o plano ${p.name} do droply (${kz(p.price)}/mês).\nEmail: ${ME?.email || ''}\nSegue o comprovativo.`;
  modal(`<div class="h" style="font-size:22px">Plano ${p.name} · ${kz(p.price)}/mês</div>
  <p class="mu" style="margin-top:6px">Abrimos o checkout seguro da Kursinha numa nova janela. Paga por Multicaixa Express ou referência, com o email <b>${esc(ME?.email || '')}</b>.</p>
  <p class="mu" style="margin-top:8px">Assim que o pagamento for confirmado, ativamos o teu plano por 30 dias.</p>
  <div class="row-acts" style="margin-top:14px">${url ? `<a class="btn pri" href="${esc(url)}" target="_blank" rel="noopener">Abrir checkout</a>` : ''}${CFG.supportWhatsApp ? `<a class="btn wa" href="https://wa.me/${CFG.supportWhatsApp}?text=${encodeURIComponent(msg)}" target="_blank" rel="noopener">Já paguei · enviar comprovativo</a>` : ''}</div>`, 'dialog');
}
function viewPlans() {
  $('#view').innerHTML = `<div class="page" style="max-width:900px">${head('Planos', '', 'Muda de plano quando quiseres. O Pro desbloqueia o Estúdio IA e o número internacional.')}${plansHTML(ME.admin ? '' : ME.plan)}</div>`;
  $$('[data-buy]').forEach(b => b.onclick = () => payModal(b.dataset.buy));
}

/* ================= arranque ================= */
async function start() {
  try {
    ME = await api('me');
    if (!ME.allowed && !ME.lastPlan && !ME.staff) return renderNoAccess();
    READONLY = !ME.allowed && !ME.staff;
    $('#root').innerHTML = `<div class="boot"><img src="/assets/logo.svg" alt="" width="56" height="56"></div>`;
    await load();
    if (!READONLY) { try { if (await droplyDB.migrateLocal(ME.email)) { await load(); toast('Os dados que tinhas neste navegador foram guardados na tua conta ✓'); } } catch (e) { console.warn(e); } }
    shell(); route(); renewBanner(); if (!READONLY) askCurrency();
  } catch (e) { renderLogin(e.message); }
}
(async function boot() {
  try { CFG = await (await fetch('/api/config')).json(); } catch { CFG = {}; }
  CFG.checkout ||= { basico: 'https://pay.kursinha.com/c/6aee66b44dd62fd0ef866765', pro: 'https://pay.kursinha.com/c/6a85f558a1f75adb595a9a73' };
  let r = null; try { r = await droplyDB.handleAuthRedirect(); } catch (e) { r = { error: e.message }; }
  const sess = await droplyDB.session();
  if (!sess) return renderLogin(r?.error ? 'Este link já não é válido (' + r.error + '). Pede um novo link ao suporte.' : '');
  if (r?.type) return renderCreateAccount();
  afterAuth();
  droplyDB.onAuth(ev => { if (ev === 'SIGNED_OUT' && ME) { ME = null; renderLogin(''); } });
})();
