// Иконки зданий. Имя файла = BuildingType.slug из API: mill.svg, chicken-coop.svg …
// Чтобы добавить здание, достаточно положить файл в эту папку — менять этот код не нужно.
// Поддерживаются .svg, .webp и .png; при совпадении имён .svg важнее.
const files = import.meta.glob("./*.{svg,webp,png}", { eager: true, import: "default" });
const order = (path) => (path.endsWith(".svg") ? 1 : 0); // svg обрабатывается последним и перекрывает растр

export const buildingIcons = {};
for (const [path, url] of Object.entries(files).sort((a, b) => order(a[0]) - order(b[0]))) {
  buildingIcons[path.replace(/^\.\//, "").replace(/\.(svg|webp|png)$/, "")] = url;
}
