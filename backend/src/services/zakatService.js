/**
 * zakatService.js
 *
 * Service de calcul de la Zakat al-Maal obligatoire (2.5%)
 * selon le Nisab de l'or (~5 500 €) et les taux de change indicatifs.
 */

// Taux de conversion approximatifs vers EUR pour estimer le Nisab (85g d'or ~= 5 500 EUR)
const RATES_TO_EUR = {
  EUR: 1,
  USD: 0.92,
  XOF: 0.001524, // 1 EUR = 655.957 XOF
  XAF: 0.001524, // 1 EUR = 655.957 XAF
  MAD: 0.092,
  DZD: 0.0068,
  TND: 0.30,
  CAD: 0.68,
  GBP: 1.17
};

const NISAB_EUR = 5500; // Nisab estimé (85g d'or)

/**
 * Calcule la Zakat et vérifie si le montant dépasse le Nisab.
 *
 * @param {{ amount: number, currency?: string }} params
 * @returns {{ amount: number, currency: string, zakatAmount: string, isExceedingNisab: boolean, nisabLocal: string }}
 */
export function calculateZakat({ amount, currency = 'EUR' }) {
  if (typeof amount !== 'number' || isNaN(amount) || amount < 0) {
    throw new Error('Le montant doit être un nombre positif.');
  }

  const currUpper = (currency || 'EUR').toUpperCase();
  const rate = RATES_TO_EUR[currUpper] || 1;
  const amountInEur = amount * rate;
  const nisabInLocalCurrency = Math.round(NISAB_EUR / rate);
  const isExceedingNisab = amountInEur >= NISAB_EUR;

  const zakatVal = amount * 0.025;
  const zakatAmount = zakatVal.toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  const nisabLocal = nisabInLocalCurrency.toLocaleString('fr-FR');

  return {
    amount,
    currency: currUpper,
    zakatAmount,
    isExceedingNisab,
    nisabLocal
  };
}

/**
 * Formate le résultat du calcul de Zakat en texte lisible avec explications.
 */
export function formatZakatResult(result) {
  if (!result) return '';

  const { amount, currency, zakatAmount, isExceedingNisab, nisabLocal } = result;
  const formattedAmount = amount.toLocaleString('fr-FR');

  let output = `Pour un montant de **${formattedAmount} ${currency}** :\n\n`;

  if (isExceedingNisab) {
    output += `✅ **Votre montant DÉPASSE le Nisab.**\n`;
    output += `• Le Nisab (85g d'or) est estimé à environ **${nisabLocal} ${currency}** (~5 500 EUR).\n`;
    output += `• La Zakat due (2,5%) s'élève à **${zakatAmount} ${currency}** (à s'acquitter si ce montant est conservé pendant un an lunaire complet / Hawl).`;
  } else {
    output += `❌ **Votre montant NE DÉPASSE PAS le Nisab.**\n`;
    output += `• Le Nisab de l'or (85g) est estimé à environ **${nisabLocal} ${currency}** (~5 500 EUR).\n`;
    output += `• Comme votre montant de **${formattedAmount} ${currency}** est inférieur au Nisab (**${nisabLocal} ${currency}**), la Zakat n'est pas obligatoire pour ce montant.`;
  }

  return output;
}
