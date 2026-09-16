/**
 * widget-entry.tsx — Point d'entrée du widget NoorQuiz
 *
 * Ce fichier est compilé en bundle IIFE autonome (widget.js).
 * Il s'auto-exécute au chargement et monte le widget dans un div
 * créé dynamiquement dans le DOM du site hôte.
 *
 * Configuration via attributs data-* sur la balise <script> :
 *   data-api-url   : URL du backend NoorQuiz (requis)
 *   data-noorquiz-url : URL du site NoorQuiz (optionnel)
 *   data-theme     : "dark" | "light" (optionnel, "dark" par défaut)
 *
 * Usage :
 *   <script src="https://noorquiz.com/widget.js"
 *           data-api-url="https://mon-backend.com"
 *           data-theme="dark">
 *   </script>
 */

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './widget.css';
import { WidgetFloatingAssistant } from './WidgetFloatingAssistant';

// ─── Lecture de la configuration depuis la balise <script> ────────────────────

function getScriptConfig() {
  // Cherche la balise script qui a chargé ce fichier
  // Priorité : script[data-api-url], sinon le dernier script du DOM
  const scripts = document.querySelectorAll('script[data-api-url], script[src*="widget"]');
  const scriptEl = scripts[scripts.length - 1] as HTMLScriptElement | null;

  const apiUrl      = scriptEl?.getAttribute('data-api-url')      || 'http://localhost:5005/api';
  const noorquizUrl = scriptEl?.getAttribute('data-noorquiz-url') || 'https://noorquiz.com';
  const theme       = scriptEl?.getAttribute('data-theme')         || 'dark';

  return { apiUrl, noorquizUrl, theme };
}

// ─── Création du conteneur isolé dans le DOM du site hôte ────────────────────

function createWidgetContainer(): HTMLElement {
  // Évite de monter deux fois si le script est chargé plusieurs fois
  const existing = document.getElementById('noor-widget-root');
  if (existing) return existing;

  const container = document.createElement('div');
  container.id = 'noor-widget-root';
  document.body.appendChild(container);
  return container;
}

// ─── Application du thème sur le conteneur ───────────────────────────────────

function applyTheme(container: HTMLElement, theme: string) {
  if (theme === 'light') {
    // Surcharge les variables pour le mode clair
    container.style.setProperty('--noor-bg',      '#ffffff');
    container.style.setProperty('--noor-surface',  '#f8fafc');
    container.style.setProperty('--noor-surface-sub', '#f1f5f9');
    container.style.setProperty('--noor-text',     '#0f172a');
    container.style.setProperty('--noor-text-sub', '#475569');
    container.style.setProperty('--noor-border',   'rgba(15, 23, 42, 0.08)');
  }
  // Mode dark : les valeurs par défaut du CSS sont déjà en mode dark
}

// ─── Montage du widget ────────────────────────────────────────────────────────

function mountWidget() {
  const { apiUrl, noorquizUrl, theme } = getScriptConfig();
  const container = createWidgetContainer();

  applyTheme(container, theme);

  const root = createRoot(container);
  root.render(
    <StrictMode>
      <WidgetFloatingAssistant
        apiUrl={apiUrl}
        noorquizUrl={noorquizUrl}
      />
    </StrictMode>
  );
}

// ─── Auto-exécution ──────────────────────────────────────────────────────────

if (document.readyState === 'loading') {
  // DOM pas encore prêt : attendre
  document.addEventListener('DOMContentLoaded', mountWidget);
} else {
  // DOM déjà prêt (script chargé en defer ou en bas de page)
  mountWidget();
}
