// src/assets/plants/index.js
import wheatSeed from "./wheat-seed.png";    // Семя
import wheatHarvest from "./wheat.png";      // Урожай
import cornSeed from "./corn-seed.png";
import cornHarvest from "./corn.png";
import tomatoSeed from "./tomato-seed.png";
import tomatoHarvest from "./tomato.png";
import sunflowerSeed from "./sunflower-seed.png";
import sunflowerHarvest from "./sunflower.png";

// ✅ Маппинг по API slug
export const plantIcons = {
  // Семена (API plant.slug)
  "wheat": wheatSeed,
  "corn": cornSeed, 
  "tomato": tomatoSeed,
  "sunflower": sunflowerSeed,
  
  // Урожай (API harvest_slug)
  "wheat-harvest": wheatHarvest,
  "corn-harvest": cornHarvest,
  "tomato-harvest": tomatoHarvest,
  "sunflower-harvest": sunflowerHarvest,
};