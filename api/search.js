import { send, handler, body, requireUser, consume, ai, env, httpError } from '../lib/util.js';

// Pesquisa de clientes: Google Places (se houver GOOGLE_PLACES_API_KEY) ou OpenStreetMap (grátis, sem chave).
const FIELDS = [
  'places.id', 'places.displayName', 'places.formattedAddress', 'places.nationalPhoneNumber',
  'places.internationalPhoneNumber', 'places.websiteUri', 'places.rating', 'places.userRatingCount',
  'places.googleMapsUri', 'places.primaryTypeDisplayName', 'places.businessStatus', 'places.location', 'nextPageToken',
].join(',');

const SYS = `Transformas o pedido de um vendedor numa pesquisa de negócios num mapa.
Responde só com JSON:
{"textQuery":"tipo de negócio + cidade/região, na língua local do país (ex.: 'dentists in Austin, Texas', 'canalizadores em Braga')",
 "regionCode":"código ISO de 2 letras do país (US, PT, BR, GB, FR, ES, DE, AO, MZ...)",
 "languageCode":"língua local (en, pt, es, fr, de...)",
 "filters":{"maxReviews":número ou null,"minReviews":número ou null,"minRating":número ou null,"website":"none"|"has"|"any"},
 "label":"resumo curto em português (ex.: 'Dentistas · Austin, EUA')",
 "osm":{"area":"cidade, região e país por extenso em inglês para o geocoder (ex.: 'Austin, Texas, United States', 'Braga, Portugal', 'Luanda, Angola')",
        "tags":[["chave","valor"]],
        "nameRegex":"palavra(s) para procurar no nome quando não há etiqueta OSM exata, senão null"}}
Para "osm.tags" usa etiquetas reais do OpenStreetMap (1 a 4 pares), por exemplo:
dentista: [["amenity","dentist"],["healthcare","dentist"]]; clínica: [["amenity","clinic"],["healthcare","clinic"]]; médico: [["amenity","doctors"]];
restaurante: [["amenity","restaurant"]]; café: [["amenity","cafe"]]; bar: [["amenity","bar"],["amenity","pub"]]; fast food: [["amenity","fast_food"]];
hotel: [["tourism","hotel"],["tourism","guest_house"]]; ginásio: [["leisure","fitness_centre"]]; cabeleireiro/barbearia: [["shop","hairdresser"]]; estética/spa: [["shop","beauty"],["leisure","spa"]];
advogado: [["office","lawyer"]]; contabilista: [["office","accountant"]]; imobiliária: [["office","estate_agent"]]; seguros: [["office","insurance"]];
canalizador: [["craft","plumber"]]; eletricista: [["craft","electrician"]]; carpinteiro: [["craft","carpenter"]]; oficina auto: [["shop","car_repair"]]; stand: [["shop","car"]];
supermercado: [["shop","supermarket"]]; padaria: [["shop","bakery"]]; farmácia: [["amenity","pharmacy"]]; roupa: [["shop","clothes"]]; florista: [["shop","florist"]];
escola: [["amenity","school"]]; explicações: [["amenity","prep_school"]]; veterinário: [["amenity","veterinary"]]; lavandaria: [["shop","laundry"],["shop","dry_cleaning"]].
Regras: "sem site" => website "none". "com site" => "has". Senão "any". Não inventes filtros que o pedido não diz.`;

const UA = 'droply/1.0 (https://droply.codedropstudio.online)';
const PAGE = 20;

