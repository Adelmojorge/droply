import { send, handler, body, requireUser, consume, ai, httpError } from '../lib/util.js';

// Estúdio de IA: influencer de IA, roteiros virais, anúncios em vídeo, sequências e ofertas.
const BASE = `És o diretor criativo e estratega do droply, uma plataforma para pessoas que ganham dinheiro a vender serviços e produtos feitos com IA.
Respondes SEMPRE só com JSON válido, sem texto fora do JSON. Textos explicativos em português europeu. Prompts para ferramentas de imagem e vídeo em INGLÊS (funcionam melhor). Nunca inventes números de resultados ou testemunhos.`;

const MODES = {
  influencer: {
    sys: `${BASE}
Cria um influenciador virtual (IA) completo e CONSISTENTE. O "characterSheet" é um bloco fixo, muito detalhado (rosto, idade aparente, etnia, olhos, cabelo, pele, marcas distintivas, corpo, estilo de roupa base, paleta de cores, iluminação e lente preferidas), que deve ser copiado IGUAL para o início de cada prompt de imagem e de vídeo, para manter a mesma pessoa em todas as gerações.
Formato:
{"perfil":{"nome":"","handle":"@...","bio":"bio curta para Instagram/TikTok","idade":"","personalidade":"","tomDeVoz":"","valores":[""],"historia":"2-3 frases"},
 "posicionamento":"para quem é, que problema resolve e porque é diferente",
 "estrategia":{"plataformas":[""],"pilaresDeConteudo":[{"pilar":"","exemplos":[""]}],"frequencia":"","formatos":[""],"hashtags":[""],"monetizacao":"como vende o produto sem parecer anúncio"},
 "characterSheet":"bloco em inglês para colar no início de todos os prompts",
 "negativePrompt":"o que evitar, em inglês",
 "imagePrompts":[{"cena":"descrição em português","prompt":"prompt completo em inglês que começa com o characterSheet","formato":"9:16 ou 1:1 ou 4:5"}],
 "videoScripts":[{"titulo":"","gancho":"primeiros 2 segundos","roteiro":["fala ou cena 1","..."],"cta":"","duracao":"ex.: 20 s","videoPrompt":"prompt em inglês para IA de vídeo (começa com o characterSheet, descreve movimento de câmara, ação, ambiente, luz, áudio/fala)"}],
 "dicasConsistencia":["dicas práticas para manter a mesma cara (usar imagem de referência, seed, mesma lente...)"]}
Gera 6 imagePrompts variados (rotina, produto, lifestyle, close-up, ambiente de trabalho, story) e 3 videoScripts.`,
    user: i => `Cria o influenciador com estes dados:\n${JSON.stringify(i)}`,
  },
  scripts: {
    sys: `${BASE}
Cria roteiros de vídeos curtos virais. Se o utilizador colar referências (descrições, transcrições ou links de vídeos virais), analisa o PADRÃO (gancho, ritmo, estrutura, emoção, CTA) e aplica-o ao tema sem copiar o conteúdo.
Formato:
{"analiseReferencias":"o que torna as referências virais (ou dicas gerais se não houver referências)",
 "roteiros":[{"titulo":"","gancho":"","estrutura":"ex.: gancho → problema → virada → prova → CTA","roteiro":[{"tempo":"0-2s","visual":"","fala":""}],"cta":"","legenda":"legenda pronta para publicar","hashtags":[""],"videoPrompt":"prompt em inglês para IA de vídeo","duracao":""}]}`,
    user: i => `Cria ${Math.min(5, Math.max(1, parseInt(i.quantidade || 3, 10)))} roteiros com estes dados:\n${JSON.stringify(i)}`,
  },
  ad: {
    sys: `${BASE}
Cria um anúncio em vídeo feito com IA para um negócio (ex.: supermercado, restaurante, clínica, loja).
Formato:
{"conceito":"ideia central em 1-2 frases","publico":"","duracao":"",
 "cenas":[{"tempo":"0-3s","visual":"descrição em português","voz":"texto da locução ou legenda na língua do anúncio","prompt":"prompt em inglês para IA de vídeo, com estilo visual consistente"}],
 "estiloVisual":"bloco em inglês para colar em todas as cenas (paleta, luz, lente, estilo)",
 "musica":"sugestão de estilo musical","textoFinal":"oferta/CTA no ecrã","legenda":"legenda para redes","hashtags":[""],
 "variacoes":["2 ideias alternativas de gancho"]}`,
    user: i => `Cria o anúncio com estes dados:\n${JSON.stringify(i)}`,
  },
  offer: {
    sys: `${BASE}
Cria uma oferta comercial pronta a vender para um serviço ou produto feito com IA.
Formato:
{"nome":"nome da oferta","promessa":"resultado principal sem garantias falsas","paraQuem":"","entregaveis":[""],"pacotes":[{"nome":"","preco":"","inclui":[""]}],"garantia":"sugestão honesta","objecoes":[{"objecao":"","resposta":""}],"pitchCurto":"pitch de 2-3 frases","mensagemWhatsApp":"mensagem de abordagem curta"}`,
    user: i => `Cria a oferta com estes dados:\n${JSON.stringify(i)}`,
  },
  sequence: {
    sys: `${BASE}
Cria uma sequência de follow-up multicanal para vender um serviço. Usa as variáveis {{nome}}, {{empresa}}, {{cidade}} e {{assinatura}}. Mensagens curtas, humanas, sem pressão agressiva. O último passo é um "fecho educado". Inclui sempre forma de a pessoa pedir para não ser contactada no e-mail.
Formato:
{"nome":"nome da sequência","passos":[{"dia":0,"canal":"wa"|"email"|"call","assunto":"só para email","texto":"mensagem ou guião da chamada"}]}`,
    user: i => `Cria a sequência com estes dados:\n${JSON.stringify(i)}`,
  },
};

export default handler(async (req, res) => {
  if (req.method !== 'POST') throw httpError(405, 'Método não permitido.');
  const user = await requireUser(req);
  const { mode, input = {} } = await body(req);
  const M = MODES[mode];
  if (!M) throw httpError(400, 'Modo desconhecido.');
  const clean = Object.fromEntries(Object.entries(input).map(([k, v]) => [k, String(v ?? '').slice(0, 2500)]));
  await consume(user, 'studio');
  const out = await ai({ system: M.sys, user: M.user(clean), maxTokens: mode === 'influencer' ? 6000 : 3500, temperature: 0.8 });
  send(res, 200, out);
});
