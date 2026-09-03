import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { mcpServer } from '../src/mcp/islamicMcpServer.js';
import { fetchPrayerTimes, formatPrayerTimes } from '../src/services/prayerService.js';
import { fetchHijriCalendar, formatHijriCalendar } from '../src/services/calendarService.js';
import { calculateZakat, formatZakatResult } from '../src/services/zakatService.js';

describe('MCP Server (Islamic Knowledge)', () => {
  test('le serveur MCP est correctement initialisé', () => {
    assert.ok(mcpServer !== null && mcpServer !== undefined);
  });

  describe('prayerService', () => {
    test('récupère et formate les heures de prière pour Paris', async () => {
      const data = await fetchPrayerTimes({ city: 'Paris' });
      assert.equal(data.city, 'Paris');
      assert.ok(data.timings.Fajr);
      assert.ok(data.timings.Dhuhr);

      const formatted = formatPrayerTimes(data);
      assert.ok(formatted.includes('Heures de prière pour Paris'));
      assert.ok(formatted.includes('Fajr'));
    });
  });

  describe('calendarService', () => {
    test('récupère et formate le calendrier hégirien', async () => {
      const data = await fetchHijriCalendar();
      assert.ok(data.hijriDate);
      assert.ok(data.gregorianDate);

      const formatted = formatHijriCalendar(data);
      assert.ok(formatted.includes('Date Hégirienne'));
      assert.ok(formatted.includes('À noter'));
    });
  });

  describe('zakatService', () => {
    test('calcule correctement la Zakat pour 10 000 EUR (dépassant le Nisab)', () => {
      const result = calculateZakat({ amount: 10000, currency: 'EUR' });
      assert.equal(result.isExceedingNisab, true);
      assert.equal(result.zakatAmount, '250');

      const formatted = formatZakatResult(result);
      assert.ok(formatted.includes('DÉPASSE le Nisab'));
      assert.ok(formatted.includes('250 EUR'));
    });

    test('calcule correctement la Zakat pour 1 000 EUR (en dessous du Nisab)', () => {
      const result = calculateZakat({ amount: 1000, currency: 'EUR' });
      assert.equal(result.isExceedingNisab, false);

      const formatted = formatZakatResult(result);
      assert.ok(formatted.includes('NE DÉPASSE PAS le Nisab'));
    });
  });
});
