/**
 * errorUtils.ts
 *
 * Mappe les codes d'erreur HTTP et les messages backend en messages
 * clairs, conviviaux et explicites pour l'utilisateur final.
 */

export interface UserFacingError {
  icon: string;
  title: string;
  detail: string;
  hint?: string;
}

/**
 * Convertit une erreur API en objet lisible pour l'utilisateur.
 */
export function parseApiError(err: unknown): UserFacingError {
  const message = (err as any)?.message || String(err) || '';
  const msgLower = message.toLowerCase();

  // ── 429 Quota dépassé ────────────────────────────────────────────────
  if (message.includes('429') || msgLower.includes('quota')) {
    return {
      icon: '⏳',
      title: 'Quota IA atteint',
      detail: "L'assistant IA a atteint sa limite quotidienne de requêtes.",
      hint: "Réessayez dans quelques heures ou demain. Le quota se renouvelle chaque jour.",
    };
  }

  // ── 404 Modèle introuvable ───────────────────────────────────────────
  if (message.includes('404') || msgLower.includes('not found') || msgLower.includes('no longer available')) {
    return {
      icon: '🤖',
      title: 'Modèle IA indisponible',
      detail: "Le modèle d'IA configuré n'est pas accessible.",
      hint: "Vérifiez la variable GEMINI_MODEL dans backend/.env",
    };
  }

  // ── 401 / 403 Clé API invalide ───────────────────────────────────────
  if (message.includes('401') || message.includes('403') || msgLower.includes('api key')) {
    return {
      icon: '🔑',
      title: 'Clé API invalide',
      detail: "La clé API Gemini est absente ou incorrecte.",
      hint: "Vérifiez GEMINI_API_KEY dans backend/.env",
    };
  }

  // ── Réseau / CORS / backend inaccessible (VRAIES erreurs réseau) ─────
  // ⚠️ ATTENTION : Ne pas tester 'fetch' seul car GoogleGenerativeAIFetchError contient ce mot !
  if (
    msgLower.includes('failed to fetch') ||
    msgLower.includes('networkerror') ||
    msgLower.includes('net::err_connection_refused') ||
    msgLower.includes('econnrefused')
  ) {
    return {
      icon: '📡',
      title: 'Serveur inaccessible',
      detail: "Impossible de joindre le serveur backend.",
      hint: "Assurez-vous que 'npm run dev' tourne dans le dossier backend/ (port 5005).",
    };
  }

  // ── Erreur de parsing JSON ───────────────────────────────────────────
  if (msgLower.includes('json') || msgLower.includes('parse')) {
    return {
      icon: '⚙️',
      title: "Réponse IA mal formatée",
      detail: "L'IA a renvoyé une réponse dans un format inattendu.",
      hint: "Réessayez — c'est souvent temporaire.",
    };
  }

  // ── Timeout ──────────────────────────────────────────────────────────
  if (msgLower.includes('timeout') || msgLower.includes('timed out')) {
    return {
      icon: '⏱️',
      title: 'Délai dépassé',
      detail: "La requête a pris trop de temps.",
      hint: "Essayez avec une question plus courte ou réessayez dans un moment.",
    };
  }

  // ── Erreur générique de l'IA Gemini ou du backend ───────────────────
  return {
    icon: '⚠️',
    title: 'Erreur IA / Serveur',
    detail: message || "Une erreur inconnue s'est produite.",
    hint: "Consultez la console du navigateur ou les logs backend pour plus de détails.",
  };
}

/**
 * Crée un message d'erreur simple (string) à afficher dans un toast ou dans le quiz.
 */
export function toErrorString(err: unknown): string {
  const { icon, title, detail } = parseApiError(err);
  return `${icon} ${title} — ${detail}`;
}
