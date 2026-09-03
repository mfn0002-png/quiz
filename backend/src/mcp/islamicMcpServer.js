/**
 * islamicMcpServer.js
 *
 * Serveur MCP (Model Context Protocol) regroupant l'ensemble des outils islamiques
 * (Duas, Hadiths, Coran, Prières, Calendrier Hégirien, Zakat, Quiz).
 *
 * Il constitue la SEULE source de vérité pour l'exposition et l'exécution des outils MCP.
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { fetchDuas, formatDuas } from '../services/duaService.js';
import { fetchHadiths, formatHadiths } from '../services/hadithService.js';
import { searchQuranVerses, formatQuranVerses } from '../services/quranService.js';
import { fetchPrayerTimes, formatPrayerTimes } from '../services/prayerService.js';
import { fetchHijriCalendar, formatHijriCalendar } from '../services/calendarService.js';
import { calculateZakat, formatZakatResult } from '../services/zakatService.js';
import { runQuizAgent } from '../services/quizAgent.js';

// ─────────────────────────────────────────────
// Registre unique d'exécution des outils MCP
// ─────────────────────────────────────────────

const toolRegistry = {
  search_duas: async ({ topic }) => {
    const duas = await fetchDuas(topic);
    return formatDuas(duas) || `Aucune invocation trouvée pour "${topic}".`;
  },

  search_hadiths: async ({ queryInEnglish }) => {
    const hadiths = await fetchHadiths(queryInEnglish);
    return formatHadiths(hadiths) || `Aucun hadith trouvé pour "${queryInEnglish}".`;
  },

  search_quran: async ({ query, limit = 3 }) => {
    const verses = await searchQuranVerses(query, limit);
    return formatQuranVerses(verses) || `Aucun verset trouvé pour "${query}".`;
  },

  get_prayer_times: async ({ city = 'Paris' }) => {
    const data = await fetchPrayerTimes({ city });
    return formatPrayerTimes(data);
  },

  get_hijri_calendar: async () => {
    const data = await fetchHijriCalendar();
    return formatHijriCalendar(data);
  },

  calculate_zakat: async ({ amount, currency = 'EUR' }) => {
    const res = calculateZakat({ amount, currency });
    return formatZakatResult(res);
  },

  generate_quiz_question: async ({ topic, difficulty }, sessionId) => {
    const questions = await runQuizAgent(difficulty || 'Débutant', topic || 'Mélange', 1, sessionId);
    const quizObj = questions[0];
    return {
      isQuiz: true,
      quizData: {
        topic: topic || 'Mélange',
        difficulty: difficulty || 'Débutant',
        questionText: quizObj.text,
        options: quizObj.options,
        correctAnswerIndex: quizObj.correctAnswerIndex,
        explanation: quizObj.explanation,
        keywords: quizObj.keywords || [],
      },
      text: quizObj.text,
    };
  }
};

/**
 * Fonction universelle d'exécution des outils MCP.
 * Appelée par l'Assistant Agent ou tout autre client MCP.
 */
export async function executeMcpTool(name, args, sessionId = null) {
  console.log(`🔌 [MCP Server] Exécution de l'outil "${name}"...`);
  const handler = toolRegistry[name];
  if (!handler) {
    throw new Error(`Outil MCP "${name}" inconnu.`);
  }
  return await handler(args, sessionId);
}

// ─────────────────────────────────────────────
// Déclaration du Serveur MCP officiel
// ─────────────────────────────────────────────

export const mcpServer = new McpServer({
  name: 'islamic-knowledge-server',
  version: '1.0.0',
  description: 'Serveur MCP d\'outils et connaissances islamiques (Duas, Hadiths, Coran, Prières, Calendrier Hégirien, Zakat, Quiz)',
});

mcpServer.tool(
  'search_duas',
  'Recherche des invocations (Du\'âs) authentiques de Hisn al-Muslim ou UmmahAPI pour une situation du quotidien (ex: nouvel habit, voyage, repas).',
  { topic: z.string().describe('La situation de l\'invocation') },
  async (args) => ({ content: [{ type: 'text', text: await toolRegistry.search_duas(args) }] })
);

mcpServer.tool(
  'search_hadiths',
  'Recherche des hadiths authentiques dans Sahih Al-Bukhari & Muslim avec mots-clés en Anglais.',
  { queryInEnglish: z.string().describe('Mots-clés en Anglais (ex: "garment", "prayer")') },
  async (args) => ({ content: [{ type: 'text', text: await toolRegistry.search_hadiths(args) }] })
);

mcpServer.tool(
  'search_quran',
  'Recherche des versets coraniques par thème ou mot-clé (traduction française Hamidullah).',
  { query: z.string().describe('Le thème ou mot-clé à rechercher'), limit: z.number().optional().describe('Nombre max de versets (défaut: 3)') },
  async (args) => ({ content: [{ type: 'text', text: await toolRegistry.search_quran(args) }] })
);

mcpServer.tool(
  'get_prayer_times',
  'Récupère les horaires des prières musulmanes pour une ville.',
  { city: z.string().optional().describe('Nom de la ville') },
  async (args) => ({ content: [{ type: 'text', text: await toolRegistry.get_prayer_times(args) }] })
);

mcpServer.tool(
  'get_hijri_calendar',
  'Récupère la date hégirienne actuelle du calendrier musulman.',
  {},
  async () => ({ content: [{ type: 'text', text: await toolRegistry.get_hijri_calendar() }] })
);

mcpServer.tool(
  'calculate_zakat',
  'Calcule la Zakat al-Maal obligatoire (2.5%) sur un montant.',
  { amount: z.number(), currency: z.string().optional() },
  async (args) => ({ content: [{ type: 'text', text: await toolRegistry.calculate_zakat(args) }] })
);

mcpServer.tool(
  'generate_quiz_question',
  'Génère une question de quiz islamique.',
  { topic: z.string(), difficulty: z.enum(['Débutant', 'Intermédiaire', 'Expert']) },
  async (args) => {
    const res = await toolRegistry.generate_quiz_question(args);
    return { content: [{ type: 'text', text: res.text }] };
  }
);

if (process.argv[1] && process.argv[1].endsWith('islamicMcpServer.js')) {
  const transport = new StdioServerTransport();
  await mcpServer.connect(transport);
  console.log('🚀 Serveur MCP Islamic Knowledge connecté sur stdio !');
}
