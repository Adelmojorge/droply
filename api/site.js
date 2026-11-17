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
- Design moderno e profissional, cores adequadas ao setor.
- FICHEIROS ANEXADOS: se o utilizador anexar imagens com URL pública, usa ESSAS imagens no site (logótipo, fotos, produtos) com <img src="URL">. Se forem capturas de ecrã ou referências de design, copia o estilo (cores, tipografia, layout), não o conteúdo. PDFs e textos anexados são conteúdo/briefing: usa a informação real deles.
- ELEMENTO SELECIONADO: se o pedido indicar um elemento selecionado, altera só esse elemento (e o mínimo à volta) e mantém o resto igual.
- Começa SEMPRE a resposta com um comentário numa só linha: <!--RESUMO: frase curta em português sobre o que fizeste--> e logo a seguir o <!doctype html>.`;

function attachText(files = []) {
  if (!files.length) return '';
  const lines = files.map((f, i) => {
    if (f.kind === 'image') return `${i + 1}) Imagem "${f.name}"${f.url ? ` · URL pública para usar no site: ${f.url}` : ''}${f.role === 'ref' ? ' · é uma REFERÊNCIA de design' : ''}`;
    if (f.kind === 'pdf') return `${i + 1}) PDF "${f.name}" (conteúdo enviado em anexo)`;
    return `${i + 1}) Ficheiro de texto "${f.name}":\n"""\n${String(f.text || '').slice(0, 15000)}\n"""`;
  });
  return `\n\nFICHEIROS ANEXADOS PELO UTILIZADOR:\n${lines.join('\n')}`;
}
function clean(h) {
  let summary = '';
  const m = String(h).match(/<!--\s*RESUMO:\s*([\s\S]*?)-->/i); if (m) summary = m[1].trim().slice(0, 300);
  h = String(h).replace(/^```(?:html)?\s*/i, '').replace(/```\s*$/i, '').trim();
  const k = h.toLowerCase().indexOf('<!doctype'); if (k > 0) h = h.slice(k);
  if (!/<html/i.test(h)) throw httpError(502, 'A IA não devolveu um site válido. Tenta outra vez.');
  return { html: h, summary };
}

export default handler(async (req, res) => {
  if (req.method !== 'POST') throw httpError(405, 'Método não permitido.');
  const user = await requireUser(req);
  const { lead, analysis, instructions = '', currentHtml = '', brief = '', files: rawFiles = [], selection = '' } = await body(req);
  if (!lead?.name && !brief && !currentHtml) throw httpError(400, 'Descreve o site que queres criar.');
  const files = (Array.isArray(rawFiles) ? rawFiles : []).slice(0, 8).map(f => ({
    kind: ['image', 'pdf', 'text'].includes(f.kind) ? f.kind : 'text', name: String(f.name || 'ficheiro').slice(0, 80), url: /^https:\/\//.test(f.url || '') ? f.url : '',
    role: f.role === 'ref' ? 'ref' : 'asset', mime: String(f.mime || ''), data: typeof f.data === 'string' ? f.data : '', text: typeof f.text === 'string' ? f.text : '',
  }));
  const media = files.filter(f => f.data && (f.kind === 'image' || f.kind === 'pdf')).map(f => ({ mime: f.mime || (f.kind === 'pdf' ? 'application/pdf' : 'image/webp'), data: f.data }));
  await consume(user, 'site');
  const extra = attachText(files) + (selection ? `\n\nELEMENTO SELECIONADO (altera só este):\n${String(selection).slice(0, 3000)}` : '');
  let prompt;
  if (!lead?.name) {
    prompt = currentHtml
      ? `Altera este site conforme o pedido e devolve o HTML completo atualizado.\nPEDIDO: ${String(instructions).slice(0, 2000)}${extra}\nHTML ATUAL:\n${String(currentHtml).slice(0, 80000)}`
      : `Cria este site (pode ser de qualquer tipo: negócio, portfólio, landing page, loja, evento, infoproduto). Se faltarem dados reais (telefone, morada, preços), usa marcadores claros como [Telefone] em vez de inventar.\nPEDIDO DO UTILIZADOR:\n${String(brief).slice(0, 4000)}${extra}`;
  } else {
    const data = {
      empresa: { nome: lead.name, categoria: lead.category, morada: lead.address, telefone: lead.phone, siteAtual: lead.website || null, avaliacoes: lead.reviews, nota: lead.rating, emails: analysis?.emails || [], redes: analysis?.socials || {} },
      necessidades: analysis?.needs || [], descricaoAtual: analysis?.site?.metaDescription || analysis?.site?.title || '',
      pedidoDoUtilizador: String(instructions || brief).slice(0, 2000),
    };
    prompt = currentHtml
      ? `Altera este site conforme o pedido do utilizador e devolve o HTML completo atualizado.\nPEDIDO: ${data.pedidoDoUtilizador}${extra}\nDADOS: ${JSON.stringify(data.empresa)}\nHTML ATUAL:\n${String(currentHtml).slice(0, 80000)}`
      : `Cria o site para esta empresa:\n${JSON.stringify(data)}${extra}`;
  }
  const out = clean(await ai({ system: SYS, user: prompt, json: false, maxTokens: 16000, temperature: 0.7, files: media }));
  send(res, 200, out);
});
