import { Sliders, Heart, Clock } from 'lucide-react';
import { setGlobalLifeConfig } from '../../services/livesService';

interface QuizConfigSectionProps {
  defaultQuestionCount: number;
  setDefaultQuestionCount: (val: number) => void;
  timerSeconds: number;
  setTimerSeconds: (val: number) => void;
  lifeRechargeSeconds: number;
  setLifeRechargeSeconds: (val: number) => void;
  maxLives: number;
  setMaxLives: (val: number) => void;
}

export const QuizConfigSection = ({
  defaultQuestionCount,
  setDefaultQuestionCount,
  timerSeconds,
  setTimerSeconds,
  lifeRechargeSeconds,
  setLifeRechargeSeconds,
  maxLives,
  setMaxLives,
}: QuizConfigSectionProps) => {
  return (
    <section className="admin-section">
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.25rem' }}>
        <Sliders size={19} style={{ color: 'var(--primary-color)' }} />
        <h2 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>
          Paramètres du Quiz &amp; Système de Vies
        </h2>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem' }}>
        {/* Nombre de questions */}
        <div>
          <label className="form-label">Nombre de questions par session :</label>
          <select
            className="form-select"
            value={defaultQuestionCount}
            onChange={(e) => setDefaultQuestionCount(Number(e.target.value))}
          >
            <option value={5}>5 questions (Rapide)</option>
            <option value={10}>10 questions (Standard)</option>
            <option value={15}>15 questions (Intensif)</option>
          </select>
        </div>

        {/* Temps limite chrono */}
        <div>
          <label className="form-label">
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
              <Clock size={14} style={{ color: 'var(--text-muted)' }} /> Temps limite par question :
            </span>
          </label>
          <select
            className="form-select"
            value={timerSeconds}
            onChange={(e) => setTimerSeconds(Number(e.target.value))}
          >
            <option value={15}>15 secondes</option>
            <option value={30}>30 secondes (Par défaut)</option>
            <option value={60}>60 secondes</option>
            <option value={0}>Illimité (Sans chrono)</option>
          </select>
        </div>

        {/* Temps de recharge des vies */}
        <div>
          <label className="form-label">
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
              <Heart size={14} style={{ color: '#ef4444' }} /> Recharge d'une vie :
            </span>
          </label>
          <select
            className="form-select"
            value={lifeRechargeSeconds}
            onChange={(e) => {
              const val = Number(e.target.value);
              setLifeRechargeSeconds(val);
              setGlobalLifeConfig({ rechargeSeconds: val });
            }}
          >
            <option value={30}>⚡ 30 secondes (Test ultra-rapide)</option>
            <option value={60}>⏱️ 1 minute (Débogage &amp; Test)</option>
            <option value={120}>⏱️ 2 minutes (Dynamique)</option>
            <option value={180}>✨ 3 minutes (Recommandé / Équilibré)</option>
            <option value={300}>⏱️ 5 minutes (Standard)</option>
            <option value={600}>⏱️ 10 minutes (Modéré)</option>
            <option value={900}>⏱️ 15 minutes (Compétitif)</option>
            <option value={1800}>⏱️ 30 minutes (Challenge)</option>
          </select>
        </div>

        {/* Nombre max de vies */}
        <div>
          <label className="form-label">
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
              <Heart size={14} style={{ color: '#ef4444' }} /> Réserve maximale de vies :
            </span>
          </label>
          <select
            className="form-select"
            value={maxLives}
            onChange={(e) => {
              const val = Number(e.target.value);
              setMaxLives(val);
              setGlobalLifeConfig({ maxLives: val });
            }}
          >
            <option value={3}>3 vies (Mode Difficile)</option>
            <option value={5}>5 vies (Par défaut)</option>
            <option value={7}>7 vies (Généreux)</option>
            <option value={10}>10 vies (Confort)</option>
          </select>
        </div>
      </div>
    </section>
  );
};
