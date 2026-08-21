const mongoose = require('mongoose');
const Recipe = require('../models/Recipe');
const Counter = require('../models/Counter');
const User = require('../models/User');

const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/opskrifter_test';

const recipes = [
  {
    titel: 'Cremet tomatsuppe',
    ingredienser: ['2 dåser hakkede tomater', '1 løg', '2 fed hvidløg', '2 dl fløde'],
    instructions: 'Svits løg og hvidløg. Tilsæt tomater, lad suppen simre, blend og rund af med fløde.',
    tags: ['suppe', 'nem', 'vegetarisk'],
    how_many_servings: 4,
    til_servering: ['Brød', 'Frisk basilikum']
  },
  {
    titel: 'Koldhævede morgenboller',
    ingredienser: ['5 dl koldt vand', '10 g gær', '650 g hvedemel', '2 tsk salt'],
    instructions: 'Rør dejen sammen og stil den på køl natten over. Sæt bollerne på en plade og bag dem ved høj varme.',
    tags: ['bagning', 'morgenmad'],
    how_many_servings: 10
  },
  {
    titel: 'Grøn pastaret',
    ingredienser: ['400 g pasta', '1 broccoli', '150 g spinat', '1 citron', 'Parmesan'],
    instructions: 'Kog pastaen. Steg grøntsagerne, vend pastaen i og smag til med citron og parmesan.',
    tags: ['pasta', 'hurtig', 'vegetarisk'],
    how_many_servings: 4
  }
];

const counters = [
  {
    name: 'Blå sweater',
    count: 24,
    decreasePlan: { startStitches: 90, decreasesPerRound: 6, decreaseRounds: 11, interval: 2 },
    status: 'in_progress',
    pattern: { name: 'Sweater med rundt bærestykke', url: 'https://www.garnstudio.com/' },
    yarn: {
      brand: 'DROPS', name: 'Merino Extra Fine', color: 'Blå', dyeLot: 'Test 24',
      metersPerSkein: 105, gramsPerSkein: 50, skeinsUsed: 4.5
    },
    needleSize: 4,
    projectSize: 'M',
    gauge: '21 masker x 28 pinde = 10 cm'
  },
  { name: 'Stribede sokker', count: 8 },
  { name: 'Grønt halstørklæde', count: 41 }
];

async function seed() {
  await mongoose.connect(mongoUri);
  const owner = await User.findOne().sort({ createdAt: 1 });

  for (const recipe of recipes) {
    await Recipe.findOneAndUpdate(
      { titel: recipe.titel },
      { $set: recipe },
      { upsert: true, runValidators: true }
    );
  }

  for (const counter of counters) {
    const ownerFilter = owner ? { ownerId: owner._id } : { ownerId: { $exists: false } };
    const update = { $setOnInsert: { name: counter.name, count: counter.count, ...(owner ? { ownerId: owner._id } : {}) } };
    const { name, count, ...projectDetails } = counter;
    if (Object.keys(projectDetails).length) update.$set = projectDetails;
    await Counter.findOneAndUpdate(
      { name: counter.name, ...ownerFilter },
      update,
      { upsert: true, runValidators: true }
    );
  }

  await Counter.updateOne(
    { name: 'Blå sweater', ...(owner ? { ownerId: owner._id } : { ownerId: { $exists: false } }), 'notes.text': { $ne: 'Prøvelappen passede efter vask. Jeg fortsætter på pind 4 mm.' } },
    { $push: { notes: { text: 'Prøvelappen passede efter vask. Jeg fortsætter på pind 4 mm.' } } }
  );

  console.log(`Testdata klar: ${recipes.length} opskrifter og ${counters.length} tællere.`);
  await mongoose.disconnect();
}

seed().catch(async error => {
  console.error('Testdata kunne ikke oprettes:', error.message);
  await mongoose.disconnect();
  process.exit(1);
});
