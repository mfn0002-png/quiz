import { Loader2 } from 'lucide-react';

export function QuizLoadingScreen() {
  return (
    <div className="glass-panel" style={{ padding: '4rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <Loader2 size={64} className="spin" color="var(--primary-color)" style={{ marginBottom: '1.5rem' }} />
      <h2>Création du quiz en cours...</h2>
      <p>L'IA prépare des questions uniques pour vous.</p>
    </div>
  );
}
