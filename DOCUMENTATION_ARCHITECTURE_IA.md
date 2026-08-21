# 📘 Guide & Architecture Technique : RAG, Modèles LLM & Systèmes Agentiques

Ce document constitue la documentation technique complète sur le fonctionnement de l'IA dans l'application **Quiz Intelligent**. Il détaille les principes théoriques du **RAG (Retrieval-Augmented Generation)**, les **modèles de langage (LLM)** et l'**architecture multi-agents** mise en œuvre.

---

## 📑 Table des Matières
1. [Vue d'Ensemble de l'Architecture](#1-vue-densemble-de-larchitecture)
2. [Le RAG (Retrieval-Augmented Generation)](#2-le-rag-retrieval-augmented-generation)
3. [Les Modèles de Langage (LLM - Gemini API)](#3-les-modèles-de-langage-llm---gemini-api)
4. [L'Architecture Multi-Agents](#4-larchitecture-multi-agents)
5. [Le Pipeline Agentique du Quiz Agent](#5-le-pipeline-agentique-du-quiz-agent)
6. [Gestion de la Mémoire & Déduplication (Redis)](#6-gestion-de-la-mémoire--déduplication-redis)
7. [Schéma Global de Flux de Données](#7-schéma-global-de-flux-de-données)

---

## 1. Vue d'Ensemble de l'Architecture

L'application combine une interface moderne (**React / TypeScript / Vite**) avec un backend puissant (**Node.js / Express**) articulé autour de trois piliers IA :

```
┌────────────────────────────────────────────────────────────────────────┐
│                          APPLICATIONS CLIENTS                          │
│                    React Frontend (Quiz & Assistant)                   │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ HTTP / REST
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                             BACKEND EXPRESS                            │
│                                                                        │
│  ┌─────────────────────────┐            ┌───────────────────────────┐  │
│  │     Assistant Agent     │            │        Quiz Agent         │  │
│  │ (Chat & Orchestration)  │            │  (Pipeline Multi-Étapes)  │  │
│  └────────────┬────────────┘            └─────────────┬─────────────┘  │
│               │                                       │                │
│               ├───────────────────┐                   │                │
│               ▼                   ▼                   ▼                │
│    ┌──────────────────┐  ┌──────────────────┐  ┌────────────────────┐ │
│    │ Function Calling │  │   Session Redis  │  │    RAG Service     │ │
│    │ (Tools Execution)│  │ (Mémoire & Cache)│  │ (Ancrage Sources)  │ │
│    └──────────────────┘  └──────────────────┘  └────────────────────┘ │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Le RAG (Retrieval-Augmented Generation)

### 💡 Qu'est-ce que le RAG ?
Le **RAG** est une technique qui consiste à **enrichir le prompt d'un LLM avec des données externes authentiques** avant qu'il ne génère sa réponse.

#### 📖 L'Analogie de l'Élève
* **Sans RAG** : L'élève passe un examen en s'appuyant uniquement sur sa mémoire globale. Il peut hésiter, déformer un détail ou inventer une donnée plausible (*hallucination*).
* **Avec RAG** : On pose le livre de référence ouvert à la bonne page sur la table de l'élève. Il rédige sa réponse en consultant directement la source authentique.

---

### ⚙️ Fonctionnement du `ragService.js`

Le service RAG fonctionne selon une stratégie à **3 niveaux de recherche** :

```
[ Demande de Thème ]
         │
         ▼
 ┌───────────────┐  Oui  ┌───────────────────────────────────┐
 │ Thème =       ├──────►│ Contexte Général Multi-Catégories │
 │ "Mélange" ?   │       └───────────────────────────────────┘
 └───────┬───────┘
         │ Non
         ▼
 ┌───────────────┐  Oui  ┌───────────────────────────────────┐
 │ Présent dans  ├──────►│ Base Locale d'Élite               │
 │ Base Locale ? │       │ (ISLAMIC_KNOWLEDGE_BASE)          │
 └───────┬───────┘       └───────────────────────────────────┘
         │ Non
         ▼
 ┌───────────────────────────────────┐
 │ API REST (api.alquran.cloud)      │
 │ Recherche de versets en temps réel│
 └───────────────────────────────────┘
```

1. **Niveau 1 : Base Locale d'Élite (`ISLAMIC_KNOWLEDGE_BASE`)**
   * Contient des versets et Hadiths structurés pour les thèmes principaux (*Piliers de l'Islam, Coran, Prophètes, Histoire, Pratiques*).
   * **Avantage** : Temps de réponse ultrarapide (< 1ms), zéro dépendance réseau.

2. **Niveau 2 : API REST Externe (`api.alquran.cloud`)**
   * Si le thème est spécifique ou personnalisé (ex: *"La patience"*), le service interroge l'API de recherche du Coran en temps réel.
   * **Avantage** : Extensibilité à l'infini sur des sujets précis.

3. **Niveau 3 : Fallback Général**
   * Si aucune source précise n'est trouvée ou en cas de timeout réseau, un contexte de secours sécurisé garantit la continuité de service.

---

## 3. Les Modèles de Langage (LLM - Gemini API)

L'application utilise le modèle **Google Gemini** pour deux tâches principales : la génération créative et le raisonnement logique.

### 🎯 Structured Output (Schémas JSON Stricts)
Pour éviter qu'une IA ne renvoie du texte libre difficile à analyser par le code, nous imposons un **JSON Schema** strict (`QUESTION_SCHEMA`) :

```javascript
const QUESTION_SCHEMA = {
  type: SchemaType.ARRAY,
  items: {
    type: SchemaType.OBJECT,
    properties: {
      id: { type: SchemaType.INTEGER },
      text: { type: SchemaType.STRING },
      options: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
      correctAnswerIndex: { type: SchemaType.INTEGER },
      explanation: { type: SchemaType.STRING },
      difficulty: { type: SchemaType.STRING },
      category: { type: SchemaType.STRING },
    },
    required: ['text', 'options', 'correctAnswerIndex', 'explanation'],
  },
};
```
* **Résultat** : L'API garantit un format JSON parfait directement injectable dans le Frontend React.

---

### 🔧 Function Calling (Appel d'Outils)
Dans l'**Assistant Agent**, Gemini ne fait pas que répondre à du texte : il peut **décider de déclencher des fonctions backend** :
* `generate_quiz_question` : Déclenché automatiquement quand l'utilisateur veut jouer à un quiz.
* `calculate_zakat` : Déclenché quand l'utilisateur fournit un montant pour calculer la Zakat.

---

## 4. L'Architecture Multi-Agents

Au lieu d'avoir un seul prompt gigantesque, l'application découpe les responsabilités entre **agents spécialisés** :

| Agent | Fichier Source | Rôle Principal |
| :--- | :--- | :--- |
| **Assistant Agent** | `assistantAgent.js` | Agent conversationnel, gestion du périmètre, mémoire de chat, invocation d'outils. |
| **Quiz Agent** | `quizAgent.js` | Orchestrateur de création de quiz, gestion des étapes RAG + Prompting. |
| **Player Profile Agent** | `playerProfileService.js` | Évaluation adaptative du niveau du joueur selon ses réussites/échecs. |
| **Reflection Agent** | `quizAgent.js` (Étape 4) | Agent de révision et d'auto-correction de la qualité des questions. |

---

## 5. Le Pipeline Agentique du Quiz Agent

Lors de la génération d'un quiz, le `quizAgent` exécute un **pipeline autonome en 6 étapes** :

```
 ┌────────────────────────────────────────────────────────┐
 │ 1. Résolution de Difficulté (Player Profile Agent)    │
 └───────────────────────────┬────────────────────────────┘
                             ▼
 ┌────────────────────────────────────────────────────────┐
 │ 2. Injection du Contexte RAG (ragService)             │
 └───────────────────────────┬────────────────────────────┘
                             ▼
 ┌────────────────────────────────────────────────────────┐
 │ 3. Génération du Draft de Questions (Gemini LLM)       │
 └───────────────────────────┬────────────────────────────┘
                             ▼
 ┌────────────────────────────────────────────────────────┐
 │ 4. Déduplication Sémantique & Conceptuelle (Redis)     │
 └───────────────────────────┬────────────────────────────┘
                             ▼
 ┌────────────────────────────────────────────────────────┐
 │ 5. Auto-Vérification & Révision (Reflection Agent)     │
 └───────────────────────────┬────────────────────────────┘
                             ▼
 ┌────────────────────────────────────────────────────────┐
 │ 6. Caching & Restitution Frontend                      │
 └────────────────────────────────────────────────────────┘
```

### Détail des Étapes Clés :

* **Étape 2 (RAG)** : Récupération des versets authentiques liés au thème.
* **Étape 3 (Draft)** : Gemini rédige les questions en combinant le contexte RAG et l'historique d'interdiction Redis.
* **Étape 4 (Déduplication)** : Un algorithme compare le texte et les bonnes réponses avec les 25 dernières questions vues par le joueur pour éliminer les doublons conceptuels.
* **Étape 5 (Reflection Agent)** : L'IA relit le lot de questions généré avec une posture d'expert réviseur pour vérifier que la réponse exacte (`correctAnswerIndex`) est sans ambiguïté.

---

## 6. Gestion de la Mémoire & Déduplication (Redis)

Pour garantir une expérience utilisateur fluide sans redondance, **Redis** est utilisé comme mémoire rapide de session :

1. **Mémoire de Conversation** : Stocke l'historique des échanges avec l'Assistant Agent pour maintenir le contexte.
2. **Mémoire de Quiz (`seenQuestions`)** : Stocke les IDs et textes des questions déjà posées au joueur.
3. **Pool de Secours (`quizCacheService`)** : Conserve un stock de questions validées prêtes à servir en cas de lenteur réseau.

---

## 7. Schéma Global de Flux de Données

```
[ Utilisateur ]
      │
      │ 1. Demande : "Génère un quiz sur le Coran"
      ▼
[ Express Router ] ──► [ Quiz Agent ]
                           │
                           ├─► 2. [ Player Profile ]  ──► Détermine le niveau
                           │
                           ├─► 3. [ RAG Service ]     ──► Extrait les versets (Coran 17:88, etc.)
                           │
                           ├─► 4. [ Redis Memory ]    ──► Récupère les questions vues
                           │
                           ├─► 5. [ Gemini LLM ]      ──► Rédige le draft JSON
                           │
                           ├─► 6. [ Deduplication ]   ──► Filtre les doublons
                           │
                           ├─► 7. [ Reflection Agent] ──► Auto-vérifie l'exactitude
                           │
                           └─► 8. [ Response ]        ──► Envoie les 6 QCM au Frontend
```

---

## 📌 Résumé des Points Forts à Mettre en Avant

* **Fiabilité (Anti-Hallucination)** : Grâce au RAG Service qui fournit des références exactes.
* **Qualité & Rigueur** : Grâce à l'Agent de Réflexion qui relit et valide les questions.
* **Expérience Sans Doublons** : Grâce à la mémoire Redis et la déduplication sémantique.
* **Architecture Propre** : Séparation claire entre Assistant Chat, Quiz Agent et Services de Données.
