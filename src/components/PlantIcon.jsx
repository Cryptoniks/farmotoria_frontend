import { plantIcons } from "../assets/plants";

function PlantIcon({ plant, size = 16 }) {
  if (!plant) {
    return null; // нет данных о растении — не рисуем иконку
  }

  const src = plantIcons[plant.slug];
  if (!src) return null;

  return (
    <img
      src={src}
      alt={plant.name}
      style={{ width: size, height: size, objectFit: "contain" }}
    />
  );
}

export default PlantIcon;