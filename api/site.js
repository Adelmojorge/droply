import { send, handler, body, requireUser, consume, ai, httpError } from '../lib/util.js';

const SYS = `És um web designer sénior. Crias sites de uma página para pequenas empresas locais, prontos a publicar.
Devolve APENAS o código HTML completo (começa em <!doctype html>), sem explicações e sem blocos de markdown.
Requisitos:
- Um único ficheiro. Usa Tailwind via <script src="https://cdn.tailwindcss.com"></script> e Google Fonts. Sem outras dependências.
- Língua: a do país da empresa.
- Estrutura que converte: topo com o que a empresa faz + cidade + botão de ação (ligar / WhatsApp / pedir orçamento) e formulário curto visível; selos de confiança (nota e nº de avaliações reais, se existirem); serviços; porquê nós; avaliações (só se houver dados reais; NÃO inventes testemunhos nem nomes de clientes, usa texto genérico tipo "Rated 4.9/5 on Google by 34 customers"); área servida; FAQ; contacto com telefone e morada reais; rodapé.
- O formulário usa action="https://formsubmit.co/EMAIL" se houver e-mail da empresa; senão um link mailto/tel.
- SEO e GEO: <title> e meta description otimizados, Open Graph, JSON-LD LocalBusiness com nome, morada, telefone, área, avaliação agregada (só se houver dados) e FAQPage.
- Responsivo, rápido, acessível (contraste, alt nas imagens). Imagens: usa gradientes, ícones SVG inline ou https://images.unsplash.com com termos do setor (source.unsplash.com não), sem logótipos de marcas.
- Botão flutuante de WhatsApp se houver telefone.
- Design moderno e profissional, cores adequadas ao setor.`;

export default handler(async (req, res) => {
  if (req.method !== 'POST') throw httpError(405, 'Método não permitido.');
  const user = await requireUser(req);
  const { lead, analysis, instructions = '', currentHtml = '' } = await body(req);
  if (!lead?.name) throw httpError(400, 'Lead em falta.');
  await consume(user, 'site');
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
