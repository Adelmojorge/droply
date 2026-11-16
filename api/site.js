import { send, handler, body, requireUser, consume, ai, httpError } from '../lib/util.js';

const SYS = `És um web designer sénior. Crias sites de uma página prontos a publicar: para empresas locais, marcas pessoais, produtos, infoprodutos ou qualquer projeto.
Devolve APENAS o código HTML completo (começa em <!doctype html>), sem explicações e sem blocos de markdown.
Requisitos:
- Um único ficheiro. Usa Tailwind via <script src="https://cdn.tailwindcss.com"></script> e Google Fonts. Sem outras dependências.
- Língua: a do país da empresa ou a do pedido.
- Estrutura que converte: topo com o que a empresa faz + cidade + botão de ação (ligar / WhatsApp / pedir orçamento) e formulário curto visível; selos de confiança (nota e nº de avaliações reais, se existirem); serviços; porquê nós; avaliações (só se houver dados reais; NÃO inventes testemunhos nem nomes de clientes, usa texto genérico tipo "Rated 4.9/5 on Google by 34 customers"); área servida; FAQ; contacto com telefone e morada reais; rodapé.
- O formulário usa action="https://formsubmit.co/EMAIL" se houver e-mail da empresa; senão um link mailto/tel.
- SEO e GEO: <title> e meta description otimizados, Open Graph, JSON-LD LocalBusiness com nome, morada, telefone, área, avaliação agregada (só se houver dados) e FAQPage.
- Responsivo, rápido, acessível (contraste, alt nas imagens). Imagens: usa gradientes, ícones SVG inline ou https://images.unsplash.com com termos do setor (source.unsplash.com não), sem logótipos de marcas.
- Botão flutuante de WhatsApp se houver telefone.
- Design moderno e profissional, cores adequadas ao setor.`;

export default handler(async (req, res) => {
  if (req.method !== 'POST') throw httpError(405, 'Método não permitido.');
  const user = await requireUser(req);
  const { lead, analysis, instructions = '', currentHtml = '', brief = '' } = await body(req);
  if (!lead?.name && !brief && !currentHtml) throw httpError(400, 'Descreve o site que queres criar.');
  await consume(user, 'site');
  if (!lead?.name) {
    const p = currentHtml
      ? `Altera este site conforme o pedido e devolve o HTML completo atualizado.\nPEDIDO: ${String(instructions).slice(0, 1500)}\nHTML ATUAL:\n${String(currentHtml).slice(0, 60000)}`
      : `Cria este site (pode ser de qualquer tipo: negócio, portfólio, landing page, loja, evento, infoproduto). Se faltarem dados reais (telefone, morada, preços), usa marcadores claros como [Telefone] em vez de inventar.\nPEDIDO DO UTILIZADOR:\n${String(brief).slice(0, 3000)}`;
    let h = await ai({ system: SYS, user: p, json: false, maxTokens: 8000, temperature: 0.7 });
    h = h.replace(/^```(?:html)?\s*/i, '').replace(/```\s*$/i, '').trim();
    const k = h.toLowerCase().indexOf('<!doctype'); if (k > 0) h = h.slice(k);
    if (!/<html/i.test(h)) throw httpError(502, 'A IA não devolveu um site válido. Tenta outra vez.');
    return send(res, 200, { html: h });
  }
  const data = {
    empresa: { nome: lead.name, categoria: lead.category, morada: lead.address, telefone: lead.phone, siteAtual: lead.website || null, avaliacoes: lead.reviews, nota: lead.rating, emails: analysis?.emails || [], redes: analysis?.socials || {} },
    necessidades: analysis?.needs || [], descricaoAtual: analysis?.site?.metaDescription || analysis?.site?.title || '',
    pedidoDoUtilizador: String(instructions).slice(0, 1500),
  };
  const prompt = currentHtml
    ? `Altera este site conforme o pedido do utilizador e devolve o HTML completo atualizado.\nPEDIDO: ${data.pedidoDoUtilizador}\nDADOS: ${JSON.stringify(data.empresa)}\nHTML ATUAL:\n${String(currentHtml).slice(0, 60000)}`
    : `Cria o site para esta empresa:\n${JSON.stringify(data)}`;
  let html = await ai({ system: SYS, user: prompt, json: false, maxTokens: 8000, temperature: 0.7 });
  html = html.replace(/^```(?:html)?\s*/i, '').replace(/```\s*$/i, '').trim();
  const i = html.toLowerCase().indexOf('<!doctype'); if (i > 0) html = html.slice(i);
  if (!/<html/i.test(html)) throw httpError(502, 'A IA não devolveu um site válido. Tenta outra vez.');
  send(res, 200, { html });
});
