import { send, handler, verifyGoogle, isAllowed, isAdmin, usage, kvOn } from '../lib/util.js';
export default handler(async (req, res) => {
  const u = await verifyGoogle(req);
  const allowed = await isAllowed(u.email);
  send(res, 200, { email: u.email, name: u.name, picture: u.picture, allowed, admin: isAdmin(u.email), usage: allowed ? await usage(u.email) : null, limitsActive: kvOn() });
});
