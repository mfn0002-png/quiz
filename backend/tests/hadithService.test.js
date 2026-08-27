import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { fetchHadiths, formatHadiths } from '../src/services/hadithService.js';

// Mock de fetch global
const originalFetch = globalThis.fetch;
let mockFetchResults = [];

function mockFetch(url, options) {
  const result = mockFetchResults.shift();
  if (!result) {
    return Promise.resolve({ ok: false, status: 404 });
  }
  return Promise.resolve(result);
}

describe('hadithService', () => {
  beforeEach(() => {
    globalThis.fetch = mockFetch;
    mockFetchResults = [];
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  describe('fetchHadiths', () => {
    test('retourne un tableau vide pour un thème vide', async () => {
      const result = await fetchHadiths('');
      assert.deepEqual(result, []);
    });

    test('retourne un tableau vide pour "Mélange"', async () => {
      const result = await fetchHadiths('Mélange');
      assert.deepEqual(result, []);
    });

    test('retourne des hadiths depuis l\'API', async () => {
      mockFetchResults.push({
        ok: true,
        json: () => Promise.resolve({
          data: [
            {
              collection: 'Sahih Bukhari',
              bookNumber: '1',
              hadithNumber: '1',
              narrator: 'Abu Huraira',
              text: 'L\'accomplissement de la prière est le meilleur acte après l\'attestation de la foi.',
            },
          ],
        }),
      });

      const result = await fetchHadiths('prière', 1);
      assert.equal(result.length, 1);
      assert.equal(result[0].collection, 'Sahih Bukhari');
      assert.equal(result[0].text, 'L\'accomplissement de la prière est le meilleur acte après l\'attestation de la foi.');
    });

    test('retourne un tableau vide en cas d\'erreur HTTP', async () => {
      mockFetchResults.push({ ok: false, status: 500 });
      const result = await fetchHadiths('prière');
      assert.deepEqual(result, []);
    });

    test('retourne un tableau vide en cas de timeout', async () => {
      globalThis.fetch = () => Promise.reject({ name: 'AbortError' });
      const result = await fetchHadiths('prière');
      assert.deepEqual(result, []);
    });

    test('filtrer les hadiths sans texte', async () => {
      mockFetchResults.push({
        ok: true,
        json: () => Promise.resolve({
          data: [
            { collection: 'Bukhari', text: 'Avec texte' },
            { collection: 'Muslim', text: '' },
            { collection: 'Abu Dawud' },
          ],
        }),
      });

      const result = await fetchHadiths('test', 10);
      assert.equal(result.length, 1);
      assert.equal(result[0].text, 'Avec texte');
    });

    test('utilise le cache pour les appels répétés', async () => {
      mockFetchResults.push({
        ok: true,
        json: () => Promise.resolve({ data: [{ collection: 'Bukhari', text: 'Test' }] }),
      });

      await fetchHadiths('patience', 2);
      const second = await fetchHadiths('patience', 2);

      assert.equal(second.length, 1);
      assert.equal(mockFetchResults.length, 0); // Pas de nouvel appel API
    });
  });

  describe('formatHadiths', () => {
    test('retourne une chaîne vide pour un tableau vide', () => {
      assert.equal(formatHadiths([]), '');
    });

    test('retourne une chaîne vide pour null', () => {
      assert.equal(formatHadiths(null), '');
    });

    test('formate correctement un hadith', () => {
      const hadiths = [{
        collection: 'Sahih Bukhari',
        bookNumber: '1',
        hadithNumber: '1',
        narrator: 'Abu Huraira',
        text: 'Le meilleur acte est la prière.',
      }];

      const result = formatHadiths(hadiths);
      assert.ok(result.includes('[Hadith - Sahih Bukhari 1:1]'));
      assert.ok(result.includes('(Narrateur: Abu Huraira)'));
      assert.ok(result.includes('Le meilleur acte est la prière.'));
    });

    test('formate sans narrateur si absent', () => {
      const hadiths = [{
        collection: 'Muslim',
        bookNumber: '',
        hadithNumber: '2699',
        narrator: null,
        text: 'La purification est la moitié de la foi.',
      }];

      const result = formatHadiths(hadiths);
      assert.ok(result.includes('[Hadith - Muslim:2699]'));
      assert.ok(!result.includes('Narrateur'));
    });
  });
});
