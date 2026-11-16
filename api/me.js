import { send, handler, verifyGoogle, getPlan, usage, kvOn, PLANS } from '../lib/util.js';
export default handler(async (req, res) => {
  const u = await verifyGoogle(req);
  const p = await getPlan(u.email);
  send(res, 200, {
    email: u.email, name: u.name, picture: u.picture,
    allowed: !!p.plan, plan: p.plan, until: p.until, expired: !!p.expired, admin: !!p.admin,
    planInfo: p.plan ? PLANS[p.plan] : null,
    usage: p.plan ? await usage(u.email, p.plan) : null, limitsActive: kvOn(),
  });
});
