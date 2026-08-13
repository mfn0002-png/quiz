import { useState, useRef } from 'react';
import { Keyword } from '../services/apiService';

interface KeywordTextProps {
  text: string;
  keywords: Keyword[];
  highlightPassage?: string | null;
}

export function KeywordText({ text, keywords, highlightPassage }: KeywordTextProps) {
  const [activeKeyword, setActiveKeyword] = useState<Keyword | null>(null);
  const [popupPosition, setPopupPosition] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  const handleKeywordClick = (kw: Keyword, e: React.MouseEvent<HTMLSpanElement>) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    const containerRect = containerRef.current?.getBoundingClientRect();
    setPopupPosition({
      x: rect.left - (containerRect?.left || 0),
      y: rect.bottom - (containerRect?.top || 0) + 8,
    });
    setActiveKeyword((prev: Keyword | null) => prev?.term === kw.term ? null : kw);
  };

  // Nettoyer les astérisques Markdown (** et *) pour éviter les étoiles brutes sur l'écran
  const cleanMarkdownStars = (str: string) => {
    if (!str) return '';
    return str
      .replace(/\*\*([^\*]+)\*\*/g, '$1')
      .replace(/\*([^\*]+)\*/g, '$1')
      .replace(/\*/g, '');
  };

  // Rendu du texte avec surlignement interactif des mots-clés
  const renderTextWithKeywords = (inputText: string) => {
    const sanitizedText = cleanMarkdownStars(inputText);

    if (!keywords || !keywords.length) return <span>{sanitizedText}</span>;

    const escapedTerms = keywords.map(k => k.term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    const pattern = new RegExp(`(${escapedTerms.join('|')})`, 'gi');
    const parts = sanitizedText.split(pattern);

    const highlightedTerms = new Set<string>();
    return (
      <>
        {parts.map((part, index) => {
          const match = keywords.find(k => k.term.toLowerCase() === part.toLowerCase());
          const termKey = match?.term.toLowerCase();
          if (match && termKey && !highlightedTerms.has(termKey)) {
            highlightedTerms.add(termKey);
            return (
              <span
                key={index}
                onClick={(e) => handleKeywordClick(match, e)}
                style={{
                  backgroundColor: 'rgba(5, 150, 105, 0.15)',
                  color: 'var(--primary-dark, #047857)',
                  borderBottom: '2px dashed var(--primary-color, #059669)',
                  cursor: 'pointer',
                  padding: '0 3px',
                  borderRadius: '3px',
                  fontWeight: 600,
                  transition: 'background-color 150ms',
                }}
                title={`Cliquez pour une définition de "${match.term}"`}
              >
                {part}
              </span>
            );
          }
          return <span key={index}>{part}</span>;
        })}
      </>
    );
  };

  // Rendu ligne par ligne des blocs Markdown (###, ---, puces)
  const renderFullMarkdownText = (rawText: string) => {
    const lines = rawText.split('\n');

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
        {lines.map((line, lIdx) => {
          const trimmed = line.trim();

          // 1. Règle horizontale (--- ou ***)
          if (trimmed === '---' || trimmed === '***' || trimmed === '___') {
            return (
              <hr
                key={lIdx}
                style={{
                  border: 'none',
                  borderTop: '1px solid rgba(255, 255, 255, 0.12)',
                  margin: '0.6rem 0',
                }}
              />
            );
          }

          // 2. Titres Markdown (###, ##, #)
          const headingMatch = trimmed.match(/^(#{1,6})\s+(.*)$/);
          if (headingMatch) {
            const level = headingMatch[1].length;
            const titleContent = headingMatch[2];
            const fontSize = level === 1 ? '1.25rem' : level === 2 ? '1.1rem' : '1rem';

            return (
              <div
                key={lIdx}
                style={{
                  fontWeight: 700,
                  fontSize,
                  marginTop: '0.5rem',
                  marginBottom: '0.2rem',
                  color: 'var(--text-primary)',
                }}
              >
                {renderTextWithKeywords(titleContent)}
              </div>
            );
          }

          // 3. Puces de liste (* item ou - item)
          const bulletMatch = trimmed.match(/^([*\-])\s+(.*)$/);
          if (bulletMatch) {
            const itemContent = bulletMatch[2];
            return (
              <div key={lIdx} style={{ display: 'flex', gap: '0.5rem', marginLeft: '0.4rem' }}>
                <span style={{ color: 'var(--primary-color)', fontWeight: 'bold' }}>•</span>
                <div style={{ flex: 1 }}>{renderTextWithKeywords(itemContent)}</div>
              </div>
            );
          }

          // Ligne normale
          if (!trimmed) {
            return <div key={lIdx} style={{ height: '0.25rem' }} />;
          }

          return <div key={lIdx}>{renderTextWithKeywords(line)}</div>;
        })}
      </div>
    );
  };

  // Passage surligné si highlightPassage est actif
  if (highlightPassage && highlightPassage.trim().length > 0 && text.toLowerCase().includes(highlightPassage.trim().toLowerCase())) {
    const trimmedPassage = highlightPassage.trim();
    const passageRegex = new RegExp(`(${trimmedPassage.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const segments = text.split(passageRegex);

    return (
      <div ref={containerRef} style={{ position: 'relative', lineHeight: 1.8 }} onClick={() => setActiveKeyword(null)}>
        {segments.map((seg, idx) => {
          if (seg.toLowerCase() === trimmedPassage.toLowerCase()) {
            return (
              <mark
                key={idx}
                style={{
                  backgroundColor: 'rgba(16, 185, 129, 0.35)',
                  color: 'inherit',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  border: '1.5px solid var(--primary-color, #059669)',
                  boxShadow: '0 0 12px rgba(5, 150, 105, 0.4)',
                  transition: 'all 300ms ease-in-out',
                }}
              >
                {renderFullMarkdownText(seg)}
              </mark>
            );
          }
          return <span key={idx}>{renderFullMarkdownText(seg)}</span>;
        })}

        {/* Popup de définition */}
        {activeKeyword && (
          <div
            style={{
              position: 'absolute',
              top: `${popupPosition.y}px`,
              left: `${popupPosition.x}px`,
              backgroundColor: 'var(--surface-color, #1e293b)',
              color: 'var(--text-primary, #ffffff)',
              border: '1px solid var(--primary-color, #059669)',
              borderRadius: '8px',
              padding: '0.75rem 1rem',
              boxShadow: '0 10px 25px rgba(0,0,0,0.3)',
              zIndex: 100,
              maxWidth: '280px',
              fontSize: '0.875rem',
            }}
          >
            <div style={{ fontWeight: 700, color: 'var(--primary-color, #059669)', marginBottom: '0.25rem' }}>
              {activeKeyword.term}
            </div>
            <div>{activeKeyword.definition}</div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div ref={containerRef} style={{ position: 'relative', lineHeight: 1.8 }} onClick={() => setActiveKeyword(null)}>
      {renderFullMarkdownText(text)}

      {/* Popup de définition */}
      {activeKeyword && (
        <div
          style={{
            position: 'absolute',
            top: `${popupPosition.y}px`,
            left: `${popupPosition.x}px`,
            backgroundColor: 'var(--surface-color, #1e293b)',
            color: 'var(--text-primary, #ffffff)',
            border: '1px solid var(--primary-color, #059669)',
            borderRadius: '8px',
            padding: '0.75rem 1rem',
            boxShadow: '0 10px 25px rgba(0,0,0,0.3)',
            zIndex: 100,
            maxWidth: '280px',
            fontSize: '0.875rem',
          }}
        >
          <div style={{ fontWeight: 700, color: 'var(--primary-color, #059669)', marginBottom: '0.25rem' }}>
            {activeKeyword.term}
          </div>
          <div>{activeKeyword.definition}</div>
        </div>
      )}
    </div>
  );
}