const sleep = ms => new Promise(r => setTimeout(r, ms));
async function nominatim(params) {
  const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), 12000);
  try {
    const r = await fetch('https://nominatim.openstreetmap.org/search?' + new URLSearchParams({ format: 'jsonv2', addressdetails: '1', extratags: '1', ...params }), { headers: { 'User-Agent': UA, 'Accept-Language': 'pt,en' }, signal: ctl.signal });
    if (!r.ok) return [];
    return await r.json();
  } catch { return []; } finally { clearTimeout(t); }
}
// Overpass (reserva): corre em vários servidores ao mesmo tempo e usa o primeiro que responder
async function overpass(q) {
  const urls = ['https://overpass-api.de/api/interpreter', 'https://overpass.kumi.systems/api/interpreter', 'https://overpass.private.coffee/api/interpreter'];
  const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), 20000);
  try {
    return await Promise.any(urls.map(async u => {
      const r = await fetch(u, { method: 'POST', headers: { 'User-Agent': UA, 'Content-Type': 'application/x-www-form-urlencoded' }, body: 'data=' + encodeURIComponent(q), signal: ctl.signal });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return (await r.json()).elements || [];
    }));
  } catch { return []; } finally { clearTimeout(t); ctl.abort(); }
}
const esc = s => String(s).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
function fromNominatim(x, area) {
  const a = x.address || {}, t = x.extratags || {};
  const street = [a.road, a.house_number].filter(Boolean).join(' ');
  return { key: 'osm-' + x.osm_type + '-' + x.osm_id, name: x.name || (x.display_name || '').split(',')[0], street, postcode: a.postcode, city: a.city || a.town || a.village || a.suburb || a.county, country: a.country, tags: t, cat: x.type, lat: Number(x.lat), lng: Number(x.lon), area };
}
function fromOverpass(e, area) {
  const t = e.tags || {};
  return { key: `osm-${e.type}-${e.id}`, name: t.name, street: [t['addr:street'], t['addr:housenumber']].filter(Boolean).join(' '), postcode: t['addr:postcode'], city: t['addr:city'] || t['addr:suburb'], country: t['addr:country'], tags: t, cat: t.amenity || t.shop || t.office || t.craft || t.healthcare || t.leisure || t.tourism, lat: e.lat ?? e.center?.lat, lng: e.lon ?? e.center?.lon, area };
}
function toLead(p) {
  const t = p.tags || {};
  return {
    id: p.key, name: p.name, address: [p.street, p.postcode, p.city, p.country].filter(Boolean).join(', ') || p.area,
    phone: t.phone || t['contact:phone'] || t['contact:mobile'] || '', website: t.website || t['contact:website'] || t.url || '',
    email: t.email || t['contact:email'] || '', rating: null, reviews: 0, category: String(p.cat || '').replace(/_/g, ' '),
    maps: p.lat ? `https://www.openstreetmap.org/?mlat=${p.lat}&mlon=${p.lng}#map=18/${p.lat}/${p.lng}` : '', lat: p.lat, lng: p.lng, source: 'osm',
    socials: { facebook: t['contact:facebook'] || t.facebook || '', instagram: t['contact:instagram'] || t.instagram || '' },
  };
}
async function searchOSM(plan, offset) {
  const o = plan.osm || {};
  if (!o.area) throw httpError(400, 'Diz a cidade ou região onde procuras.');
  const tags = (Array.isArray(o.tags) ? o.tags : []).filter(t => Array.isArray(t) && t[0] && t[1]).slice(0, 4);
  const words = [...new Set([...tags.map(t => String(t[1]).replace(/_/g, ' ')), ...(o.nameRegex && !tags.length ? [o.nameRegex] : [])])].slice(0, 3);
  if (!words.length) throw httpError(400, 'Diz o tipo de negócio que procuras (ex.: dentistas, restaurantes).');
  const found = new Map();
  // 1) Nominatim: "dentist in Lisbon, Portugal" (rápido e estável). Até 2 páginas de 40 por palavra.
  const T = { start: Date.now() };
  for (const w of words) {
    let exclude = [];
    for (let round = 0; round < 2; round++) {
      if (round && found.size >= 30) break;
      const res = await nominatim({ q: `${w} in ${o.area}`, limit: '40', ...(exclude.length ? { exclude_place_ids: exclude.join(',') } : {}) });
      for (const x of res) { const p = fromNominatim(x, o.area); if (p.name && !found.has(p.key)) found.set(p.key, p); }
      exclude.push(...res.map(x => x.place_id));
      if (res.length < 40) break;
      await sleep(1000); // regra do Nominatim: 1 pedido por segundo
    }
  }
  T.nominatim = Date.now() - T.start;
  // 2) Reserva: Overpass na zona da cidade, se o Nominatim trouxe pouco
  if (found.size < 10 && tags.length) {
    const [g] = await nominatim({ q: o.area, limit: '1', extratags: '0' });
    if (g?.boundingbox) {
      const [s, n, w, e] = g.boundingbox.map(Number);
      const bb = `(${s},${w},${n},${e})`;
      const els = await overpass(`[out:json][timeout:18];(${tags.map(([k, v]) => `nwr["${esc(k)}"="${esc(v)}"]["name"]${bb};`).join('')});out center tags 300;`);
      for (const el of els) { const p = fromOverpass(el, o.area); if (p.name && !found.has(p.key)) found.set(p.key, p); }
    }
  }
  if (!found.size) throw httpError(404, `Não encontrei negócios desse tipo em "${o.area}" no OpenStreetMap. Tenta outra cidade ou outro tipo de negócio.`);
  const f = plan.filters || {}, seen = new Set();
  const all = [...found.values()].map(toLead)
    .filter(l => { const k = l.name.toLowerCase() + '|' + l.address.toLowerCase(); if (seen.has(k)) return false; seen.add(k); return true; })
    .filter(l => (f.website !== 'none' || !l.website) && (f.website !== 'has' || !!l.website))
    .sort((a, b) => (!!b.phone - !!a.phone) || (!!b.email - !!a.email));
  T.total = Date.now() - T.start;
  return { leads: all.slice(offset, offset + PAGE), found: all.length, nextPageToken: offset + PAGE < all.length ? 'osm:' + (offset + PAGE) : null, timing: T };
}

