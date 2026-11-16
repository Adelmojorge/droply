import { send, handler, body, requireUser, consume, ai, env, httpError } from '../lib/util.js';

const FIELDS = [
  'places.id', 'places.displayName', 'places.formattedAddress', 'places.nationalPhoneNumber',
  'places.internationalPhoneNumber', 'places.websiteUri', 'places.rating', 'places.userRatingCount',
  'places.googleMapsUri', 'places.primaryTypeDisplayName', 'places.businessStatus', 'places.location', 'nextPageToken',
].join(',');

const SYS = `Transformas o pedido de um vendedor numa pesquisa para o Google Maps.
Responde só com JSON:
{"textQuery":"tipo de negócio + cidade/região, na língua local do país (ex.: 'dentists in Austin, Texas', 'canalizadores em Braga')",
 "regionCode":"código ISO de 2 letras do país (US, PT, BR, GB, FR, ES, DE, AO, MZ...)",
 "languageCode":"língua local (en, pt, es, fr, de...)",
 "filters":{"maxReviews":número ou null,"minReviews":número ou null,"minRating":número ou null,"website":"none"|"has"|"any"},
 "label":"resumo curto em português (ex.: 'Dentistas · Austin, EUA')"}
Regras: "sem site" => website "none". "com site" => "has". Senão "any". Não inventes filtros que o pedido não diz.`;

export default handler(async (req, res) => {
  if (req.method !== 'POST') throw httpError(405, 'Método não permitido.');
  const user = await requireUser(req);
  const b = await body(req);
  const key = env('GOOGLE_PLACES_API_KEY');
  if (!key) throw httpError(500, 'Falta configurar GOOGLE_PLACES_API_KEY.');

  let plan = b.plan;
  if (!plan) {
    const prompt = String(b.prompt || '').trim().slice(0, 400);
    if (prompt.length < 4) throw httpError(400, 'Escreve que clientes procuras.');
    await consume(user, 'search');
    plan = await ai({ system: SYS, user: prompt, maxTokens: 300, temperature: 0 });
    if (!plan.textQuery) throw httpError(400, 'Não percebi o pedido. Diz o tipo de empresa e a cidade.');
  } else {
    if (!b.pageToken) throw httpError(400, 'Nada para carregar.');
    await consume(user, 'search');
  }

  const req2 = { textQuery: plan.textQuery, pageSize: 20 };
  if (plan.languageCode) req2.languageCode = plan.languageCode;
  if (plan.regionCode && /^[A-Z]{2}$/i.test(plan.regionCode)) req2.regionCode = plan.regionCode.toUpperCase();
  if (b.pageToken) req2.pageToken = b.pageToken;

  const r = await fetch('https://places.googleapis.com/v1/places:searchText', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': key, 'X-Goog-FieldMask': FIELDS },
    body: JSON.stringify(req2),
  });
  const j = await r.json();
  if (!r.ok) throw httpError(502, 'Google Maps: ' + (j.error?.message || r.status));

  const f = plan.filters || {};
  const all = (j.places || []).filter(p => p.businessStatus !== 'CLOSED_PERMANENTLY');
  const leads = all.map(p => ({
    id: p.id,
    name: p.displayName?.text || 'Sem nome',
    address: p.formattedAddress || '',
    phone: p.internationalPhoneNumber || p.nationalPhoneNumber || '',
    website: p.websiteUri || '',
    rating: p.rating ?? null,
    reviews: p.userRatingCount ?? 0,
    maps: p.googleMapsUri || '',
    category: p.primaryTypeDisplayName?.text || '',
    lat: p.location?.latitude, lng: p.location?.longitude,
  })).filter(l =>
    (f.maxReviews == null || l.reviews <= f.maxReviews) &&
    (f.minReviews == null || l.reviews >= f.minReviews) &&
    (f.minRating == null || (l.rating ?? 0) >= f.minRating) &&
    (f.website !== 'none' || !l.website) &&
    (f.website !== 'has' || !!l.website));

  send(res, 200, { plan, leads, found: all.length, nextPageToken: j.nextPageToken || null });
});
