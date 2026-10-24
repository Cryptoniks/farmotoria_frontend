// Генератор стандартных картинок зданий (src/assets/buildings/<slug>.svg).
//
// Рисунки описаны в src/features/farm/buildingArt — тот же код рисует в игре варианты внешнего
// вида, которые выбирает игрок. Этот скрипт сохраняет стандартный вид каждого здания в файлы.
//
//   node tools/gen_buildings.mjs            # перезаписать src/assets/buildings/*.svg
//   node tools/gen_buildings.mjs <папка>    # сохранить в другую папку (например, для сравнения)
//   node tools/gen_buildings.mjs <папка> --variants 6   # + по 6 случайных вариантов (новая форма и цвета)
//
// Новое здание: стандартный рисунок в buildingArt/classic.js и рецепт в buildingArt/procedural.js
// (размеры как в seed_game_data.py на бэкенде).
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { CLASSIC, randomSeed, renderBuildingSvg } from "../src/features/farm/buildingArt/index.js";

const root = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const variantsAt = args.indexOf("--variants");
const variants = variantsAt >= 0 ? Number(args[variantsAt + 1]) || 4 : 0;
const outDir = resolve(args[0] && !args[0].startsWith("--") ? args[0] : join(root, "..", "src", "assets", "buildings"));

mkdirSync(outDir, { recursive: true });
let count = 0;
for (const slug of Object.keys(CLASSIC)) {
  writeFileSync(join(outDir, `${slug}.svg`), renderBuildingSvg(slug));
  count++;
  for (let i = 1; i <= variants; i++) {
    const look = { v: 2, shape: randomSeed(), details: randomSeed(), colors: null };
    writeFileSync(join(outDir, `${slug}--v${i}.svg`), renderBuildingSvg(slug, look));
    count++;
  }
}
console.log(`generated ${count} → ${outDir}`);
