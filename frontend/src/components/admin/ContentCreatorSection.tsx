import { FormEvent } from 'react';
import { Plus, Sparkles, RefreshCw, Save } from 'lucide-react';

interface ContentCreatorSectionProps {
  formId: string;
  setFormId: (val: string) => void;
  formTitle: string;
  setFormTitle: (val: string) => void;
  formCategory: string;
  setFormCategory: (val: string) => void;
  formFormat: string;
  setFormFormat: (val: string) => void;
  formSummary: string;
  setFormSummary: (val: string) => void;
  formContentText: string;
  setFormContentText: (val: string) => void;
  generatingDraft: boolean;
  onGenerateAiDraft: () => void;
  onSubmitForm: (e: FormEvent) => void;
}

export const ContentCreatorSection = ({
  formId,
  setFormId,
  formTitle,
  setFormTitle,
  formCategory,
  setFormCategory,
  formFormat,
  setFormFormat,
  formSummary,
  setFormSummary,
  formContentText,
  setFormContentText,
  generatingDraft,
  onGenerateAiDraft,
  onSubmitForm,
}: ContentCreatorSectionProps) => {
  return (
    <section className="admin-section" style={{ marginBottom: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.25rem' }}>
        <Plus size={19} style={{ color: 'var(--primary-color)' }} />
        <h2 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>
          Ajouter un Nouveau Contenu (Prophète, Doua, Récit)
        </h2>
      </div>
      <p style={{ color: 'var(--text-secondary)', fontSize: '0.87rem', lineHeight: 1.6, marginBottom: '1.25rem' }}>
        Créez un nouveau sujet d'apprentissage dans Firestore. Après enregistrement, lancez la synchronisation RAG pour l'indexation dans Supabase.
      </p>

      <form onSubmit={onSubmitForm} style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
        {/* Bannière d'information en cours de génération */}
        {generatingDraft && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.85rem',
            padding: '0.9rem 1.2rem',
            backgroundColor: 'rgba(5, 150, 105, 0.09)',
            border: '1px solid rgba(5, 150, 105, 0.35)',
            borderRadius: 'var(--radius-lg)',
            color: 'var(--text-primary)',
          }}>
            <RefreshCw size={20} className="spin" style={{ color: 'var(--primary-color)', flexShrink: 0 }} />
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--primary-color)' }}>
                Génération IA en cours...
              </div>
              <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
                Recherche des sources authentiques (Coran &amp; Hadiths) et structuration des chapitres. Veuillez patienter quelques secondes sans relancer.
              </div>
            </div>
          </div>
        )}

        {/* Ligne 1 : ID, Catégorie, Format */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '1rem' }}>
          <div>
            <label className="form-label">ID Unique (ex: prophet_hud)</label>
            <input
              className="form-input"
              type="text"
              required
              value={formId}
              disabled={generatingDraft}
              onChange={(e) => setFormId(e.target.value)}
              placeholder="prophete_hud"
            />
          </div>
          <div>
            <label className="form-label">Catégorie</label>
            <select
              className="form-select"
              value={formCategory}
              disabled={generatingDraft}
              onChange={(e) => setFormCategory(e.target.value)}
            >
              <option value="prophetes">Prophètes (Histoire)</option>
              <option value="duas">Duas et Invocations</option>
              <option value="piliers">Piliers de l'Islam</option>
              <option value="foi">Foi et Tawheed</option>
              <option value="jurisprudence">Jurisprudence (Fiqh)</option>
            </select>
          </div>
          <div>
            <label className="form-label">Format</label>
            <select
              className="form-select"
              value={formFormat}
              disabled={generatingDraft}
              onChange={(e) => setFormFormat(e.target.value)}
            >
              <option value="recit">Récit / Histoire</option>
              <option value="fiche">Fiche d'apprentissage</option>
            </select>
          </div>
        </div>

        {/* Ligne 2 : Titre + bouton IA */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <label className="form-label" style={{ marginBottom: 0 }}>Titre</label>
            <button
              type="button"
              onClick={onGenerateAiDraft}
              disabled={generatingDraft}
              className="btn btn-outline"
              style={{
                padding: '0.35rem 0.85rem',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.78rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                whiteSpace: 'nowrap',
                opacity: generatingDraft ? 0.65 : 1,
                cursor: generatingDraft ? 'not-allowed' : 'pointer',
              }}
              title={generatingDraft ? "Génération déjà en cours..." : "L'Agent IA génère un premier brouillon"}
            >
              {generatingDraft ? (
                <RefreshCw size={13} className="spin" style={{ color: 'var(--primary-color)' }} />
              ) : (
                <Sparkles size={13} />
              )}
              <span>{generatingDraft ? 'Génération en cours...' : "Générer avec l'IA"}</span>
            </button>
          </div>
          <input
            className="form-input"
            type="text"
            required
            value={formTitle}
            disabled={generatingDraft}
            onChange={(e) => setFormTitle(e.target.value)}
            placeholder="Prophète Hud (Alayhi s-salam)"
          />
        </div>

        {/* Ligne 3 : Résumé */}
        <div>
          <label className="form-label">Résumé / Synthèse courte</label>
          <input
            className="form-input"
            type="text"
            value={formSummary}
            disabled={generatingDraft}
            onChange={(e) => setFormSummary(e.target.value)}
            placeholder="Aperçu rapide en 1 ou 2 phrases..."
          />
        </div>

        {/* Ligne 4 : Contenu */}
        <div>
          <label className="form-label">Contenu Principal / Texte du récit</label>
          <textarea
            className="form-textarea"
            value={formContentText}
            rows={8}
            required
            disabled={generatingDraft}
            onChange={(e) => setFormContentText(e.target.value)}
            placeholder="Rédigez l'histoire ou l'explication complète ici..."
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button
            type="submit"
            disabled={generatingDraft}
            className="btn btn-primary"
            style={{
              padding: '0.65rem 1.3rem',
              borderRadius: 'var(--radius-lg)',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              opacity: generatingDraft ? 0.6 : 1,
              cursor: generatingDraft ? 'not-allowed' : 'pointer',
            }}
          >
            <Save size={15} />
            <span>Valider et Enregistrer dans Firestore</span>
          </button>
        </div>
      </form>
    </section>
  );
};
