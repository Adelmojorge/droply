import { send, env, PLANS, SB_URL } from '../lib/util.js';
export default function (req, res) {
  send(res, 200, {
    githubClientId: env('GITHUB_CLIENT_ID'),
    supabaseUrl: SB_URL,
    checkout: {
      basico: env('CHECKOUT_BASICO_URL', 'https://pay.kursinha.com/c/6aee66b44dd62fd0ef866765'),
      pro: env('CHECKOUT_PRO_URL', 'https://pay.kursinha.com/c/6a85f558a1f75adb595a9a73'),
    },
    supportWhatsApp: env('SUPPORT_WHATSAPP').replace(/\D/g, ''),
    supportEmail: env('SUPPORT_EMAIL'),
    plans: PLANS,
  });
}
