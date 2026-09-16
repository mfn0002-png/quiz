/**
 * WidgetFloatingAssistant.tsx — Bouton flottant + panneau du widget NoorQuiz
 *
 * Version standalone de FloatingAssistant.tsx SANS react-router-dom.
 * - Aucun useLocation / useNavigate
 * - Bouton "plein écran" remplacé par lien "Propulsé par NoorQuiz"
 * - apiUrl configurable par prop
 */

import { useState } from 'react';
import { Bot, Sparkles, X, Maximize2, Minimize2 } from 'lucide-react';
import { Assistant } from '../components/Assistant';

interface WidgetFloatingAssistantProps {
  apiUrl: string;
  noorquizUrl?: string; // URL du site NoorQuiz (pour le lien "Propulsé par")
}

export function WidgetFloatingAssistant({
  apiUrl,
  noorquizUrl = 'https://noorquiz.com',
}: WidgetFloatingAssistantProps) {
  const [isOpen, setIsOpen]         = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <>
      {/* ── Bouton flottant ─────────────────────────────────────────── */}
      {!isOpen && (
        <button
          className="noor-fab"
          onClick={() => setIsOpen(true)}
          title="Poser une question à l'Assistant Islamique IA"
          aria-label="Ouvrir l'Assistant Islamique NoorQuiz"
          id="noor-widget-fab"
        >
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <Bot size={20} />
            <Sparkles
              size={11}
              style={{
                position: 'absolute',
                top: -4, right: -4,
                color: '#fef08a',
                animation: 'noor-spin-slow 4s linear infinite',
              }}
            />
          </div>
          <span style={{ fontWeight: 700, fontSize: '0.92rem' }}>
            Assistant IA
          </span>
        </button>
      )}

      {/* ── Panneau flottant ─────────────────────────────────────────── */}
      {isOpen && (
        <div
          className="noor-panel"
          id="noor-widget-panel"
          style={{
            width:  isExpanded ? '680px' : '420px',
            height: isExpanded ? '780px' : '580px',
          }}
        >
          {/* En-tête */}
          <div className="noor-panel-header">
            <div className="noor-panel-header-left">
              {/* Avatar */}
              <div className="noor-avatar">
                <Bot size={18} />
              </div>

              {/* Titre + statut */}
              <div>
                <h3 className="noor-panel-title">Assistant Islamique</h3>
                <div className="noor-panel-status">
                  <div className="noor-status-dot" />
                  En ligne &amp; prêt à vous guider
                </div>
              </div>
            </div>

            <div className="noor-panel-actions">
              {/* Lien "Propulsé par NoorQuiz" (remplace le bouton plein écran) */}
              <a
                href={noorquizUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="noor-powered-link"
                title="Accéder à NoorQuiz — Quiz Islamique"
              >
                ✨ NoorQuiz
              </a>

              {/* Bouton agrandir / réduire */}
              <button
                className="noor-icon-btn"
                onClick={() => setIsExpanded(!isExpanded)}
                title={isExpanded ? 'Réduire la fenêtre' : 'Agrandir la fenêtre'}
                aria-label={isExpanded ? 'Réduire' : 'Agrandir'}
              >
                {isExpanded ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
              </button>

              {/* Bouton fermer */}
              <button
                className="noor-icon-btn"
                onClick={() => setIsOpen(false)}
                title="Fermer l'assistant"
                aria-label="Fermer l'assistant"
              >
                <X size={17} />
              </button>
            </div>
          </div>

          {/* Corps : composant assistant */}
          <div className="noor-panel-body">
            <Assistant
              apiUrl={apiUrl}
              isCompact={!isExpanded}
            />
          </div>
        </div>
      )}
    </>
  );
}
