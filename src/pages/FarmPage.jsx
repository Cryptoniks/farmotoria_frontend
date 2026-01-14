import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";
import "../styles/FarmPage.css";
import PlantIcon from "../components/PlantIcon";

const GRID_SIZE = 10;

function PlantRow({ plant, seedsCount, isSelected, onClick }) {
  return (
    <div className={`plant-row ${isSelected ? "plant-row--selected" : ""}`} onClick={onClick}>
      <PlantIcon plant={plant} size={24} />  {/* ✅ Передаем plant целиком */}
      <span>{plant.name}</span>  {/* "Семена пшеницы" */}
      {plant.harvest_name && (
        <small style={{color: "#666", fontSize: "11px"}}>
          ➜ {plant.harvest_name}  {/* "➜ Пшеница" */}
        </small>
      )}
      <span style={{ marginLeft: "8px" }}>
        ⏱ {plant.grow_time_minutes} мин | 🌾 {seedsCount || 0} | 💰 {plant.price_coins}
      </span>
    </div>
  );
}

function FarmPage() {
  const navigate = useNavigate();

  const [grid, setGrid] = useState([]);
  const [plants, setPlants] = useState([]);
  const [seeds, setSeeds] = useState({});
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  const [selectedCell, setSelectedCell] = useState(null);
  const [selectedPlantId, setSelectedPlantId] = useState(null);
  const [activeCell, setActiveCell] = useState(null);
  const [autoBuySeeds, setAutoBuySeeds] = useState(true);

  useEffect(() => {
    const access = localStorage.getItem("access");
    if (!access) {
      navigate("/login");
      return;
    }

    const loadData = async () => {
      try {
        const emptyGrid = Array.from({ length: GRID_SIZE }, (_, row) =>
          Array.from({ length: GRID_SIZE }, (_, col) => ({
            row,
            col,
            plant: null,
            planted_at: null,
            remaining_seconds: null,
          }))
        );

        const cellsRes = await api.get("/api/field/cells/", {
          headers: { Authorization: `Bearer ${access}` },
        });

        cellsRes.data.forEach((cell) => {
          if (emptyGrid[cell.row]?.[cell.col]) {
            emptyGrid[cell.row][cell.col] = {
              ...emptyGrid[cell.row][cell.col],
              ...cell,
            };
          }
        });

        setGrid(emptyGrid);

        const plantsRes = await api.get("/api/plants/", {
          headers: { Authorization: `Bearer ${access}` },
        });
        setPlants(plantsRes.data);

        const inventoryRes = await api.get("/api/inventory/", {
          headers: { Authorization: `Bearer ${access}` },
        });

        const map = {};
        inventoryRes.data.forEach((item) => {
          if (item.seed?.plant) {
            map[item.seed.plant.id] =
              (map[item.seed.plant.id] || 0) + item.quantity;
          }
        });
        setSeeds(map);
      } catch (e) {
        console.error(e);
        setStatus("Ошибка загрузки поля");
      }
    };

    loadData();
  }, [navigate]);

  useEffect(() => {
    if (!grid.length) return;

    const interval = setInterval(() => {
      setGrid((prev) =>
        prev.map((row) =>
          row.map((cell) => {
            // ✅ Если есть planted_at + grow_duration_seconds → считаем реальное время
            if (cell.planted_at && cell.grow_duration_seconds !== null && cell.grow_duration_seconds !== undefined) {
              const plantedTime = new Date(cell.planted_at).getTime() / 1000;
              const readyTime = plantedTime + cell.grow_duration_seconds;
              const now = Date.now() / 1000;
              const remaining = Math.max(Math.floor(readyTime - now), 0);
              return { ...cell, remaining_seconds: remaining };
            }
            // Иначе используй старый remaining_seconds
            if (!cell.plant || cell.remaining_seconds == null) return cell;
            return {
              ...cell,
              remaining_seconds: Math.max(cell.remaining_seconds - 1, 0),
            };
          })
        )
      );
    }, 1000);

    return () => clearInterval(interval);
  }, [grid.length]);

  useEffect(() => {
    if (!activeCell) return;
    const updated = grid[activeCell.row]?.[activeCell.col];
    if (updated) setActiveCell(updated);
  }, [grid, activeCell?.row, activeCell?.col]);

  const handleCellClick = (row, col) => {
    const cell = grid[row][col];

    if (cell.plant) {
      setActiveCell(cell);
      setSelectedCell(null);
    } else {
      setSelectedCell({ row, col });
      setActiveCell(null);
      setError("");
      const firstPlant = plants[0];
      setSelectedPlantId(firstPlant ? firstPlant.id : null);
    }
  };

  const handlePlantSave = async () => {
    if (!selectedCell || !selectedPlantId) return;
    const access = localStorage.getItem("access");

    try {
      const res = await api.post(
        "/api/field/cells/action/",
        {
          row: selectedCell.row,
          col: selectedCell.col,
          plant_id: selectedPlantId,
          auto_buy: autoBuySeeds,
        },
        { headers: { Authorization: `Bearer ${access}` } }
      );

      // ✅ ✅ ✅ ФИКС: Полная перезагрузка grid + seeds после посадки
      const accessToken = access; // Для reload
      const reloadData = async () => {
        try {
          // Перезагружаем клетки
          const cellsRes = await api.get("/api/field/cells/", {
            headers: { Authorization: `Bearer ${accessToken}` },
          });
          const emptyGrid = Array.from({ length: GRID_SIZE }, (_, row) =>
            Array.from({ length: GRID_SIZE }, (_, col) => ({
              row, col, plant: null, planted_at: null, remaining_seconds: null,
            }))
          );
          cellsRes.data.forEach((cell) => {
            if (emptyGrid[cell.row]?.[cell.col]) {
              emptyGrid[cell.row][cell.col] = { ...emptyGrid[cell.row][cell.col], ...cell };
            }
          });
          setGrid(emptyGrid);

          // Перезагружаем семена
          const inventoryRes = await api.get("/api/inventory/", {
            headers: { Authorization: `Bearer ${accessToken}` },
          });
          const newSeeds = {};
          inventoryRes.data.forEach((item) => {
            if (item.seed?.plant) {
              newSeeds[item.seed.plant.id] = (newSeeds[item.seed.plant.id] || 0) + item.quantity;
            }
          });
          setSeeds(newSeeds);
        } catch (e) {
          console.error("Reload error:", e);
        }
      };

      await reloadData();  // ✅ Полная синхронизация

      setSelectedCell(null);
      setSelectedPlantId(null);
      setStatus("✅ Растение посажено!");
      setError("");
    } catch (err) {
      setError(err.response?.data?.detail || "Ошибка посадки");
    }
  };

  const handleHarvest = async () => {
    if (!activeCell?.plant?.is_ready) return;

    // 🔑 Проверяем токен
    let access = localStorage.getItem("access");
    if (!access) {
      setStatus("Необходима авторизация");
      navigate("/login");
      return;
    }

    try {
      const res = await api.post(
        "/api/field/cells/action/",
        {
          row: activeCell.row,
          col: activeCell.col,
          plant_id: null,
        },
        {
          headers: { 
            Authorization: `Bearer ${access}`  // ✅ Явно передаем
          }
        }
      );

      // ✅ Обновляем грид
      const updated = res.data.cell;
      setGrid(prev => prev.map(row => 
        row.map(cell => 
          cell.row === updated.row && cell.col === updated.col 
            ? updated 
            : cell
        )
      ));

      // ✅ Уведомление с опытом
      const harvestMsg = res.data.harvest_added 
        ? `Собрано ${res.data.harvest_added.quantity} ${res.data.harvest_added.item}`
        : "Урожай собран";
      
      const expMsg = res.data.harvest_added?.exp_gained 
        ? ` +${res.data.harvest_added.exp_gained} опыта` 
        : "";
      
      setStatus(harvestMsg + expMsg);
      setActiveCell(null);

    } catch (err) {
      console.error("🚜 Harvest error:", err.response?.status, err.response?.data);
      
      // 🔄 401 = токен протух → автообновление
      if (err.response?.status === 401) {
        try {
          const refreshToken = localStorage.getItem("refresh");
          if (!refreshToken) throw new Error("No refresh token");
          
          const refreshRes = await api.post("/api/auth/token/refresh/", {
            refresh: refreshToken
          });
          
          // 🔄 Новый токен
          localStorage.setItem("access", refreshRes.data.access);
          access = refreshRes.data.access;
          
          // 🔄 Повторяем сбор
          const retryRes = await api.post(
            "/api/field/cells/action/",
            {
              row: activeCell.row,
              col: activeCell.col,
              plant_id: null,
            },
            { headers: { Authorization: `Bearer ${access}` } }
          );
          
          // ✅ Успех после ретрая
          const updated = retryRes.data.cell;
          setGrid(prev => prev.map(row => 
            row.map(cell => 
              cell.row === updated.row && cell.col === updated.col 
                ? updated 
                : cell
            )
          ));
          
          setStatus("✅ Урожай собран (токен обновлен)");
          setActiveCell(null);
          
        } catch (refreshErr) {
          console.error("🔓 Refresh failed:", refreshErr);
          localStorage.clear();
          navigate("/login");
          setStatus("Сессия истекла. Входите заново.");
        }
        return;
      }
      
      // Другие ошибки
      setStatus(err.response?.data?.detail || "Ошибка сбора урожая");
    }
  };

  if (!grid.length) {
    return <p>Загрузка поля...</p>;
  }

  return (
    <div className="farm-page">
      <h2>Фермерское поле</h2>

      <div className="farm-layout">
        <div className="farm-grid">
          {grid.flat().map((cell) => (
            <div
              key={`${cell.row}-${cell.col}`}
              onClick={() => handleCellClick(cell.row, cell.col)}
              title={cell.plant?.name || "Пусто"}
              className={`farm-cell ${cell.plant ? "farm-cell--planted" : ""}`}
            >
              {cell.plant && (
                <>
                  <PlantIcon plant={cell.plant} size="100%" />

                  <span className="farm-cell-label">
                    {cell.remaining_seconds > 0
                      ? `${Math.floor(cell.remaining_seconds / 60)
                          .toString()
                          .padStart(2, "0")}:${(cell.remaining_seconds % 60)
                          .toString()
                          .padStart(2, "0")}`
                      : <span class="farm-check">✔</span>}
                  </span>
                </>
              )}
            </div>
          ))}
        </div>

        <div className="farm-info">
          <h3>Информация о поле</h3>
          {activeCell?.plant ? (  // ✅ Только plant (уже содержит урожай)
            <>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <PlantIcon plant={activeCell.plant} size={32} />
                <span>{activeCell.plant.name}</span>
                {activeCell.plant.type === "harvest" && (
                  <span style={{color: "#28a745"}}>
                    🌾 ×{activeCell.plant.description.match(/×(\d+)/)?.[1] || 1}
                  </span>
                )}
              </div>

              <p>{activeCell.plant.description}</p>

              <p>
                ⏱ {activeCell.remaining_seconds > 0
                  ? `До созревания: ${Math.floor(activeCell.remaining_seconds / 60).toString().padStart(2, "0")}:${(activeCell.remaining_seconds % 60).toString().padStart(2, "0")}`
                  : "✔ Готово к сбору!"
                }
              </p>

              {activeCell.plant.is_ready && (
                <button onClick={handleHarvest}>Собрать урожай</button>
              )}
            </>
          ) : (
            <p>Выберите клетку</p>
          )}
        </div>
      </div>

      <p>{status}</p>

      {selectedCell && (
        <div className="farm-modal-backdrop" onClick={() => setSelectedCell(null)}>
          <div
            className="farm-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <h3>
              Посадка ({selectedCell.row},{selectedCell.col})
            </h3>

            <div className="farm-plant-list">
              {plants.map((p) => (
                <PlantRow
                  key={p.id}
                  plant={p}
                  seedsCount={seeds[p.id]}
                  isSelected={selectedPlantId === p.id}
                  onClick={() => setSelectedPlantId(p.id)}
                />
              ))}
            </div>

            <div className="farm-modal-autobuy">
              <label>
                <input
                  type="checkbox"
                  checked={autoBuySeeds}
                  onChange={(e) => setAutoBuySeeds(e.target.checked)}
                />{" "}
                Автопокупка семян при нехватке
              </label>
            </div>

            {error && <p className="farm-modal-error">{error}</p>}

            <button onClick={handlePlantSave}>Посадить</button>
            <button onClick={() => setSelectedCell(null)}>Отмена</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default FarmPage;