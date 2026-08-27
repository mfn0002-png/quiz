import rateLimit, { ipKeyGenerator } from 'express-rate-limit';

const RETRY_AFTER = 60;

const standardHeaders = true;
const legacyHeaders = false;

function byIpAndSession(sessionPart) {
  return (req) => `${ipKeyGenerator(req)}:${sessionPart(req) || 'anon'}`;
}

export function createAppRateLimiter() {
  return rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 100,
    standardHeaders,
    legacyHeaders,
    message: { error: 'Trop de requêtes. Réessayez dans quelques minutes.' },
  });
}

export function createGenerateRateLimiter() {
  return rateLimit({
    windowMs: 60 * 1000,
    limit: 30,
    standardHeaders,
    legacyHeaders,
    keyGenerator: byIpAndSession((req) => req.body?.sessionId),
    message: {
      error: "Trop de générations de quiz. Réessayez dans une minute.",
      retryAfter: RETRY_AFTER,
    },
  });
}

export function createChatRateLimiter() {
  return rateLimit({
    windowMs: 60 * 1000,
    limit: 20,
    standardHeaders,
    legacyHeaders,
    keyGenerator: byIpAndSession((req) => req.body?.sessionId),
    message: {
      error: "Trop de messages envoyés à l'assistant. Réessayez dans une minute.",
      retryAfter: RETRY_AFTER,
    },
  });
}
