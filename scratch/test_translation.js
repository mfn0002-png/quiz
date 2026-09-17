import { translateEnToFr } from '../backend/src/utils/hadithTransform.js';

async function test() {
  const sampleEn = "It is narrated on the authority of 'Uthman that the Messenger of Allah (ﷺ) said. He who died knowing (fully well) that there is no god but Allah entered Paradise";
  console.log("Input EN:", sampleEn);
  const fr = await translateEnToFr(sampleEn);
  console.log("Output FR:", fr);
}

test();
