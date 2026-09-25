import { Cpu } from 'lucide-react';

interface AiModelSectionProps {
  ragModel: string;
  setRagModel: (val: string) => void;
  embeddingModel: string;
  setEmbeddingModel: (val: string) => void;
  topK: number;
  setTopK: (val: number) => void;
  minSimilarityScore: number;
  setMinSimilarityScore: (val: number) => void;
}

export const AiModelSection = ({
  ragModel,
  setRagModel,
  embeddingModel,
  setEmbeddingModel,
  topK,
  setTopK,
  minSimilarityScore,
  setMinSimilarityScore,
}: AiModelSectionProps) => {
  return (
    <section className="admin-section">
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.25rem' }}>
        <Cpu size={19} style={{ color: 'var(--primary-color)' }} />
        <h2 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>
          Intelligence Artificielle &amp; Modèle Gemini
        </h2>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.25rem' }}>
        <div>
          <label className="form-label">Modèle LLM Gemini :</label>
          <select className="form-select" value={ragModel} onChange={(e) => setRagModel(e.target.value)}>
            <option value="gemini-flash-lite-latest">Gemini 1.5 Flash Lite (Ultra-rapide et économique)</option>
            <option value="gemini-1.5-flash">Gemini 1.5 Flash (Standard et équilibré)</option>
            <option value="gemini-1.5-pro">Gemini 1.5 Pro (Haute précision)</option>
          </select>
        </div>
        <div>
          <label className="form-label">Modèle d'Embedding Vectoriel :</label>
          <select className="form-select" value={embeddingModel} onChange={(e) => setEmbeddingModel(e.target.value)}>
            <option value="text-embedding-004">text-embedding-004 (768 dim. - Recommandé)</option>
            <option value="gemini-embedding-001">gemini-embedding-001</option>
          </select>
        </div>
        <div>
          <label className="form-label">Nombre d'extraits documentaires (Top K) :</label>
          <select className="form-select" value={topK} onChange={(e) => setTopK(Number(e.target.value))}>
            <option value={3}>3 extraits (Recommandé)</option>
            <option value={5}>5 extraits (Contexte étendu)</option>
            <option value={10}>10 extraits (Analyse approfondie)</option>
          </select>
        </div>
        <div>
          <label className="form-label">
            Seuil minimal de similarité : {Math.round(minSimilarityScore * 100)}%
          </label>
          <input
            type="range"
            min="0.30"
            max="0.80"
            step="0.05"
            value={minSimilarityScore}
            onChange={(e) => setMinSimilarityScore(parseFloat(e.target.value))}
            style={{ width: '100%', accentColor: 'var(--primary-color)', cursor: 'pointer', marginTop: '0.4rem' }}
          />
        </div>
      </div>
    </section>
  );
};
