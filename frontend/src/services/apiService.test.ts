import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateQuestions, getAssistantHistory, resetClientSessionId } from './apiService';

const mockQuestion = {
  id: 1,
  text: 'Quel est le premier pilier de l\'Islam ?',
  options: ['La Shahada', 'La Salat', 'La Zakat', 'Le Sawm'],
  correctAnswerIndex: 0,
  explanation: 'La Shahada est la profession de foi.',
  difficulty: 'Débutant',
  category: 'Piliers',
  keywords: [],
};

describe('generateQuestions', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('envoie le bon payload et retourne les questions', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [mockQuestion],
    });
    vi.stubGlobal('fetch', fetchMock);

    const questions = await generateQuestions('Débutant', 'Coran', 5, 'user_test');

    expect(questions).toHaveLength(1);
    expect(questions[0].text).toBe(mockQuestion.text);

    const [url, opts] = fetchMock.mock.calls[0];
    expect(url).toContain('/quiz/generate');
    expect(opts.method).toBe('POST');
    const body = JSON.parse(opts.body);
    expect(body.count).toBe(5);
    expect(body.sessionId).toBe('user_test');
  });

  it('lève une erreur quand la réponse HTTP est en échec', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({ error: 'Erreur serveur lors de la génération du quiz.' }),
    }));

    await expect(generateQuestions('Débutant')).rejects.toThrow('Erreur serveur');
  });
});

describe('getAssistantHistory', () => {
  it('retourne l\'historique en cas de succès', async () => {
    const history = [{ role: 'user', content: 'Bonjour' }];
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ history }),
    }));

    const result = await getAssistantHistory('user_test');
    expect(result).toEqual(history);
  });

  it('retourne un tableau vide en cas d\'erreur réseau', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network')));
    const result = await getAssistantHistory('user_test');
    expect(result).toEqual([]);
  });
});

describe('resetClientSessionId', () => {
  it('génère un id unique et le persiste', () => {
    const a = resetClientSessionId();
    const b = resetClientSessionId();
    expect(a.startsWith('guest_')).toBe(true);
    expect(a).not.toBe(b);
    expect(localStorage.getItem('quiz_anonymous_session_id')).toBe(b);
  });
});
