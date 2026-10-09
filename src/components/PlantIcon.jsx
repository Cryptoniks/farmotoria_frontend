import { plantIcons } from "../assets/plants";

// Маппинг slug товаров на эмодзи (фоллбэк если нет картинки)
const itemEmojis = {
  // Семена
  "wheat": "🌾", "corn": "🌽", "tomato": "🍅", "sunflower": "🌻",
  "cabbage": "🥬", "rutabaga": "🥔", "oats": "🌾", "peas": "🫛", "soy": "🫘",
  // Урожаи
  "wheat_harvest": "🌾", "corn_harvest": "🌽", "tomato_harvest": "🍅", "sunflower_harvest": "🌻",
  "cabbage_harvest": "🥬", "rutabaga_harvest": "🥔", "oats_harvest": "🌾", "peas_harvest": "🫛", "soy_harvest": "🫘",
  // Животноводство - продукты
  "eggs": "🐔", "pork": "🐷", "milk": "🐄", "wool": "🐑",
  // Животноводство - корм
  "chicken_food": "🌾", "pig_food": "🥕", "cow_food": "🌿", "sheep_food": "🌱",
  // Ресурсы
  "wood": "🪵", "stone": "🪨", "ore": "⛏️", "water": "💧",
  "board": "🪵", "iron-ingot": "⛓️", "stone-block": "🪨",
  // Переработка
  "flour": "🌾", "sunflower_oil": "🌻",
  // Производство
  "ketchup": "🍅", "bread": "🍞",
};

function PlantIcon({ plant, size = 16 }) {
  if (!plant) {
    return null;
  }

  // Сначала пробуем найти картинку
  const src = plantIcons[plant.slug];
  if (src) {
    return (
      <img
        src={src}
        alt={plant.name}
        style={{ width: size, height: size, objectFit: "contain" }}
      />
    );
  }

  // Фоллбэк на эмодзи
  const emoji = itemEmojis[plant.slug];
  if (emoji) {
    return (
      <span style={{ fontSize: size, lineHeight: 1 }}>
        {emoji}
      </span>
    );
  }

  // Дефолтная иконка
  return (
    <span style={{ fontSize: size, lineHeight: 1 }}>
      📦
    </span>
  );
}

export default PlantIcon;