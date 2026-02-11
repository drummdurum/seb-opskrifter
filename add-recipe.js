require('dotenv').config();
const mongoose = require('mongoose');
const Recipe = require('./models/Recipe');

const recipeData = {
  titel: "Tomatsuppe med suppenudler og hvidløgsostebrød",
  ingredienser: [
    "2 løg, finthakkede",
    "2 fed hvidløg, finthakkede",
    "1 porre, i tynde ringe",
    "1 tsk sød paprika",
    "1 tsk stødt spidskommen",
    "0,50 tsk mediumstærk karry",
    "3 kartofler, groftrevet",
    "3 gulerødder, groftrevet",
    "1200 g flåede tomater",
    "100 g koncentreret tomatpuré",
    "1 tsk tørret timian",
    "1 liter grøntsagsbouillon",
    "100 g suppenudler",
    "0,50 dl piskefløde",
    "2 spsk olivenolie",
    "1 tsk salt og friskkværnet peber",
    "--- Til hvidløgsostebrød ---",
    "8 skiver brød",
    "1 fed hvidløg",
    "125 g frisk mozzarella",
    "1 drys frisk timian"
  ],
  how_many_servings: 4,
  til_servering: [
    "1 dl cremefraiche 18 %",
    "1 håndfuld frisk timian"
  ],
  fremgangsmåde: [
    "Varm olie op i en gryde og sauter løg, hvidløg og porrer ved middelvarme, til de er bløde. Tilsæt paprika, spidskommen og karry og lad det stege med i et par minutter under omrøring.",
    "Tilsæt kartofler og gulerødder og dernæst flåede tomater, tomatpuré, timian og bouillon og lad det simre i 15-20 minutter.",
    "Blend suppen i en kraftig blender, til den er helt cremet og smag til med piskefløde, salt og peber. Kom suppen tilbage i gryden, tilsæt suppenudler og lad dem simre i et par minutter, til de er møre.",
    "Gnid brødskiverne med et overskåret hvidløgsfed og læg skiver af frisk mozzarella på brødskiverne. Sæt dem på en bageplade med bagepapir. Rist dem i en forvarmet ovn ved 200 grader, til osten er smeltet. Drys med friske timianblade.",
    "Kom den varme suppe i dybe tallerkener. Kom en god klat cremefraiche i suppen og drys med friske timianblade. Server de varme ostebrød til suppen."
  ],
  tags: ["soup", "vegan", "comfort-food"]
};

async function addRecipe() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Create and save recipe
    const recipe = new Recipe(recipeData);
    await recipe.save();
    
    console.log('✅ Recipe added successfully!');
    console.log(`   ID: ${recipe._id}`);
    console.log(`   Titel: ${recipe.titel}`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error adding recipe:', error.message);
    process.exit(1);
  }
}

addRecipe();
