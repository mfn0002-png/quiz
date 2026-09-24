/**
 * contentGeneratorAgent.js
 * 
 * Agent d'assistance à la création de contenu (Prophètes, Duas, Fiches, Récits) :
 * 1. Recherche de contexte authentique (Coran / Hadiths) via RAG / MCP
 * 2. Génération par Gemini 1.5 d'un brouillon structuré JSON (titre, résumé, chapitres/sections)
 * 3. Transmis à l'Administrateur pour PRÉVISUALISATION, ÉDITION et VALIDATION humaine avant écriture Firestore.
 */

import { SchemaType } from '@google/generative-ai';
import { genAI, GEMINI_MODEL, withRetry } from '../config/gemini.js';
import { fetchIslamicRAGContext } from './ragService.js';

const TOPIC_SCHEMA = {
  type: SchemaType.OBJECT,
  properties: {
    id: { type: SchemaType.STRING },
    title: { type: SchemaType.STRING },
    category: { type: SchemaType.STRING },
    format: { type: SchemaType.STRING },
    summary: { type: SchemaType.STRING },
    chapters: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          title: { type: SchemaType.STRING },
          paragraphs: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
        },
        required: ['title', 'paragraphs'],
      },
    },
    sections: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          heading: { type: SchemaType.STRING },
          body: { type: SchemaType.STRING },
        },
        required: ['heading', 'body'],
      },
    },
  },
  required: ['id', 'title', 'category', 'format', 'summary'],
};

/**
 * Génère une proposition de récit ou de fiche pour un sujet donné (ex: "Prophète Salih")
 * @param {Object} params
 * @param {string} params.subject - Nom du sujet (ex: "Prophète Hûd", "Invocations contre la tristesse")
 * @param {'prophetes' | 'duas' | 'piliers' | 'foi' | 'jurisprudence'} [params.category='prophetes']
 * @param {'recit' | 'fiche'} [params.format='recit']
 * @returns {Promise<Object>} Proposition de contenu structuré
 */
export async function generateTopicDraft({ subject, category = 'prophetes', format = 'recit' }) {
  console.log(`🤖 [Content Generator Agent] Génération de brouillon pour : "${subject}" (${category}, ${format})...`);

  // 1. Récupération du contexte RAG (Coran, Hadiths, Duas)
  const ragContext = await fetchIslamicRAGContext(subject);

  // 2. Prompt Gemini avec consignes d'authenticité et format JSON
  const systemInstruction = `Tu es l'agent expert de rédaction de contenu pour la plateforme NoorQuiz.
Ta mission est de générer un récit historique ou une fiche d'apprentissage complète, captivante, authentique et pédagogique.

RÈGLES STRICTES :
1. Authenticité scripturaire basée sur le Coran et la Sunnah authentique.
2. Si c'est un récit de Prophète (format 'recit') : découpe en 3 à 5 chapitres chronologiques avec titres inspirants et paragraphes clairs.
3. Si c'est une fiche d'apprentissage ou une doua (format 'fiche') : découpe en sections explicatives avec titres (heading) et textes (body).
4. Fournis un id en snake_case lisible (ex: 'prophet_hud', 'dua_anxiete').
5. Langue : Français soigné et bienveillant.`;

  const prompt = `CONTEXTE SCRIPTURAIRE DE RÉFÉRENCE :
${ragContext}

SUJET À RÉDIGER : "${subject}"
CATÉGORIE : "${category}"
FORMAT SOUHAITÉ : "${format}"

Génère la structure JSON complète pour ce sujet.`;

  const model = genAI.getGenerativeModel({
    model: GEMINI_MODEL,
    systemInstruction,
    generationConfig: {
      temperature: 0.3,
      responseMimeType: 'application/json',
      responseSchema: TOPIC_SCHEMA,
    },
  });

  const responseText = await withRetry(async () => {
    const result = await model.generateContent(prompt);
    return result.response.text();
  });

  const draft = JSON.parse(responseText);
  console.log(`✅ [Content Generator Agent] Brouillon généré avec succès pour '${draft.title}' (${draft.chapters?.length || draft.sections?.length || 0} partie(s)).`);

  return draft;
}
