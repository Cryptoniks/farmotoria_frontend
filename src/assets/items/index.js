// Иконки остальных товаров (ресурсы, переработка, корма, продукция).
// Имя файла = slug товара в API: wood.svg, iron-ingot.svg, sunflower_oil.svg …
// Чтобы добавить иконку, достаточно положить файл в эту папку.
const files = import.meta.glob("./*.{svg,webp,png}", { eager: true, import: "default" });

export const itemIcons = Object.fromEntries(
  Object.entries(files).map(([path, url]) => [path.replace(/^\.\//, "").replace(/\.(svg|webp|png)$/, ""), url])
);
