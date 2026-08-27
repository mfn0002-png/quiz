import '@testing-library/jest-dom/vitest';
import { beforeEach } from 'vitest';

// localStorage est disponible en jsdom, mais on le nettoie entre les tests
beforeEach(() => {
  localStorage.clear();
});
