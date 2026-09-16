# 🌐 Cours & Présentation Générale : Modèles LLM, RAG & Agents IA

> **Objectif** : Un guide complet et généraliste pour comprendre et présenter le fonctionnement de l'IA moderne (Modèles, RAG, Agents). Ce support utilise des concepts universels et s'appuie sur le projet **Quiz Intelligent** comme étude de cas réelle.

---

## 📑 Sommaire
1. [Les Modèles de Langage (LLM) : Fondements & Limites](#1-les-modèles-de-langage-llm--fondements--limites)
2. [Le RAG (Retrieval-Augmented Generation) : L'Ancrage Connaissances](#2-le-rag-retrieval-augmented-generation--lancrage-connaissances)
3. [Les Agents IA : De la Réponse Passive à l'Action Autonome](#3-les-agents-ia--de-la-réponse-passive-à-laction-autonome)
4. [Étude de Cas Concrète : Le Pipeline du Quiz Intelligent](#4-étude-de-cas-concrète--le-pipeline-du-quiz-intelligent)
5. [Trame de Présentation Slide-par-Slide (Support Oral)](#5-trame-de-présentation-slide-par-slide-support-oral)

---

## 1. Les Modèles de Langage (LLM) : Fondements & Limites

### 🧠 1.1 Qu'est-ce qu'un LLM (Large Language Model) ?
Un LLM (comme GPT-4, Gemini, Claude ou Llama) est un modèle statistique entraîné sur d'immenses volumes de textes (livres, articles, code).
* **Le principe fondamental** : Il prédit le **mot (ou token) suivant le plus probable** en fonction du contexte fourni.
* **Ses forces** : Compréhension du langage naturel, rédaction, traduction, synthèse, génération de code.

```
Input : "La capitale de la France est..." ──► [ LLM ] ──► Output : "Paris."
```

---

### ⚠️ 1.2 Les 3 Limites Majeures des LLM Purs

1. **Les Hallucinations** : Le modèle privilégie la fluidité du texte à la vérité stricte. S'il manque d'information, il peut "inventer" des faits avec beaucoup d'assurance.
2. **La Péremption des Données (Cutoff)** : Un modèle n'a accès qu'aux données sur lesquelles il a été entraîné. Il ne connaît pas les événements d'hier ou les bases privées d'une entreprise.
3. **L'Absence d'Action Directe** : De base, un LLM ne peut que générer du texte. Il ne peut pas interroger une base de données, envoyer un e-mail ou faire un calcul système tout seul.

> **💡 C'est pour résoudre ces 3 limites que l'on a inventé le RAG et les AGENTS IA.**

---

## 2. Le RAG (Retrieval-Augmented Generation) : L'Ancrage Connaissances

### 🔍 2.1 Qu'est-ce que le RAG ?
Le **RAG** est une architecture qui connecte un LLM à une **source de données externe (BDD, documents, API)** pour lui fournir l'information exacte au moment précis où il doit répondre.

```
                         ┌─────────────────────────────┐
                         │  Base de Connaissances /    │
                         │  Documents / API Externe    │
                         └──────────────┬──────────────┘
                                        │
                                        │ 1. Extraction (Retrieval)
                                        ▼
[ Question Utilisateur ] ──► [ Moteur RAG ] ──► [ Prompt Enrichi ] ──► [ LLM ] ──► [ Réponse Sourcée ]
```

---

### 📖 2.2 Les 3 Étapes Théoriques du RAG

1. **Retrieval (Recherche / Extraction)** : Quand l'utilisateur pose une question, le RAG cherche les documents ou extraits les plus pertinents dans une base de connaissances (par recherche sémantique / vectorielle ou API).
2. **Augmentation (Enrichissement)** : Le système insère ces extraits directement dans la consigne (prompt) envoyée au LLM :
   > *"Voici les documents officiels : [Extrait A, Extrait B]. En t'appuyant UNIQUEMENT sur ces documents, réponds à la question suivante : ..."*
3. **Generation (Génération)** : Le LLM rédige une réponse fluide, exacte et **garantie par les sources fournies**.

---

### 💡 2.3 Exemple d'Illustration (Projet Quiz)
* **Problème** : Si on demande au LLM d'inventer des questions sur un sujet pointu (ex: le Coran/Jurisprudence), il risque de mélanger les versets ou les numéros.
* **Solution RAG** : Le `ragService` va chercher le verset et numéro exact dans la base avant la génération. Le LLM ne fait que formuler la question à partir de ce texte réel ➔ **Résultat : 0 hallucination**.

---

## 3. Les Agents IA : De la Réponse Passive à l'Action Autonome

### 🤖 3.1 Différence entre un LLM classique et un Agent IA

| Caractéristique | LLM Classique (ex: Chatbot basique) | Agent IA |
| :--- | :--- | :--- |
| **Comportement** | Répond de manière passive à une question. | Exécute un objectif de manière autonome. |
| **Outillage** | Ne génère que du texte. | **Utilise des outils** (Base de données, API, scripts). |
| **Mémoire** | Oublie entre les sessions. | Garde une mémoire court/long terme (ex: Redis). |
| **Raisonnement** | Pas de vérification. | **Boucle d'auto-correction (Reflection)**. |

---

### ⚙️ 3.2 Le Cycle de Raisonnement d'un Agent (La Boucle ReAct / Agentique)

Un Agent IA fonctionne selon une boucle continue :

```
             ┌─────────────────────────┐
             │ 1. Perception / Context │
             └────────────┬────────────┘
                          ▼
             ┌─────────────────────────┐
             │ 2. Raisonnement (Thought)│
             └────────────┬────────────┘
                          ▼
             ┌─────────────────────────┐
             │ 3. Action / Outil (Tool)│
             └────────────┬────────────┘
                          ▼
             ┌─────────────────────────┐
             │ 4. Auto-Réflexion (Check)│
             └─────────────────────────┘
```

1. **Perception** : L'agent lit le besoin de l'utilisateur et l'état de la mémoire.
2. **Raisonnement** : L'agent décide de la stratégie (*"J'ai besoin de vérifier les doublons et d'extraire des versets avant de répondre"*).
3. **Action (Function Calling)** : L'agent déclenche un outil réel (ex: appel à `runQuizAgent` ou calcul mathématique).
4. **Auto-Réflexion (Reflection)** : L'agent relit son propre travail pour corriger les erreurs avant d'afficher le résultat.

---

## 4. Étude de Cas Concrète : Le Pipeline du Quiz Intelligent

Voici comment ces concepts théoriques sont appliqués ensemble dans une architecture réelle :

```
[ UTILISATEUR ] : "Crée-moi un quiz sur les Prophètes"
       │
       ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        AGENTS IA & PIPELINE RAG                        │
│                                                                        │
│ 1. Agent Profil ──► Détermine le niveau (ex: Débutant / Expert)        │
│                                                                        │
│ 2. RAG Service  ──► Recherche les textes authentiques (Base / API)     │
│                                                                        │
│ 3. LLM Gemini   ──► Rédige les questions au format JSON strict         │
│                                                                        │
│ 4. Mémoire Redis──► Filtre les questions déjà vues (Anti-doublons)      │
│                                                                        │
│ 5. Agent Reflection ─► Re-vérifie la précision des réponses (Self-Check)│
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
                        [ QUIZ PARFAIT & SOURCÉ ]
```

---

## 5. Trame de Présentation Slide-par-Slide (Support Oral)

Voici une structure claire pour présenter ce sujet oralement (Conférence, Soutenance, Présentation d'Équipe) :

---

### 🎬 Slide 1 : Titre & Introduction
* **Titre** : *Comprendre l'IA Générative : Des Modèles LLM aux Agents Autonomes & RAG*
* **Pitch** : Comment passer d'un simple générateur de texte à un système IA fiable, structuré et capable d'agir.

---

### 🧠 Slide 2 : Les LLM et leurs Limites
* **Le constat** : Les LLM sont brillants pour rédiger, mais souffrent d'hallucinations et n'ont pas accès aux données privées/réelles.
* **Le besoin** : Comment apporter de la vérité absolue et de l'autonomie à une IA ?

---

### 📖 Slide 3 : Le RAG (Retrieval-Augmented Generation)
* **Concept** : Donner "le livre ouvert" au modèle avant qu'il ne réponde.
* **Avantages** : Zéro hallucination, données fraîches, réponses vérifiables.
* **Exemple** : Injection de versets/textes réels avant la création de questions.

---

### 🤖 Slide 4 : Les Agents IA et l'Autonomie
* **Qu'est-ce qu'un Agent ?** Un LLM doté de bras (outils), d'un cerveau (raisonnement) et d'une mémoire (session).
* **Function Calling** : Capacité de l'IA à déclencher du code backend automatiquement.
* **Agent de Réflexion** : L'IA qui relit et auto-corrige son propre travail.

---

### 🏗️ Slide 5 : Étude de Cas (L'Architecture du Quiz)
* Démo du pipeline complet : RAG ➔ LLM ➔ Redis Anti-doublons ➔ Agent de Réflexion.
* **Résultat** : Un système robuste, dynamique et scalable.

---

### 🚀 Slide 6 : Conclusion & Avenir des Systèmes Agentiques
* L'avenir du développement logiciel réside dans l'**orchestration d'agents spécialisés** travaillant ensemble.
* Passer de la théorie à la pratique permet de construire des applications d'IA de niveau production.
