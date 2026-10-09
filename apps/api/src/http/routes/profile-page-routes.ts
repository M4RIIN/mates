import type { Hono } from "hono";
import { publicTagSchema } from "@mates/shared";
import type { AppContainer } from "../../infrastructure/container.js";
import type { AppBindings } from "../types.js";

export function registerProfilePageRoutes(app: Hono<AppBindings>, container: AppContainer): void {
  app.get("/u/:tag", async (context) => {
    context.header("Cache-Control", "no-store");
    context.header("X-Robots-Tag", "noindex, nofollow");
    context.header("Referrer-Policy", "no-referrer");
    context.header("Content-Security-Policy", "default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'");
    const parsed = publicTagSchema.safeParse(context.req.param("tag"));
    if (!parsed.success) return context.html(page("Lien invalide", "Vérifie le lien reçu auprès de ton ami."), 400);
    try {
      const user = await container.useCases.searchUserByPublicTag.execute(parsed.data);
      if (!user) return context.html(page("Profil introuvable", "Ce profil n’existe pas ou n’est plus disponible."), 404);
      const tag = encodeURIComponent(user.publicTag);
      return context.html(page(user.pseudo, user.publicTag, `<p>Retrouve-moi sur Mates pour organiser nos prochaines sorties.</p><a class="primary" href="/app/u/${escapeHtml(tag)}">Continuer dans le navigateur</a><a href="mates://u/${escapeHtml(tag)}">Ouvrir dans l’application</a><p class="hint">L’application doit être installée pour l’ouvrir. Sinon, continue dans le navigateur. Connecte-toi ou crée ton compte pour envoyer une demande d’amitié. Aucune demande n’est envoyée automatiquement.</p>`));
    } catch {
      return context.html(page("Profil indisponible", "Le chargement a échoué. Réessaie dans un instant."), 503);
    }
  });
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]!);
}

function page(title: string, description: string, actions = ""): string {
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>${escapeHtml(title)} · Mates</title><style>*{box-sizing:border-box}body{margin:0;background:#faf6e9;color:#071a2d;font-family:system-ui,sans-serif;padding:24px 16px}main{max-width:480px;margin:8vh auto;background:white;border:2px solid #071a2d;border-radius:18px;padding:24px;overflow-wrap:anywhere}h1{font-size:30px}a{display:block;text-align:center;border:2px solid #071a2d;border-radius:12px;padding:16px;margin:12px 0;color:#071a2d;font-weight:700;text-decoration:none}a:focus-visible{outline:3px solid #071a2d;outline-offset:3px}.primary{background:#414cff;color:white}p{line-height:1.6}.hint{font-size:14px}</style></head><body><main><strong>Mates</strong><h1>${escapeHtml(title)}</h1><p>${escapeHtml(description)}</p>${actions}</main></body></html>`;
}
