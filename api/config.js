import { send, env, PLANS } from '../lib/util.js';
export default function (req, res) {
  send(res, 200, {
    googleClientId: env('GOOGLE_CLIENT_ID'),
    githubClientId: env('GITHUB_CLIENT_ID'),
    checkout: { basico: env('CHECKOUT_BASICO_URL') || env('CHECKOUT_URL'), pro: env('CHECKOUT_PRO_URL') || env('CHECKOUT_URL') },
    payMethods: env('PAY_METHODS'),            // ex.: "Multicaixa Express: 9xx xxx xxx | IBAN: AO06 ..."
    supportWhatsApp: env('SUPPORT_WHATSAPP').replace(/\D/g, ''),
    supportEmail: env('SUPPORT_EMAIL'),
    plans: PLANS,
  });
}
