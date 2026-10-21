// Иконки культур подхватываются автоматически по имени файла в этой папке:
//
//   wheat-seed.svg  → семя        (slug товара "wheat")         — меню посадки, магазин семян
//   wheat.svg       → урожай      (slug товара "wheat_harvest") — инвентарь, рынок, сбор урожая
//
// Если одной из картинок нет, используется вторая. Поддерживаются .svg, .webp и .png;
// при совпадении имён .svg важнее.
// Чтобы добавить культуру, достаточно положить файлы — менять этот код не нужно.
const files = import.meta.glob("./*.{svg,webp,png}", { eager: true, import: "default" });
const order = (path) => (path.endsWith(".svg") ? 1 : 0); // svg обрабатывается последним и перекрывает растр

const seedIcons = {};
const harvestIcons = {};

for (const [path, url] of Object.entries(files).sort((a, b) => order(a[0]) - order(b[0]))) {
  const name = path.replace(/^\.\//, "").replace(/\.(svg|webp|png)$/, "");
  if (name.endsWith("-seed")) {
    seedIcons[name.slice(0, -"-seed".length)] = url;
  } else {
    harvestIcons[name] = url;
  }
}

const crops = new Set([...Object.keys(seedIcons), ...Object.keys(harvestIcons)]);

// slug товара → картинка
export const plantIcons = {};
for (const crop of crops) {
  plantIcons[crop] = seedIcons[crop] || harvestIcons[crop];
  plantIcons[`${crop}_harvest`] = harvestIcons[crop] || seedIcons[crop];
}
