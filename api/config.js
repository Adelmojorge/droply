import { send, env, LIMITS } from '../lib/util.js';
export default function (req, res) {
  send(res, 200, {
    googleClientId: env('GOOGLE_CLIENT_ID'),
    githubClientId: env('GITHUB_CLIENT_ID'),
    checkoutUrl: env('CHECKOUT_URL'),
    supportWhatsApp: env('SUPPORT_WHATSAPP').replace(/\D/g, ''),
    supportEmail: env('SUPPORT_EMAIL'),
    limits: LIMITS,
  });
}
