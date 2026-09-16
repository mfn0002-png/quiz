import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { resolveSourceRef } from '../src/services/sourceResolverService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const targetPath = path.resolve(__dirname, '../data/staticSources.json');
const current = JSON.parse(fs.readFileSync(targetPath, 'utf8'));

async function main() {
  const keys = Object.keys(current);
  console.log(`Resolving ${keys.length} sources with Arabic, Phonetic & French...`);
  
  const updated = {};
  for (const key of keys) {
    try {
      console.log(`Fetching ${key}...`);
      const res = await resolveSourceRef(key);
      updated[key] = res;
      // Short delay to respect API rate limits
      await new Promise(r => setTimeout(r, 200));
    } catch (err) {
      console.error(`Error fetching ${key}:`, err.message);
      updated[key] = current[key];
    }
  }

  fs.writeFileSync(targetPath, JSON.stringify(updated, null, 2), 'utf8');
  console.log('✅ Successfully updated staticSources.json with transcriptions!');
}

main().catch(console.error);
