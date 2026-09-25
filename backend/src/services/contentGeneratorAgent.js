/**
 * contentGeneratorAgent.js
 *
 * Agent d'assistance à la création de contenu (Prophètes, Duas, Fiches, Récits) :
 * 1. Recherche de contexte authentique (Coran / Hadiths) via RAG
 * 2. Génération par Gemini d'un brouillon structuré JSON enrichi (titre, résumé,
 *    chapitres avec versets, glossaire et checkpoints)
 * 3. Transmis à l'Administrateur pour PRÉVISUALISATION, ÉDITION et VALIDATION
 *    humaine avant écriture Firestore.
 */

import { genAI, GEMINI_MODEL, withRetry } from '../config/gemini.js';
import { fetchIslamicRAGContext } from './ragService.js';

/**
 * Nettoie une chaîne JSON retournée par le LLM (retire les balises markdown, trailing commas, espaces).
 */
function cleanJsonString(str) {
  if (!str) return '';
  return str
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```\s*$/i, '')
    .replace(/,\s*([\}\]])/g, '$1') // Supprime les virgules traînantes devant } ou ]
    .trim();
}

/**
 * Génère une proposition de récit ou de fiche pour un sujet donné.
 * @param {Object} params
 * @param {string} params.subject  - Sujet (ex: "Prophète Hûd", "Invocations contre la tristesse")
 * @param {'prophetes'|'duas'|'piliers'|'foi'|'jurisprudence'} [params.category='prophetes']
 * @param {'recit'|'fiche'} [params.format='recit']
 * @returns {Promise<Object>} Brouillon structuré enrichi
 */
export async function generateTopicDraft({ subject, category = 'prophetes', format = 'recit' }) {
  console.log(`🤖 [Content Generator Agent] Génération de brouillon pour : "${subject}" (${category}, ${format})...`);

  // 1. Contexte RAG (Coran, Hadiths, sources islamiques)
  const ragContext = await fetchIslamicRAGContext(subject);

  // 2. Instructions système avec template JSON exact inspiré de prophet-adam
  const systemInstruction = `Tu es l'agent expert de rédaction pédagogique pour la plateforme d'apprentissage islamique NoorQuiz.
Ta mission est de générer un contenu d'apprentissage complet, captivant, authentique et pédagogique.

RÈGLE D'EXCELLENCE : Tu dois générer STRICTEMENT le format complet de topic NoorQuiz suivant (identique au modèle de référence prophet-adam) :

{
  "is_valid": true,
  "id": "prophet-adam",
  "format": "recit",
  "title": "Adam (عليه السلام)",
  "subtitle": "Le premier homme, père de l'humanité et premier prophète",
  "category": "prophetes",
  "icon": "🌿",
  "gradient": "linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)",
  "badge": "Prophète",
  "summary": "Créé d'argile par les Mains d'Allah, Adam est le premier être humain et le premier prophète. Son histoire enseigne la dignité de l'homme, le danger de l'orgueil et la puissance du repentir sincère.",
  "quizCategoryTarget": "Prophètes",
  "revision": 1,
  "estimatedMinutes": 8,
  "chapters": [
    {
      "id": "adam-creation",
      "label": "La création",
      "title": "La création et la dignité de l'être humain",
      "blocks": [
        {
          "type": "text",
          "value": "Texte narratif du premier paragraphe (environ 60-80 mots)."
        },
        {
          "type": "source",
          "ref": {
            "kind": "quran",
            "surah": 2,
            "ayah": 30
          },
          "note": "Annonce de la création du khalîfah aux anges."
        },
        {
          "type": "text",
          "value": "Texte narratif du second paragraphe (environ 60-80 mots)."
        }
      ],
      "glossary": [
        {
          "term": "Khalîfah",
          "definition": "Vicaire, représentant d'Allah sur Terre.",
          "arabic": "خليفة"
        }
      ],
      "checkpoint": {
        "question": "Question de validation de la compréhension ?",
        "options": ["Choix A", "Choix B", "Choix C", "Choix D"],
        "correctIndex": 1,
        "explanation": "Explication courte de la bonne réponse."
      }
    }
  ]
}

RÈGLES IMPORTANTES :
1. VÉRIFICATION DU PÉRIMÈTRE :
   - Si le sujet est profane ou hors-islam (informatique, sport, football, actualités) :
     Tu DOIS répondre UNIQUEMENT :
     {
       "is_valid": false,
       "rejection_reason": "Le sujet demandé est en dehors du périmètre des sciences islamiques et de l'apprentissage de NoorQuiz."
     }
2. SI LE SUJET EST VALIDE ET ISLAMIQUE :
   - "is_valid": true
   - "id": kebab-case (ex: "prophet-moussa", "dua-anxiete")
   - "format": "recit" (ou "fiche")
   - "title": Nom soigné avec translittération/formule (ex: "Moussa (عليه السلام)")
   - "subtitle": Sous-titre évocateur
   - "category": "${category}"
   - "icon": Un emoji représentatif (ex: 🌿, ✨, 🤲, 📖, 🕋)
   - "gradient": Dégradé CSS moderne adapté
   - "badge": "Prophète", "Invocation", "Pilier", ou "Foi"
   - "quizCategoryTarget": Catégorie de quiz correspondante
   - "estimatedMinutes": Durée estimée en minutes (environ 2.5 minutes par chapitre, ex: 8 pour 3 chapitres, 15 pour 6 chapitres)
   - Pour le format RÉCIT :
     * Découpe en une plage flexible de 3 à 6 chapitres chronologiques majeurs selon la richesse et la densité du sujet (ex: 3 chapitres pour un sujet ciblé, 4 à 6 chapitres pour les grands récits avec de nombreuses étapes comme Moussa, Ibrahim, Youssef ou Muhammad ﷺ).
     * Pour chaque chapitre :
       - "id": kebab-case descriptif (ex: "moussa-naissance", "moussa-madian", "moussa-sinai", "moussa-pharaon", "moussa-exode")
       - "label": Libellé très court (1 à 3 mots max) pour le rail de navigation (ex: "La naissance", "Madian", "Le Sinaï", "L'Exode")
       - "title": Titre complet et évocateur du chapitre
       - "blocks": 2 blocs narratifs { type: 'text', value: '...' } concis et percutants (60 à 80 mots par paragraphe) et 1 bloc source { type: 'source', ref: { kind: 'quran', surah: N, ayah: N }, note: '...' }
       - "glossary": EXACTEMENT 2 termes clés avec 'term', 'definition', 'arabic'
       - "checkpoint": 1 QCM avec 'question', 'options' (4 choix), 'correctIndex' (0-3), 'explanation'
   - Pour le format FICHE :
     * Découpe en 3 à 6 sections thématiques avec 'id', 'heading', 'blocks', 'glossary'.
   - Langue : Français soigné, accessible et synthétique.`;

  const prompt = `SOURCES SCRIPTURAIRES DE RÉFÉRENCE (RAG) :
${ragContext}

DEMANDE :
- Sujet : "${subject}"
- Catégorie : "${category}"
- Format souhaité : "${format}"

Génère l'objet JSON complet selon le format de référence NoorQuiz demandé (découpe chronologique naturelle entre 3 et 6 chapitres selon la densité du sujet).`;

  // 3. Génération Gemini en mode JSON
  const model = genAI.getGenerativeModel({
    model: GEMINI_MODEL,
    systemInstruction,
    generationConfig: {
      temperature: 0.3,
      responseMimeType: 'application/json',
    },
  });

  const responseText = await withRetry(async () => {
    const result = await model.generateContent(prompt);
    return result.response.text();
  });

  let draft;
  const cleaned = cleanJsonString(responseText);
  try {
    draft = JSON.parse(cleaned);
  } catch (parseErr) {
    console.error(`❌ [Content Generator Agent] Erreur JSON (${responseText?.length || 0} car.) :`, parseErr.message);
    throw new Error(`La réponse générée par l'IA est invalide ou tronquée. Veuillez relancer la génération.`);
  }

  if (draft.is_valid === false) {
    const msg = draft.rejection_reason || `Le sujet "${subject}" est en dehors du périmètre islamique de NoorQuiz.`;
    console.warn(`⚠️ [Content Generator Agent] Sujet rejeté (hors-périmètre) : "${subject}" — ${msg}`);
    const err = new Error(msg);
    err.statusCode = 400;
    throw err;
  }

  // Normalisation des champs principaux
  draft.id = draft.id || subject.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  draft.title = draft.title || subject;
  draft.subtitle = draft.subtitle || '';
  draft.category = draft.category || category;
  draft.format = draft.format || format;
  draft.icon = draft.icon || (category === 'prophetes' ? '🌿' : category === 'duas' ? '🤲' : '📖');
  draft.gradient = draft.gradient || (
    category === 'prophetes'
      ? 'linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)'
      : category === 'duas'
      ? 'linear-gradient(135deg, #0284c7 0%, #38bdf8 100%)'
      : 'linear-gradient(135deg, #059669 0%, #10b981 100%)'
  );
  draft.badge = draft.badge || (category === 'prophetes' ? 'Prophète' : category === 'duas' ? 'Invocation' : 'Apprentissage');
  draft.quizCategoryTarget = draft.quizCategoryTarget || (category === 'prophetes' ? 'Prophètes' : undefined);
  draft.revision = draft.revision || 1;
  draft.order = draft.order || 999;
  draft.published = true;

  // Normalisation des chapitres
  if (draft.chapters && Array.isArray(draft.chapters)) {
    draft.chapters = draft.chapters.map((ch, i) => {
      const chapterId = ch.id || `${draft.id}-ch${i + 1}`;
      const label = ch.label || ch.title?.replace(/^Chapitre\s+\d+\s*[-—:]\s*/i, '') || `Chapitre ${i + 1}`;
      const title = ch.title || `Chapitre ${i + 1} — ${label}`;

      // Blocs
      let blocks = [];
      if (Array.isArray(ch.blocks) && ch.blocks.length > 0) {
        blocks = ch.blocks;
      } else if (Array.isArray(ch.paragraphs)) {
        ch.paragraphs.forEach(p => {
          if (p && typeof p === 'string') blocks.push({ type: 'text', value: p });
        });
        if (Array.isArray(ch.versets)) {
          ch.versets.forEach(v => {
            if (v?.ref) {
              const m = v.ref.match(/(\d+)[:\.](\d+)/);
              if (m) {
                blocks.push({
                  type: 'source',
                  ref: { kind: 'quran', surah: parseInt(m[1], 10), ayah: parseInt(m[2], 10) },
                  note: v.content || v.ref,
                });
              } else {
                blocks.push({ type: 'text', value: `📖 ${v.ref} : ${v.content || ''}` });
              }
            }
          });
        }
      }

      // Glossaire
      const rawGlossary = ch.glossary || ch.glossaire || [];
      const glossary = Array.isArray(rawGlossary)
        ? rawGlossary.map(g => ({
            term: g.term || g.terme || '',
            definition: g.definition || '',
            arabic: g.arabic || g.arabe || '',
          })).filter(g => g.term && g.definition)
        : [];

      // Checkpoint
      let checkpoint = null;
      if (ch.checkpoint && ch.checkpoint.question) {
        checkpoint = {
          question: ch.checkpoint.question,
          options: Array.isArray(ch.checkpoint.options) ? ch.checkpoint.options : [],
          correctIndex: typeof ch.checkpoint.correctIndex === 'number'
            ? ch.checkpoint.correctIndex
            : (typeof ch.checkpoint.answer === 'number' ? ch.checkpoint.answer : 0),
          explanation: ch.checkpoint.explanation || ch.checkpoint.explication || '',
        };
      }

      return {
        id: chapterId,
        label,
        title,
        blocks: blocks.length > 0 ? blocks : [{ type: 'text', value: draft.summary || '' }],
        glossary,
        checkpoint,
      };
    });
  }

  // Normalisation des sections (format fiche)
  if (draft.sections && Array.isArray(draft.sections)) {
    draft.sections = draft.sections.map((s, idx) => {
      let blocks = [];
      if (Array.isArray(s.blocks) && s.blocks.length > 0) {
        blocks = s.blocks;
      } else if (s.body) {
        blocks.push({ type: 'text', value: s.body });
      }
      return {
        id: s.id || `${draft.id}-sec${idx + 1}`,
        heading: s.heading || `Section ${idx + 1}`,
        blocks: blocks.length > 0 ? blocks : [{ type: 'text', value: '' }],
        glossary: s.glossary || s.glossaire || [],
      };
    });
  }

  draft.estimatedMinutes = draft.estimatedMinutes || (
    draft.chapters?.length ? Math.max(5, Math.round(draft.chapters.length * 2.5)) : 8
  );

  if (!draft.summary) {
    const firstBlockText = draft.chapters?.[0]?.blocks?.find(b => b.type === 'text')?.value;
    draft.summary = firstBlockText ? (firstBlockText.slice(0, 160) + '...') : '';
  }

  const nbParts = draft.chapters?.length || draft.sections?.length || 0;
  console.log(`✅ [Content Generator Agent] Brouillon généré : "${draft.title}" — ${nbParts} partie(s) (${draft.estimatedMinutes} min).`);

  return draft;
}
