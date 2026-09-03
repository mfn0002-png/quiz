import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { fetchDuas, formatDuas } from '../src/services/duaService.js';

describe('duaService', () => {
  describe('fetchDuas', () => {
    test('retourne un tableau vide pour un sujet vide', async () => {
      const result = await fetchDuas('');
      assert.deepEqual(result, []);
    });

    test('retourne un tableau vide pour "Mélange"', async () => {
      const result = await fetchDuas('Mélange');
      assert.deepEqual(result, []);
    });

    test('trouve l\'invocation du nouvel habit', async () => {
      const result = await fetchDuas('nouvel habit', 1);
      assert.equal(result.length, 1);
      assert.ok(result[0].title.includes('vêtement neuf') || result[0].title.includes('Nouvel habit') || result[0].title.includes('garment'));
      assert.ok(result[0].arabic.length > 0);
      assert.ok(result[0].phonetic.length > 0);
      assert.ok(result[0].french.length > 0);
    });

    test('trouve l\'invocation avant de dormir', async () => {
      const result = await fetchDuas('dormir', 1);
      assert.equal(result.length, 1);
      assert.ok(result[0].title.includes('dormir') || result[0].french.includes('meurs et je vis'));
    });

    test('trouve l\'invocation du voyage', async () => {
      const result = await fetchDuas('voyage', 1);
      assert.equal(result.length, 1);
      assert.ok(result[0].title.includes('voyage') || result[0].title.includes('travel'));
    });
  });

  describe('formatDuas', () => {
    test('retourne une chaîne vide pour un tableau vide ou null', () => {
      assert.equal(formatDuas([]), '');
      assert.equal(formatDuas(null), '');
    });

    test('formate correctement une invocation', () => {
      const duas = [{
        title: 'Invocation du vêtement neuf',
        source: 'Abu Dawud (n° 4020)',
        arabic: 'اللَّهُمَّ لَكَ الْحَمْدُ',
        phonetic: 'Allahumma laka-l-hamdu',
        french: 'Ô Allah ! À Toi la louange.'
      }];

      const formatted = formatDuas(duas);
      assert.ok(formatted.includes('• [Invocation - Invocation du vêtement neuf] (Source: Abu Dawud (n° 4020))'));
      assert.ok(formatted.includes('Arabe : "اللَّهُمَّ لَكَ الْحَمْدُ"'));
      assert.ok(formatted.includes('Phonétique : "Allahumma laka-l-hamdu"'));
      assert.ok(formatted.includes('Traduction : "Ô Allah ! À Toi la louange."'));
    });
  });
});
