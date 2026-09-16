import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Canonical French translation & categories for the 99 Names of Allah
const FRENCH_NAMES = [
  { number: 1, meaningFr: "Le Tout-Miséricordieux", explanation: "Sa miséricorde infinie et absolue embrasse toutes les créatures de l'univers.", category: "Miséricorde & Bienveillance" },
  { number: 2, meaningFr: "Le Très-Miséricordieux", explanation: "Celui qui accorde une miséricorde particulière et éternelle aux croyants.", category: "Miséricorde & Bienveillance" },
  { number: 3, meaningFr: "Le Souverain, Le Roi", explanation: "Le Maître absolu de toute la création, sans associé ni égal.", category: "Souveraineté & Majesté" },
  { number: 4, meaningFr: "Le Sanctifié, Le Pur", explanation: "Exempt de toute imperfection, défaut, ressemblance ou limitation.", category: "Pureté & Perfection" },
  { number: 5, meaningFr: "La Paix, Le Pacifique", explanation: "La Source de toute sécurité, paix intérieure et sérénité.", category: "Paix & Protection" },
  { number: 6, meaningFr: "Le Rassurant, Le Garant", explanation: "Celui qui accorde la sécurité et confirme la sincérité de Ses serviteurs.", category: "Paix & Protection" },
  { number: 7, meaningFr: "Le Préservateur, Le Témoin", explanation: "Le Gardien suprême qui veille avec vigilance sur toutes Ses créatures.", category: "Protection & Vigilance" },
  { number: 8, meaningFr: "Le Tout-Puissant, Le Noble", explanation: "L'Invincible que rien ne peut vaincre ni affaiblir.", category: "Puissance & Grandeur" },
  { number: 9, meaningFr: "Le Contraignant, Le Réparateur", explanation: "Celui dont la volonté s'impose et qui répare les cœurs brisés.", category: "Puissance & Grandeur" },
  { number: 10, meaningFr: "Le Superbe, Le Majestueux", explanation: "Celui à qui appartient la grandeur suprême et la transcendance.", category: "Souveraineté & Majesté" },
  { number: 11, meaningFr: "Le Créateur", explanation: "Celui qui donne l'existence à partir du néant selon Sa détermination parfaite.", category: "Création & Puissance" },
  { number: 12, meaningFr: "Le Créateur distinct, Le Novateur", explanation: "Celui qui fait passer la création du néant à l'existence sans modèle préalable.", category: "Création & Puissance" },
  { number: 13, meaningFr: "Le Formateur, Le Façonneur", explanation: "Celui qui donne à chaque créature sa forme, son harmonie et son unicité.", category: "Création & Puissance" },
  { number: 14, meaningFr: "Le Tout-Pardonneur", explanation: "Celui qui pardonne inlassablement et efface les fautes de Ses serviteurs.", category: "Pardon & Clémence" },
  { number: 15, meaningFr: "Le Dominateur suprême", explanation: "Celui devant la souveraineté duquel toute la création est soumise.", category: "Souveraineté & Majesté" },
  { number: 16, meaningFr: "Le Dispensateur suprême", explanation: "Le Donateur généreux qui offre Ses bienfaits sans rien attendre en retour.", category: "Générosité & Bienfaits" },
  { number: 17, meaningFr: "Le Grand Pourvoyeur", explanation: "Celui qui accorde la subsistance matérielle et spirituelle à toute vie.", category: "Générosité & Bienfaits" },
  { number: 18, meaningFr: "Le Grand Décideur, Celui qui ouvre", explanation: "Celui qui ouvre les portes de la miséricorde et tranche en toute justice.", category: "Justice & Sagesse" },
  { number: 19, meaningFr: "L'Omniscient", explanation: "Sa science infinie embrasse le visible et l'invisible, le passé, le présent et le futur.", category: "Science & Connaissance" },
  { number: 20, meaningFr: "Celui qui restreint", explanation: "Celui qui retient et mesure la subsistance et les épreuves avec sagesse.", category: "Justice & Sagesse" },
  { number: 21, meaningFr: "Celui qui accorde largement", explanation: "Celui qui dilate les cœurs et répand Ses bienfaits avec abondance.", category: "Générosité & Bienfaits" },
  { number: 22, meaningFr: "Celui qui abaisse", explanation: "Celui qui abaisse les orgueilleux et les transgresseurs.", category: "Justice & Équité" },
  { number: 23, meaningFr: "Celui qui élève", explanation: "Celui qui élève en rang Ses serviteurs pieux et véridiques.", category: "Justice & Équité" },
  { number: 24, meaningFr: "Celui qui rend puissant", explanation: "Celui qui accorde honneur, dignité et victoire à qui Il veut.", category: "Puissance & Grandeur" },
  { number: 25, meaningFr: "Celui qui humilie", explanation: "Celui qui prive de soutien ceux qui s'enflent d'orgueil.", category: "Justice & Équité" },
  { number: 26, meaningFr: "L'Audient", explanation: "Celui qui entend tout murmure, prière et pensée dans les cœurs.", category: "Attributs d'Écoute & Vision" },
  { number: 27, meaningFr: "Le Clairvoyant", explanation: "Celui dont le regard parfait embrasse chaque détail de l'univers.", category: "Attributs d'Écoute & Vision" },
  { number: 28, meaningFr: "L'Arbitre suprême, Le Juge", explanation: "Le Juge suprême dont les décrets sont d'une absolue équité.", category: "Justice & Sagesse" },
  { number: 29, meaningFr: "Le Juste absolu", explanation: "L'Équitable parfait qui n'opprime aucune de Ses créatures.", category: "Justice & Équité" },
  { number: 30, meaningFr: "Le Subtil, Le Bienveillant", explanation: "Celui qui agit avec délicatesse et bienveillance imperceptible.", category: "Miséricorde & Bienveillance" },
  { number: 31, meaningFr: "Le Parfaitement Informé", explanation: "Celui qui connaît les secrets les plus intimes et la réalité profonde des choses.", category: "Science & Connaissance" },
  { number: 32, meaningFr: "Le Très-Indulgent, Le Patient", explanation: "Celui qui ne se hâte pas de châtier et patiente envers les fautes.", category: "Pardon & Clémence" },
  { number: 33, meaningFr: "L'Immense, Le Magnifique", explanation: "Celui dont la grandeur dépasse toute compréhension humaine.", category: "Souveraineté & Majesté" },
  { number: 34, meaningFr: "Le Très-Pardonneur", explanation: "Celui qui voile les péchés et pardonne avec une immense indulgence.", category: "Pardon & Clémence" },
  { number: 35, meaningFr: "Le Très-Reconnaissant", explanation: "Celui qui rétribue abondamment le moindre acte sincère.", category: "Générosité & Bienfaits" },
  { number: 36, meaningFr: "Le Très-Haut", explanation: "Celui qui est au-dessus de toute création par Son essence et Ses attributs.", category: "Souveraineté & Majesté" },
  { number: 37, meaningFr: "L'Infiniment Grand", explanation: "Le Plus Grand, devant Lequel toute grandeur s'efface.", category: "Souveraineté & Majesté" },
  { number: 38, meaningFr: "Le Gardien suprême", explanation: "Celui qui préserve l'ordre de l'univers et protège Ses serviteurs.", category: "Protection & Vigilance" },
  { number: 39, meaningFr: "Le Nourricier, Le Témoin vigilant", explanation: "Celui qui dispense subsistance et veille à chaque besoin vital.", category: "Générosité & Bienfaits" },
  { number: 40, meaningFr: "Le Suffisant, Celui qui tient compte", explanation: "Celui qui suffit à Ses serviteurs et compte chaque acte avec exactitude.", category: "Protection & Vigilance" },
  { number: 41, meaningFr: "Le Majestueux", explanation: "L'Être digne de majesté, de respect et de louange éternelle.", category: "Souveraineté & Majesté" },
  { number: 42, meaningFr: "Le Tout-Généreux", explanation: "Celui dont la noblesse et les dons sont inépuisables.", category: "Générosité & Bienfaits" },
  { number: 43, meaningFr: "Le Surveillant suprême", explanation: "Celui qui observe tout et à qui rien n'échappe.", category: "Protection & Vigilance" },
  { number: 44, meaningFr: "Celui qui exauce", explanation: "Celui qui répond toujours aux invocations et aux prières des cœurs sincères.", category: "Miséricorde & Bienveillance" },
  { number: 45, meaningFr: "L'Immense, Celui qui embrasse tout", explanation: "Son savoir, Sa miséricorde et Ses bienfaits englobent toute existence.", category: "Science & Connaissance" },
  { number: 46, meaningFr: "Le Très-Sage", explanation: "Celui qui place chaque chose à sa juste place avec une sagesse absolue.", category: "Justice & Sagesse" },
  { number: 47, meaningFr: "Le Bien-Aimant", explanation: "Celui qui aime Ses créatures pieuses et se fait aimer d'elles par Ses bienfaits.", category: "Miséricorde & Bienveillance" },
  { number: 48, meaningFr: "Le Glorieux", explanation: "Le Maître de gloire, d'honneur éclatant et de magnificence.", category: "Souveraineté & Majesté" },
  { number: 49, meaningFr: "Celui qui ressuscite", explanation: "Celui qui ramènera les morts à la vie pour le Jour du Jugement.", category: "Création & Puissance" },
  { number: 50, meaningFr: "Le Témoin parfait", explanation: "Celui devant qui toute vérité est dévoilée et constatée.", category: "Science & Connaissance" },
  { number: 51, meaningFr: "La Vérité suprême", explanation: "L'Être réel et indéniable dont les promesses et paroles sont la vérité même.", category: "Pureté & Perfection" },
  { number: 52, meaningFr: "Le Tuteur digne de confiance", explanation: "Le Garant parfait à qui l'on peut s'en remettre en toute quiétude.", category: "Protection & Vigilance" },
  { number: 53, meaningFr: "Le Fort, Le Puissant", explanation: "Celui qui possède une force absolue exempte de toute faiblesse.", category: "Puissance & Grandeur" },
  { number: 54, meaningFr: "L'Inébranlable, Le Robuste", explanation: "Sa fermeté et Sa puissance sont indestructibles.", category: "Puissance & Grandeur" },
  { number: 55, meaningFr: "Le Protecteur, L'Ami intime", explanation: "L'Allié fidèle qui soutient, protège et guide les croyants.", category: "Protection & Vigilance" },
  { number: 56, meaningFr: "Le Digne de Louange", explanation: "L'Unique qui mérite d'être glorifié et loué en toute circonstance.", category: "Pureté & Perfection" },
  { number: 57, meaningFr: "Celui qui dénombre et connaît tout", explanation: "Celui dont la science compte avec précision chaque grain de l'univers.", category: "Science & Connaissance" },
  { number: 58, meaningFr: "L'Initiateur premier", explanation: "Celui qui a créé l'univers pour la première fois sans exemple précédent.", category: "Création & Puissance" },
  { number: 59, meaningFr: "Celui qui réintègre et répète la création", explanation: "Celui qui renouvelle la vie et ramène toute création après sa fin.", category: "Création & Puissance" },
  { number: 60, meaningFr: "Celui qui donne la vie", explanation: "La Source de toute vie physique, biologique et spirituelle.", category: "Création & Puissance" },
  { number: 61, meaningFr: "Celui qui donne la mort", explanation: "Celui qui décrète le terme de chaque être vivant avec justice.", category: "Création & Puissance" },
  { number: 62, meaningFr: "Le Vivant éternel", explanation: "L'Éternel qui ne meurt jamais, d'une vie sans début ni fin.", category: "Éternité & Subsistance" },
  { number: 63, meaningFr: "L'Auto-Suffisant qui maintient tout", explanation: "Celui qui subsiste par Lui-même et assure la pérennité des cieux et de la terre.", category: "Éternité & Subsistance" },
  { number: 64, meaningFr: "L'Opulent, Celui qui trouve tout", explanation: "Celui qui ne manque de rien et détient toutes les richesses.", category: "Générosité & Bienfaits" },
  { number: 65, meaningFr: "Le Noble, Le Majestueux", explanation: "L'Être illustre dont la noblesse est incomparable.", category: "Souveraineté & Majesté" },
  { number: 66, meaningFr: "L'Unique sans égal", explanation: "L'Unique dans Son essence, Ses attributs et Ses actes.", category: "Unicité (Tawhid)" },
  { number: 67, meaningFr: "L'Indivisible", explanation: "L'Unique qui n'a ni associé, ni semblable, ni pair.", category: "Unicité (Tawhid)" },
  { number: 68, meaningFr: "Le Refuge suprême, L'Impénétrable", explanation: "Celui vers qui toutes les créatures se tournent pour leurs besoins.", category: "Éternité & Subsistance" },
  { number: 69, meaningFr: "Le Tout-Puissant", explanation: "Celui qui a le pouvoir complet d'accomplir tout ce qu'Il veut.", category: "Puissance & Grandeur" },
  { number: 70, meaningFr: "Le Déterminateur suprême", explanation: "Celui qui applique Sa puissance selon une mesure et un décret parfaits.", category: "Puissance & Grandeur" },
  { number: 71, meaningFr: "Celui qui avance", explanation: "Celui qui accorde la préséance et avance les choses selon Sa volonté.", category: "Justice & Sagesse" },
  { number: 72, meaningFr: "Celui qui retarde", explanation: "Celui qui diffère les événements et les décrets jusqu'au moment opportun.", category: "Justice & Sagesse" },
  { number: 73, meaningFr: "Le Premier sans commencement", explanation: "Celui qui existait avant toute chose créée.", category: "Éternité & Subsistance" },
  { number: 74, meaningFr: "Le Dernier sans fin", explanation: "Celui qui subsistera éternellement après la fin de toute chose.", category: "Éternité & Subsistance" },
  { number: 75, meaningFr: "Le Manifeste, L'Apparent", explanation: "Celui dont les signes et les preuves de l'existence éclatent partout.", category: "Science & Connaissance" },
  { number: 76, meaningFr: "Le Caché, Le Mystérieux", explanation: "Celui que les regards ne peuvent saisir dans Sa réalité profonde.", category: "Science & Connaissance" },
  { number: 77, meaningFr: "Le Maître régent", explanation: "Celui qui administre et gouverne toute la création avec autorité.", category: "Souveraineté & Majesté" },
  { number: 78, meaningFr: "Le Très-Exalté", explanation: "Celui qui transcende toute pensée, attribut imparfait ou défaut.", category: "Souveraineté & Majesté" },
  { number: 79, meaningFr: "Le Bienfaisant, La Source de bonté", explanation: "Celui dont la bonté, la douceur et la bienveillance sont incommensurables.", category: "Miséricorde & Bienveillance" },
  { number: 80, meaningFr: "L'Accueillant au repentir", explanation: "Celui qui accepte sans cesse le retour sincère de Ses serviteurs.", category: "Pardon & Clémence" },
  { number: 81, meaningFr: "Le Vengeur légitime", explanation: "Celui qui rétribue justement les tyrans et les oppresseurs impénitents.", category: "Justice & Équité" },
  { number: 82, meaningFr: "L'Indulgent qui efface", explanation: "Celui qui efface complètement les péchés comme s'ils n'avaient jamais existé.", category: "Pardon & Clémence" },
  { number: 83, meaningFr: "Le Très-Compatissant", explanation: "D'une tendresse et d'une pitié infinies envers Ses créatures.", category: "Miséricorde & Bienveillance" },
  { number: 84, meaningFr: "Le Maître du Royaume", explanation: "Le Propriétaire souverain de tout l'univers et de tout ce qu'il renferme.", category: "Souveraineté & Majesté" },
  { number: 85, meaningFr: "Le Détenteur de Majesté et de Noblesse", explanation: "Le Seul digne de vénération, d'honneur suprême et d'adoration.", category: "Souveraineté & Majesté" },
  { number: 86, meaningFr: "L'Équitable suprême", explanation: "Celui qui rend justice à l'opprimé face à l'oppresseur.", category: "Justice & Équité" },
  { number: 87, meaningFr: "Le Rassembleur", explanation: "Celui qui rassemblera toute l'humanité pour le Jour sans doute.", category: "Justice & Équité" },
  { number: 88, meaningFr: "Le Riche absolu", explanation: "Celui qui se suffit à Lui-même et n'a besoin d'aucune créature.", category: "Générosité & Bienfaits" },
  { number: 89, meaningFr: "Celui qui enrichit", explanation: "Celui qui comble Ses serviteurs de richesses matérielles et spirituelles.", category: "Générosité & Bienfaits" },
  { number: 90, meaningFr: "Le Défenseur, Celui qui empêche", explanation: "Celui qui préserve du mal et retient ce qui pourrait nuire selon Sa sagesse.", category: "Protection & Vigilance" },
  { number: 91, meaningFr: "Celui qui permet l'adversité", explanation: "Celui qui décrète les épreuves pour éprouver, purifier et enseigner la patience.", category: "Justice & Sagesse" },
  { number: 92, meaningFr: "L'Auteur du profit et du bien", explanation: "La Source de tout bénéfice, guérison et utilité dans l'existence.", category: "Générosité & Bienfaits" },
  { number: 93, meaningFr: "La Lumière", explanation: "Celui qui illumine les cieux, la terre et les cœurs des croyants.", category: "Pureté & Perfection" },
  { number: 94, meaningFr: "Le Guide", explanation: "Celui qui guide les âmes vers la vérité, la droiture et la paix.", category: "Miséricorde & Bienveillance" },
  { number: 95, meaningFr: "Le Créateur admirable et incomparable", explanation: "Celui qui a conçu l'univers avec une créativité et une harmonie sans égales.", category: "Création & Puissance" },
  { number: 96, meaningFr: "Le Permanent, L'Éternel", explanation: "Celui dont l'existence ne connaît aucune fin ni altération.", category: "Éternité & Subsistance" },
  { number: 97, meaningFr: "L'Héritier de tout", explanation: "Celui à qui reviendra tout le cosmos lorsque la création aura disparu.", category: "Éternité & Subsistance" },
  { number: 98, meaningFr: "Le Guide droit, Le Parfaitement avisé", explanation: "Celui dont tous les actes et décrets conduisent infailliblement au bien.", category: "Justice & Sagesse" },
  { number: 99, meaningFr: "Le Très-Patient", explanation: "Celui dont la patience infinie embrasse la création sans précipitation.", category: "Pardon & Clémence" }
];

