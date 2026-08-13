import { Redis } from '@upstash/redis';
import dotenv from 'dotenv';
dotenv.config();

let redis = null;

const url = process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.UPSTASH_REDIS_REST_TOKEN;

if (url && token) {
  redis = new Redis({ url, token });
  console.log('✅ Upstash Redis connecté');
} else {
  console.warn('⚠️  UPSTASH_REDIS_REST_URL / TOKEN non configurés — fallback mémoire activé');
}

// Fallback en mémoire (développement sans Redis)
export const memoryStore = new Map();

export { redis };
