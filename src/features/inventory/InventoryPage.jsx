import { useEffect, useState } from "react";
import { api } from "../../shared/services/api";
import { useNavigate } from "react-router-dom";
import "../../styles/InventoryPage.css";
import PlantIcon from "../../components/PlantIcon";

function InventoryPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const access = localStorage.getItem("access");
    if (!access) {
      navigate("/login");
      return;
    }

    api
      .get("/api/inventory/", {
        headers: { Authorization: `Bearer ${access}` },
      })
      .then((res) => {
        console.log("🛒 INVENTORY API:", res.data);
        setItems(res.data || []);
      })
      .catch((err) => {
        console.error("❌ Inventory error:", err.response?.data);
        setStatus("Ошибка загрузки инвентаря");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [navigate]);

  // ✅ API структура: [{id, item: {id, name, slug, ...}, quantity}]
  const getItemPlant = (item) => {
    return {
      name: item.item?.name,
      slug: item.item?.slug,
      image_url: item.item?.image_url  // Fallback для PlantIcon
    };
  };

  const getItemName = (item) => item.item?.name || "Неизвестно";

  const getItemTypeLabel = (item) => {
    const shopItem = item.item;
    if (shopItem?.is_seed) return { icon: "🌱", label: "Семена", color: "#4caf50" };
    if (shopItem?.is_harvest) return { icon: "🌾", label: "Сельхозпродукция", color: "#4caf50" };
    if (shopItem?.is_resource) return { icon: "⚒️", label: "Ресурсы", color: "#ff9800" };
    return { icon: "🏭", label: "Продукты", color: "#2196f3" };
  };

  // Состояние загрузки
  if (loading) {
    return (
      <div className="inventory-page">
        <p>Загрузка инвентаря...</p>
      </div>
    );
  }

  return (
    <div className="inventory-page">
      <h2>Инвентарь ({items.length} предметов)</h2>

      {items.length === 0 && <p className="inventory-empty">Инвентарь пуст</p>}

      {items.length > 0 && (
        <table className="inventory-table">
          <thead>
            <tr>
              <th>Иконка</th>
              <th>Название</th>
              <th>Количество</th>
              <th>Тип</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => {
              const plant = getItemPlant(item);
              return (
                <tr key={item.id}>
                  <td>
                    <PlantIcon plant={plant} size={32} />
                  </td>
                  <td>{getItemName(item)}</td>
                  <td style={{ fontWeight: "bold", color: "#10b981" }}>
                    {item.quantity}
                  </td>
                  <td>
                    <span style={{ color: getItemTypeLabel(item).color }}>
                      {getItemTypeLabel(item).icon} {getItemTypeLabel(item).label}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      {status && <p className="inventory-status">{status}</p>}
    </div>
  );
}

export default InventoryPage;