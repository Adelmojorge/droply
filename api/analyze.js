import { send, handler, body, requireUser, consume, ai, httpError } from '../lib/util.js';

const UA = 'Mozilla/5.0 (compatible; droply-bot/1.0; +https://droply.app)';
async function grab(url, ms = 8000) {
  const ctrl = new AbortController(); const t = setTimeout(() => ctrl.abort(), ms);
  const t0 = Date.now();
  try {
    const r = await fetch(url, { redirect: 'follow', signal: ctrl.signal, headers: { 'User-Agent': UA, Accept: 'text/html,*/*' } });
    const reader = r.body?.getReader(); let size = 0; const parts = [];
    if (reader) { while (true) { const { done, value } = await reader.read(); if (done) break; size += value.length; parts.push(value); if (size > 1_500_000) { ctrl.abort(); break; } } }
    const html = Buffer.concat(parts.map(p => Buffer.from(p))).toString('utf8');
    return { ok: r.ok, status: r.status, finalUrl: r.url, ms: Date.now() - t0, size, html };
  } catch (e) { return { ok: false, status: 0, error: e.name === 'AbortError' ? 'timeout' : 'erro', ms: Date.now() - t0, html: '' }; }
  finally { clearTimeout(t); }
}
const uniq = a => [...new Set(a)];
function emailsIn(html) {
  const m = (html.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) || []).map(e => e.toLowerCase());
  return uniq(m.filter(e => !/\.(png|jpe?g|gif|webp|svg|css|js)$/.test(e) && !/(sentry|wixpress|example|domain|email@|yourname|@2x)/.test(e))).slice(0, 5);
}
function socialsIn(html) {
  const s = {};
  for (const [k, re] of [['instagram', /https?:\/\/(?:www\.)?instagram\.com\/[A-Za-z0-9_.\-]+/i], ['facebook', /https?:\/\/(?:www\.|m\.)?facebook\.com\/[A-Za-z0-9_.\-\/?=]+/i], ['linkedin', /https?:\/\/(?:[a-z]{2,3}\.)?linkedin\.com\/(?:company|in)\/[A-Za-z0-9_\-%]+/i], ['tiktok', /https?:\/\/(?:www\.)?tiktok\.com\/@[A-Za-z0-9_.\-]+/i], ['youtube', /https?:\/\/(?:www\.)?youtube\.com\/(?:@|channel\/|c\/)[A-Za-z0-9_\-]+/i]]) {
    const m = html.match(re); if (m) s[k] = m[0];
  }
  return s;
}
function signals(page, url) {
  const h = page.html || '';
  const tag = re => (h.match(re) || [])[1]?.trim().slice(0, 200) || '';
  const year = (h.match(/(?:©|&copy;|copyright)\s*(?:\d{4}\s*[-–]\s*)?(\d{4})/i) || [])[1];
  return {
    reachable: page.ok, status: page.status, error: page.error || null,
    https: (page.finalUrl || url).startsWith('https://'),
    loadMs: page.ms, sizeKB: Math.round((page.size || 0) / 1024),
    title: tag(/<title[^>]*>([^<]*)<\/title>/i),
    metaDescription: tag(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)/i),
    mobileViewport: /<meta[^>]+name=["']viewport/i.test(h),
    h1: (h.match(/<h1[\s>]/gi) || []).length,
    schema: /application\/ld\+json/i.test(h), localBusinessSchema: /"@type"\s*:\s*"(LocalBusiness|Dentist|Restaurant|Store|ProfessionalService|HomeAndConstructionBusiness|[A-Za-z]+Business)"/i.test(h),
    openGraph: /property=["']og:/i.test(h), faq: /faq|perguntas frequentes|frequently asked/i.test(h),
    contactForm: /<form/i.test(h), whatsappButton: /wa\.me|api\.whatsapp\.com/i.test(h),
    builder: /wix\.com|wixstatic/i.test(h) ? 'Wix' : /squarespace/i.test(h) ? 'Squarespace' : /wp-content|wordpress/i.test(h) ? 'WordPress' : /shopify/i.test(h) ? 'Shopify' : null,
    copyrightYear: year ? parseInt(year, 10) : null,
    textSample: h.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 1200),
  };
}

