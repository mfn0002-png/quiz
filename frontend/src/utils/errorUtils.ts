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
  let message = '';
  if (typeof err === 'string') {
    message = err;
  } else if (err && typeof err === 'object' && 'message' in err) {
    message = String((err as any).message);
  } else {
    message = String(err || '');
  }

  const msgLower = message.toLowerCase();

  // ── 503 / Service Unavailable / High demand / Overloaded ────────────────
  if (
    message.includes('503') ||
    msgLower.includes('service unavailable') ||
    msgLower.includes('high demand') ||
    msgLower.includes('overloaded') ||
    msgLower.includes('temporarily unavailable') ||
    msgLower.includes('capacity')
  ) {
    return {
      icon: '⚡',
      title: 'Serveur IA très sollicité',
      detail: "Le modèle d'IA Gemini fait face à un pic d'affluence temporaire chez Google.",
      hint: "Cette saturation est passagère. Veuillez patienter quelques secondes et réessayez !",
    };
  }

  // ── 429 Quota dépassé ────────────────────────────────────────────────
  if (message.includes('429') || msgLower.includes('quota') || msgLower.includes('resource_exhausted')) {
    return {
      icon: '⏳',
      title: 'Quota IA atteint',
      detail: "L'assistant IA a atteint sa limite temporaire de requêtes.",
      hint: "Réessayez dans quelques instants ou plus tard.",
    };
  }

  // ── 404 Modèle introuvable ───────────────────────────────────────────
  if (message.includes('404') || msgLower.includes('not found') || msgLower.includes('no longer available')) {
    return {
      icon: '🤖',
      title: 'Modèle IA indisponible',
      detail: "Le modèle d'IA configuré n'est pas accessible actuellement.",
      hint: "Veuillez réessayez ultérieurement.",
    };
  }

  // ── 401 / 403 Clé API invalide ───────────────────────────────────────
  if (message.includes('401') || message.includes('403') || msgLower.includes('api key') || msgLower.includes('permission_denied')) {
    return {
      icon: '🔑',
      title: 'Clé API invalide',
      detail: "La clé API Gemini est absente, expirée ou non autorisée.",
      hint: "Vérifiez la variable GEMINI_API_KEY dans votre fichier backend/.env",
    };
  }

  // ── Réseau / CORS / backend inaccessible (VRAIES erreurs réseau) ─────
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
      hint: "Assurez-vous que le serveur backend s'exécute sur le port 5005.",
    };
  }

  // ── Erreur de parsing JSON ───────────────────────────────────────────
  if (msgLower.includes('json') || msgLower.includes('parse')) {
    return {
      icon: '⚙️',
      title: "Réponse IA mal formatée",
      detail: "L'IA a renvoyé une réponse dans un format inattendu.",
      hint: "Réessayez — ce type d'erreur est souvent éphémère.",
    };
  }

  // ── Timeout ──────────────────────────────────────────────────────────
  if (msgLower.includes('timeout') || msgLower.includes('timed out')) {
    return {
      icon: '⏱️',
      title: 'Délai dépassé',
      detail: "La génération de la question a pris trop de temps.",
      hint: "Réessayez d'initier le quiz dans un moment.",
    };
  }

  // Nettoyage des messages bruts de la SDK GoogleGenerativeAI
  let cleanDetail = message;
  cleanDetail = cleanDetail.replace(/^⚠️\s*Erreur IA \/ Serveur\s*:\s*/i, '');
  cleanDetail = cleanDetail.replace(/\[GoogleGenerativeAI Error\]:\s*Error fetching from https:\/\/[^\s]+:\s*/gi, '');
  cleanDetail = cleanDetail.replace(/\(Consultez la console du navigateur ou les logs backend pour plus de détails\.\)/gi, '').trim();

  // ── Erreur générique de l'IA Gemini ou du backend ───────────────────
  return {
    icon: '⚠️',
    title: 'Erreur IA / Serveur',
    detail: cleanDetail || "Une erreur inattendue s'est produite.",
    hint: "Vous pouvez retenter votre action dans un instant.",
  };
}

/**
 * Crée un message d'erreur simple (string) à afficher dans un toast ou dans le quiz.
 */
export function toErrorString(err: unknown): string {
  const { icon, title, detail } = parseApiError(err);
  return `${icon} ${title} — ${detail}`;
}
