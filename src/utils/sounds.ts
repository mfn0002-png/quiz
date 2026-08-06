// Effets sonores utilisant l'API Web Audio native (aucune dépendance)

const ctx = () => new (window.AudioContext || (window as any).webkitAudioContext)();

function playTone(frequency: number, duration: number, type: OscillatorType, gainValue: number, fadeOut = true) {
  try {
    const audioCtx = ctx();
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, audioCtx.currentTime);
    gainNode.gain.setValueAtTime(gainValue, audioCtx.currentTime);

    if (fadeOut) {
      gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
    }

    oscillator.start();
    oscillator.stop(audioCtx.currentTime + duration);
  } catch (e) {
    // Silently fail if Web Audio API is not available
  }
}

/** Son joyeux : double note montante — réponse correcte */
export function playCorrect() {
  playTone(523, 0.15, 'sine', 0.3); // Do
  setTimeout(() => playTone(783, 0.25, 'sine', 0.3), 120); // Sol
}

/** Son grave bref — mauvaise réponse */
export function playWrong() {
  playTone(220, 0.4, 'sawtooth', 0.15);
}

/** Bip neutre descendant — temps écoulé */
export function playTimeout() {
  playTone(440, 0.1, 'square', 0.1);
  setTimeout(() => playTone(330, 0.3, 'square', 0.1), 100);
}
