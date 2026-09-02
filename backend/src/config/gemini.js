import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config();

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  console.warn("⚠️ GEMINI_API_KEY is not defined in backend/.env!");
}

export const genAI = new GoogleGenerativeAI(apiKey || "");


export const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash-lite";

/**
 * Exécute un appel Gemini avec retry automatique en cas de 429 (quota dépassé).
 * @param {Function} fn - La fonction async à exécuter
 * @param {number} maxRetries - Nombre max de tentatives (défaut: 3)
 */
export async function withRetry(fn, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      const msgLower = (error?.message || '').toLowerCase();
      const isTransient = (
        error?.status === 429 ||
        error?.status === 503 ||
        msgLower.includes('429') ||
        msgLower.includes('503') ||
        msgLower.includes('quota') ||
        msgLower.includes('unavailable') ||
        msgLower.includes('capacity') ||
        msgLower.includes('overloaded')
      );

      if (isTransient && attempt < maxRetries) {
        const delayMs = Math.pow(2, attempt) * 1000;
        console.warn(`⚠️ Erreur temporaire Gemini (429/503) (tentative ${attempt}/${maxRetries}). Retry dans ${delayMs / 1000}s...`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
      } else {
        throw error;
      }
    }
  }
}
