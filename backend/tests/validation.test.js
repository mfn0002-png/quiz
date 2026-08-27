import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  generateQuizSchema,
  resultsSchema,
  chatSchema,
  sessionIdParamsSchema,
} from '../src/validation/schemas.js';

test('generateQuizSchema accepte un payload valide', () => {
  const r = generateQuizSchema.safeParse({ difficulty: 'Expert', topic: 'Coran', count: 5, sessionId: 'user_abc' });
  assert.equal(r.success, true);
});

test('generateQuizSchema utilise les valeurs par défaut', () => {
  const r = generateQuizSchema.safeParse({});
  assert.equal(r.success, true);
  assert.equal(r.data.difficulty, 'Débutant');
  assert.equal(r.data.topic, 'Mélange');
  assert.equal(r.data.count, 5);
  assert.equal(r.data.sessionId, 'anonymous');
});

test('generateQuizSchema rejette count = 0', () => {
  const r = generateQuizSchema.safeParse({ count: 0 });
  assert.equal(r.success, false);
});

test('generateQuizSchema rejette count > 20', () => {
  const r = generateQuizSchema.safeParse({ count: 100 });
  assert.equal(r.success, false);
});

test('generateQuizSchema rejette count non entier', () => {
  const r = generateQuizSchema.safeParse({ count: 2.5 });
  assert.equal(r.success, false);
});

test('generateQuizSchema rejette difficulty invalide', () => {
  const r = generateQuizSchema.safeParse({ difficulty: 'Débuta' });
  assert.equal(r.success, false);
});

test('generateQuizSchema rejette topic trop long', () => {
  const r = generateQuizSchema.safeParse({ topic: 'x'.repeat(200) });
  assert.equal(r.success, false);
});

test('generateQuizSchema rejette sessionId invalide', () => {
  const r = generateQuizSchema.safeParse({ sessionId: "mauvais;id!'" });
  assert.equal(r.success, false);
});

test('generateQuizSchema rejette sessionId trop long', () => {
  const r = generateQuizSchema.safeParse({ sessionId: 'a'.repeat(150) });
  assert.equal(r.success, false);
});

test('resultsSchema accepte des résultats valides', () => {
  const r = resultsSchema.safeParse({
    sessionId: 'user_abc',
    results: [{ questionId: 1, isCorrect: true, category: 'Coran' }],
  });
  assert.equal(r.success, true);
});

test('resultsSchema rejette isCorrect non booléen', () => {
  const r = resultsSchema.safeParse({
    sessionId: 'user_abc',
    results: [{ questionId: 1, isCorrect: 'oui' }],
  });
  assert.equal(r.success, false);
});

test('resultsSchema rejette tableau vide', () => {
  const r = resultsSchema.safeParse({ sessionId: 'user_abc', results: [] });
  assert.equal(r.success, false);
});

test('resultsSchema rejette plus de 100 résultats', () => {
  const results = Array.from({ length: 101 }, () => ({ isCorrect: true }));
  const r = resultsSchema.safeParse({ sessionId: 'user_abc', results });
  assert.equal(r.success, false);
});

test('chatSchema accepte une question valide', () => {
  const r = chatSchema.safeParse({ question: 'Quel est le premier pilier ?', sessionId: 'user_abc' });
  assert.equal(r.success, true);
});

test('chatSchema rejette une question vide', () => {
  const r = chatSchema.safeParse({ question: '', sessionId: 'user_abc' });
  assert.equal(r.success, false);
});

test('chatSchema rejette une question trop longue', () => {
  const r = chatSchema.safeParse({ question: 'x'.repeat(6000), sessionId: 'user_abc' });
  assert.equal(r.success, false);
});

test('sessionIdParamsSchema rejette un paramètre invalide', () => {
  const r = sessionIdParamsSchema.safeParse({ sessionId: 'a b c' });
  assert.equal(r.success, false);
});
