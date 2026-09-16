/**
 * vite.widget.config.ts — Configuration Vite dédiée au build du widget NoorQuiz
 *
 * Compile src/widget/widget-entry.tsx en un bundle IIFE standalone :
 * - Format : IIFE (Immediately Invoked Function Expression) — aucune dépendance externe
 * - Output : dist/widget.js (fichier unique, tout inclus : React, styles, icônes)
 * - CSS : injecté automatiquement dans le bundle JS via injectCSS
 * - Minification : activée
 *
 * Usage :
 *   npm run build:widget
 */

import { defineConfig, Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import type { OutputBundle, OutputChunk, OutputAsset } from 'rollup';

// Plugin maison pour injecter le CSS dans le bundle JS (évite un fichier .css séparé)
function injectCSSPlugin(): Plugin {
  let cssContent = '';
  return {
    name: 'inject-css-into-js',
    apply: 'build',
    generateBundle(_opts, bundle: OutputBundle) {
      // Extraire et supprimer les chunks CSS du bundle
      for (const [fileName, chunk] of Object.entries(bundle)) {
        if (fileName.endsWith('.css')) {
          const asset = chunk as OutputAsset;
          if (typeof asset.source === 'string') {
            cssContent = asset.source;
          }
          delete bundle[fileName];
        }
      }
      // Injecter le CSS dans le bundle JS principal
      if (cssContent) {
        for (const chunk of Object.values(bundle)) {
          const jsChunk = chunk as OutputChunk;
          if (jsChunk.type === 'chunk' && jsChunk.fileName.endsWith('.js')) {
            const injection = `(function(){var s=document.createElement('style');s.textContent=${JSON.stringify(cssContent)};document.head.appendChild(s);})();`;
            jsChunk.code = injection + jsChunk.code;
            break;
          }
        }
      }
    },
  };
}

export default defineConfig({
  plugins: [react(), injectCSSPlugin()],

  build: {
    // Dossier de sortie séparé pour ne pas écraser le build principal
    outDir: 'dist-widget',
    emptyOutDir: true,

    lib: {
      // Point d'entrée du widget
      entry: resolve(__dirname, 'src/widget/widget-entry.tsx'),

      // Nom de la variable globale exposée (window.NoorWidget)
      name: 'NoorWidget',

      // Format IIFE : s'auto-exécute, ne requiert aucun bundler côté site hôte
      formats: ['iife'],

      // Nom du fichier de sortie
      fileName: () => 'widget.js',
    },

    rollupOptions: {
      // Aucune dépendance externalisée — tout est bundlé dans widget.js
      external: [],

      output: {
        // Pas de code splitting — un seul fichier widget.js
        inlineDynamicImports: true,
      },
    },

    // Minification agressive pour réduire la taille
    minify: 'terser',

    // Sourcemap en mode développement uniquement
    sourcemap: false,

    // Taille d'avertissement plus haute (React bundle)
    chunkSizeWarningLimit: 600,
  },

  // Remplacement des variables d'environnement dans le bundle IIFE
  // (process.env n'existe pas dans un navigateur standard)
  define: {
    'process.env.NODE_ENV': JSON.stringify('production'),
    'import.meta.env.VITE_API_BASE_URL': JSON.stringify(''),
    'import.meta.env.MODE': JSON.stringify('production'),
    'import.meta.env.DEV': JSON.stringify(false),
    'import.meta.env.PROD': JSON.stringify(true),
    'import.meta.env.SSR': JSON.stringify(false),
  },

  // Injection du CSS dans le JS (évite un fichier .css séparé)
  css: {
    // Le CSS sera inclus dans le bundle JS via un <style> injecté dynamiquement
    modules: { scopeBehaviour: 'local' },
  },
});
