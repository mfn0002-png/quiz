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

    // Les topics sont fournis en anglais par Gemini via le MCP
    test('trouve les invocations sur la nourriture (food)', async () => {
      const result = await fetchDuas('food', 2);
      assert.ok(result.length > 0);
      assert.ok(result[0].arabic.length > 0);
      assert.ok(result[0].french.length > 0);
    });

    test('trouve les invocations sur le sommeil (sleep)', async () => {
      const result = await fetchDuas('sleep', 1);
      assert.ok(result.length > 0);
      assert.ok(result[0].title.toLowerCase().includes('sleep'));
      assert.ok(result[0].arabic.length > 0);
    });

    test('trouve les invocations sur la pluie (weather/rain)', async () => {
      const result = await fetchDuas('rain', 1);
      assert.ok(result.length > 0);
      assert.ok(result[0].title.toLowerCase().includes('rain') || result[0].arabic.includes('صَيِّبًا'));
      assert.ok(result[0].arabic.length > 0);
    });

    test('trouve les invocations de voyage (travel)', async () => {
      const result = await fetchDuas('travel', 1);
      assert.ok(result.length > 0);
      assert.ok(result[0].title.toLowerCase().includes('travel') || result[0].title.toLowerCase().includes('journey'));
      assert.ok(result[0].arabic.length > 0);
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
