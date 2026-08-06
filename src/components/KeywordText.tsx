import { useState, useRef } from 'react';
import { Keyword } from '../services/geminiService';

interface KeywordTextProps {
  text: string;
  keywords: Keyword[];
}

export function KeywordText({ text, keywords }: KeywordTextProps) {
  const [activeKeyword, setActiveKeyword] = useState<Keyword | null>(null);
  const [popupPosition, setPopupPosition] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  if (!keywords.length) {
    return <span>{text}</span>;
  }

  // Build a regex that matches any of the keywords (case insensitive)
  const escapedTerms = keywords.map(k => k.term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const pattern = new RegExp(`(${escapedTerms.join('|')})`, 'gi');

  // Split text into parts: normal text and keyword matches
  const parts = text.split(pattern);

  const handleKeywordClick = (kw: Keyword, e: React.MouseEvent<HTMLSpanElement>) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    const containerRect = containerRef.current?.getBoundingClientRect();
    setPopupPosition({
      x: rect.left - (containerRect?.left || 0),
      y: rect.bottom - (containerRect?.top || 0) + 8,
    });
    setActiveKeyword(prev => prev?.term === kw.term ? null : kw);
  };

  return (
    <div ref={containerRef} style={{ position: 'relative', lineHeight: 1.8 }} onClick={() => setActiveKeyword(null)}>
      {parts.map((part, index) => {
        const match = keywords.find(k => k.term.toLowerCase() === part.toLowerCase());
        if (match) {
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

      {/* Floating Popup */}
      {activeKeyword && (
        <div
          style={{
            position: 'absolute',
            left: `${popupPosition.x}px`,
            top: `${popupPosition.y}px`,
            backgroundColor: 'var(--surface-color, #fff)',
            border: '1px solid var(--primary-color, #059669)',
            borderRadius: '10px',
            padding: '1rem 1.25rem',
            boxShadow: '0 10px 30px rgba(0,0,0,0.15)',
            zIndex: 100,
            maxWidth: '320px',
            minWidth: '240px',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
            <span style={{ fontWeight: 700, color: 'var(--primary-color, #059669)', fontSize: '1.1rem' }}>
              {activeKeyword.term}
            </span>
            <button
              onClick={() => setActiveKeyword(null)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', lineHeight: 1, padding: '0 0 0 8px' }}
            >
              ✕
            </button>
          </div>
          <p style={{ margin: 0, fontSize: '0.95rem', color: 'var(--text-primary)', lineHeight: 1.6 }}>
            {activeKeyword.definition}
          </p>
        </div>
      )}
    </div>
  );
}