async function searchGoogle(plan, key, pageToken) {
  const req2 = { textQuery: plan.textQuery, pageSize: 20 };
  if (plan.languageCode) req2.languageCode = plan.languageCode;
  if (plan.regionCode && /^[A-Z]{2}$/i.test(plan.regionCode)) req2.regionCode = plan.regionCode.toUpperCase();
  if (pageToken) req2.pageToken = pageToken;
  const r = await fetch('https://places.googleapis.com/v1/places:searchText', {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': key, 'X-Goog-FieldMask': FIELDS }, body: JSON.stringify(req2),
  });
  const j = await r.json();
  if (!r.ok) throw httpError(502, 'Google Maps: ' + (j.error?.message || r.status));
  const f = plan.filters || {};
  const all = (j.places || []).filter(p => p.businessStatus !== 'CLOSED_PERMANENTLY');
  const leads = all.map(p => ({
    id: p.id, name: p.displayName?.text || 'Sem nome', address: p.formattedAddress || '',
    phone: p.internationalPhoneNumber || p.nationalPhoneNumber || '', website: p.websiteUri || '',
    rating: p.rating ?? null, reviews: p.userRatingCount ?? 0, maps: p.googleMapsUri || '',
    category: p.primaryTypeDisplayName?.text || '', lat: p.location?.latitude, lng: p.location?.longitude,
  })).filter(l =>
    (f.maxReviews == null || l.reviews <= f.maxReviews) && (f.minReviews == null || l.reviews >= f.minReviews) &&
    (f.minRating == null || (l.rating ?? 0) >= f.minRating) && (f.website !== 'none' || !l.website) && (f.website !== 'has' || !!l.website));
  return { leads, found: all.length, nextPageToken: j.nextPageToken || null };
}

export default handler(async (req, res) => {
  if (req.method !== 'POST') throw httpError(405, 'Método não permitido.');
  const user = await requireUser(req);
  const b = await body(req);
  const key = env('GOOGLE_PLACES_API_KEY');

  let plan = b.plan;
  if (!plan) {
    const prompt = String(b.prompt || '').trim().slice(0, 400);
    if (prompt.length < 4) throw httpError(400, 'Escreve que clientes procuras.');
    await consume(user, 'search');
    const t0 = Date.now();
    plan = await ai({ system: SYS, user: prompt, maxTokens: 500, temperature: 0 });
    plan._aiMs = Date.now() - t0;
    if (!plan.textQuery && !plan.osm) throw httpError(400, 'Não percebi o pedido. Diz o tipo de empresa e a cidade.');
  } else {
    if (!b.pageToken) throw httpError(400, 'Nada para carregar.');
    await consume(user, 'search');
  }
  const useOSM = !key || String(b.pageToken || '').startsWith('osm:');
  const out = useOSM
    ? await searchOSM(plan, parseInt(String(b.pageToken || 'osm:0').slice(4), 10) || 0)
    : await searchGoogle(plan, key, b.pageToken);
  send(res, 200, { plan, source: useOSM ? 'osm' : 'google', ...out });
});