async function main() {
  console.log('Fetching 99 Names of Allah from Aladhan API...');
  const res = await fetch('https://api.aladhan.com/v1/asmaAlHusna');
  const json = await res.json();
  const apiData = json.data;

  if (!Array.isArray(apiData) || apiData.length < 99) {
    throw new Error('Could not fetch 99 names from API');
  }

  const combined = apiData.map(item => {
    const fr = FRENCH_NAMES.find(f => f.number === item.number) || {};
    return {
      number: item.number,
      arabic: item.name,
      transliteration: item.transliteration,
      meaningEn: item.en?.meaning || '',
      meaningFr: fr.meaningFr || item.en?.meaning || '',
      explanationFr: fr.explanation || '',
      category: fr.category || 'Général'
    };
  });

  const categories = [...new Set(combined.map(c => c.category))];

  const tsOutput = `import { LearningTopic, Section } from '../types/learning';

export interface NameOfAllah {
  number: number;
  arabic: string;
  transliteration: string;
  meaningEn: string;
  meaningFr: string;
  explanationFr: string;
  category: string;
}

export const NAMES_OF_ALLAH: NameOfAllah[] = ${JSON.stringify(combined, null, 2)};

// Groupement par thématiques pour la fiche pédagogique
const categories = ${JSON.stringify(categories, null, 2)};

const sections: Section[] = [
  {
    id: 'intro-hadith',
    heading: 'L\\'importance d\\'apprendre les 99 Noms',
    blocks: [
      {
        type: 'stats',
        items: [
          { label: 'Noms Divins', value: '99' },
          { label: 'Thématiques majeures', value: '10' },
          { label: 'Récompense promise', value: 'Le Paradis' },
        ],
      },
      {
        type: 'text',
        value: "D'après Abou Houreira (qu'Allah l'agrée), le Prophète ﷺ a dit : « Certes Allah a 99 noms, cent moins un, quiconque les apprend (les comprend, y croit et invoque Allah par eux) entrera au Paradis. » (Rapporté par Al-Bukhari et Muslim)",
      },
      {
        type: 'text',
        value: "« C'est à Allah qu'appartiennent les plus beaux Noms. Invoquez-Le par ces Noms. » (Sourate Al-A'raf, 180)",
      },
    ],
  },
  ...categories.map((cat, catIdx) => {
    const namesInCat = NAMES_OF_ALLAH.filter(n => n.category === cat);
    return {
      id: \`cat-\${catIdx + 1}\`,
      heading: \`\${cat} (\${namesInCat.length} Noms)\`,
      blocks: namesInCat.map(n => ({
        type: 'static-quote' as const,
        arabic: n.arabic,
        phonetic: \`\${n.number}. \${n.transliteration}\`,
        translation: \`« \${n.meaningFr} » — \${n.explanationFr}\`,
        citation: \`Nom Divin n°\${n.number}\`,
      })),
    };
  }),
];

export const NAMES_OF_ALLAH_TOPIC: LearningTopic = {
  id: 'noms-allah',
  format: 'fiche',
  title: "Les 99 Noms d'Allah (Al-Asmâ al-Husnâ)",
  subtitle: 'Connaître son Créateur pour fortifier son amour, son recueillement et son adoration',
  category: 'noms',
  icon: '🌟',
  gradient: 'linear-gradient(135deg, #0284c7 0%, #38bdf8 100%)',
  badge: '99 Noms Divins',
  summary: "L'ensemble complet des 99 Noms d'Allah avec calligraphie arabe, translittération phonétique et sens spirituel en français.",
  quizCategoryTarget: 'Mélange',
  revision: 1,
  sections,
};
`;

  const outputPath = path.resolve(__dirname, '../../frontend/src/data/namesOfAllahData.ts');
  fs.writeFileSync(outputPath, tsOutput, 'utf8');
  console.log('✅ Generated frontend/src/data/namesOfAllahData.ts');

  // Also save a JSON in backend for seeding and backend routes
  const backendJsonPath = path.resolve(__dirname, '../data/asmaAlHusna.json');
  fs.mkdirSync(path.dirname(backendJsonPath), { recursive: true });
  fs.writeFileSync(backendJsonPath, JSON.stringify(combined, null, 2), 'utf8');
  console.log('✅ Generated backend/data/asmaAlHusna.json');
}

main().catch(console.error);
