import { send, handler, verifyUser, access, usage, kvOn, PLANS } from '../lib/util.js';
export default handler(async (req, res) => {
  const u = await verifyUser(req);
  const p = access(u);
  send(res, 200, {
    id: u.id, email: u.email, name: u.name, username: u.username, picture: u.picture, role: u.role, staff: u.staff,
    allowed: !!p.plan, plan: p.plan, until: u.until, expired: !!p.expired, admin: !!p.admin && u.role === 'admin', renewUrl: u.renewUrl, lastPlan: u.plan,
    planInfo: p.plan ? PLANS[p.plan] : null,
    usage: p.plan ? await usage(u.email, p.plan) : null, limitsActive: kvOn(),
  });
});