const SYS = `És o analista comercial do droply. Recebes os dados de uma empresa (Google Maps + análise técnica do site) e o perfil de quem vende serviços de IA (sites, SEO, GEO, automações, chatbots).
Responde só com JSON neste formato:
{"score":0-100 (oportunidade de venda: quanto mais problemas resolúveis + boa reputação + contacto disponível, maior),
 "temperature":"quente"|"morno"|"frio",
 "summary":"2 frases em português europeu sobre a empresa e a oportunidade",
 "needs":[{"title":"curto, ex.: Sem website","detail":"porque importa, 1 frase em português","severity":"alta"|"media"|"baixa","service":"Site com IA"|"SEO"|"GEO"|"Automação"|"Chatbot"|"Google Business"|"Outro"}],
 "bestOffer":{"service":"o serviço principal a oferecer","why":"1 frase em português","priceHint":"faixa de preço sugerida na moeda do país do lead"},
 "messages":{
   "whatsapp":"mensagem curta (máx. 70 palavras) na LÍNGUA DO PAÍS DO LEAD, personalizada com dados reais (nome, avaliações, cidade, problema concreto), sem promessas falsas, termina com uma pergunta simples",
   "email":{"subject":"assunto curto na língua do lead","body":"e-mail (máx. 130 palavras) na língua do lead, com assinatura do vendedor e uma linha final para deixar de receber (ex.: 'Reply \\"no\\" and I won't email again.')"},
   "call":["5 a 7 falas curtas do guião de chamada na língua do lead"],
   "followup":"mensagem de seguimento para 3 dias depois, na língua do lead"
 },
 "translation":"tradução para português da mensagem de WhatsApp (se o lead não fala português; senão string vazia)"}
Regras: usa o tom de voz do vendedor. Não inventes dados que não estão no input. GEO = probabilidade de a empresa ser recomendada por IAs como o ChatGPT; avalia só pelos sinais (dados estruturados, FAQ, avaliações, descrição clara) e diz que é uma estimativa. Se não tem site, "Sem website" é a necessidade principal.`;

export default handler(async (req, res) => {
  if (req.method !== 'POST') throw httpError(405, 'Método não permitido.');
  const user = await requireUser(req);
  const { lead, profile = {} } = await body(req);
  if (!lead?.name) throw httpError(400, 'Lead em falta.');
  await consume(user, 'analyze');

  let site = null, emails = [], socials = {};
  if (lead.website) {
    const page = await grab(lead.website);
    site = signals(page, lead.website);
    emails = emailsIn(page.html); socials = socialsIn(page.html);
    if (!emails.length && page.html) {
      const m = page.html.match(/href=["']([^"']*(?:contact|contacto|contato|kontakt|about|sobre)[^"']*)["']/i);
      if (m) { try { const u = new URL(m[1], page.finalUrl || lead.website).toString(); const p2 = await grab(u, 6000); emails = emailsIn(p2.html); socials = { ...socialsIn(p2.html), ...socials }; } catch {} }
    }
  }

  const input = {
    vendedor: { nome: profile.name || user.name, empresa: profile.company || '', tom: profile.tone || 'profissional, próximo e direto', servicos: profile.services || 'sites com IA, SEO, GEO, automações', assinatura: profile.signature || profile.name || user.name },
    empresa: { nome: lead.name, categoria: lead.category, morada: lead.address, telefone: lead.phone, site: lead.website || null, avaliacoes: lead.reviews, nota: lead.rating },
    analiseDoSite: site, emailsEncontrados: emails, redesSociais: socials,
  };
  const out = await ai({ system: SYS, user: JSON.stringify(input), maxTokens: 1800, temperature: 0.5 });
  send(res, 200, { ...out, site, emails, socials, analyzedAt: new Date().toISOString() });
});
