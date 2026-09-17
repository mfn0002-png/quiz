const { chromium } = require('/Users/fatouniang/.gemini/antigravity-ide/brain/cae49023-7ccc-401b-903f-364952197e3c/scratch/node_modules/playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto('http://localhost:5173/learn');
  await page.waitForTimeout(1500);

  // Click Hadith gateway card
  await page.click('h3:has-text("Explorateur des Hadiths")');
  await page.waitForTimeout(2000);

  // Click Sahih al-Bukhari in modal
  await page.click('[role="dialog"] >> text=Sahih al-Bukhari');
  await page.waitForTimeout(2500);

  // Click Partie 1 in modal
  await page.click('[role="dialog"] >> text=Partie 1');
  await page.waitForTimeout(4000);

  await page.screenshot({ path: '/Users/fatouniang/.gemini/antigravity-ide/brain/cae49023-7ccc-401b-903f-364952197e3c/hadith_fr_phonetic_reader.png' });
  console.log('Reader view screenshot captured');
  await browser.close();
})();
