import { useState, useEffect } from "react";
import { api } from "../../shared/services/api";
import PlantIcon from "../../components/PlantIcon";
import BuildingLevel from "./BuildingLevel";
import { isPlotReady, plotReadyAt } from "./plots";
import "./SeedSelectModal.css";

export default function SeedSelectModal({
  isOpen, onClose, buildingId, building, coins, onUpgrade, plots, onPlant, onHarvest, onSell, isPremium, onStartMulti,
}) {
  const [seeds, setSeeds] = useState([]);
  // Одиночная посадка — одно поле; множественная (Премиум) — то же семя и на другие поля кликом по карте
  const [multi, setMulti] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [now, setNow] = useState(() => Date.now());
  // Только что собранный урожай: окно остаётся открытым и предлагает повторить посадку или выбрать другие семена
  const [harvested, setHarvested] = useState(null);

  // Одно поле — одна посадка — один тип урожая (собранная уже не считается, даже пока список не обновился)
  const plot = plots?.find((p) => p.building_id === buildingId && p.id !== harvested?.plotId) || null;

  // Иконки: семя — при посадке и росте, готовый продукт — когда урожай созрел
  const seedOf = (plot) => {
    const seed = seeds.find((s) => s.id === plot?.seed_id);
    return seed ? { name: seed.name, slug: seed.slug } : { name: plot?.seed_name, slug: "" };
  };
  const harvestOf = (plot) => {
    const seed = seeds.find((s) => s.id === plot?.seed_id);
    return seed?.harvest_slug
      ? { name: seed.harvest_name, slug: seed.harvest_slug }
      : seedOf(plot);
  };
  // Созревание — по часам браузера, не дожидаясь опроса сервера
  const ready = plot ? isPlotReady(plot, now) : false;
  const hasActiveProcess = Boolean(plot) && !ready;
  
  async function handleSell() {
    if (buildingId && hasActiveProcess) {
      alert("Нельзя продать здание с активными процессами!");
      return;
    }
    if (buildingId && confirm("Вы уверены, что хотите продать это здание?")) {
      await onSell(buildingId);
      onClose();
    }
  }

  useEffect(() => {
    if (isOpen) {
      setHarvested(null);
      loadSeeds();
    }
  }, [isOpen]);

  // Таймер обратного отсчета: тикает, пока в окне есть растущие посадки
  useEffect(() => {
    if (!isOpen || !hasActiveProcess) return undefined;
    setNow(Date.now());
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [isOpen, hasActiveProcess]);

  async function loadSeeds() {
    try {
      setLoading(true);
      const res = await api.get("/api/shop/seeds/");
      setSeeds(res.data.results || res.data || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function handlePlant(seedId) {
    if (!buildingId) {
      alert("Ошибка: ID здания не определен");
      return;
    }
    try {
      if (multi && isPremium) {
        const res = await onPlant(buildingId, seedId, { multi: true });
        const seed = seeds.find((s) => s.id === seedId);
        if (res?.success && seed) onStartMulti?.(seed);
        return;
      }
      await onPlant(buildingId, seedId);
    } catch (e) {
      console.error("Plant error:", e);
      alert("Ошибка посадки: " + (e?.response?.data?.detail || e?.message || "Unknown"));
    }
  }

  async function handleHarvest(harvestPlot) {
    try {
      const res = await api.post("/api/iso/harvest/", { plot_id: harvestPlot.id });
      setHarvested({
        plotId: harvestPlot.id,
        seedId: harvestPlot.seed_id,
        seedName: harvestPlot.seed_name,
        itemName: res.data.harvest?.item_name,
        quantity: res.data.harvest?.quantity,
      });
      onHarvest?.();
    } catch (e) {
      alert("Ошибка сбора: " + (e?.response?.data?.detail || e?.message || "Unknown"));
    }
  }

  function formatTime(ms) {
    const hours = Math.floor(ms / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((ms % (1000 * 60)) / 1000);
    const parts = [];
    if (hours > 0) parts.push(`${hours}ч`);
    if (minutes > 0) parts.push(`${minutes}м`);
    parts.push(`${seconds}с`);
    return parts.join(" ");
  }

  if (!isOpen) return null;

  return (
    <div className="seed-modal-overlay" onClick={onClose}>
      <div className="seed-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="seed-modal-header">
          <h2>🌾 Фермерское поле</h2>
          <div className="seed-modal-header-actions">
            <button className="seed-modal-close" onClick={onClose}>&times;</button>
          </div>
        </div>

        <div className="seed-modal-body">
          {/* Готовый урожай - кнопка сбора */}
          {plot && ready && (
            <div className="harvest-ready">
              <div className="harvest-icon">
                <PlantIcon plant={harvestOf(plot)} size={40} />
              </div>
              <div className="harvest-text">
                <div className="harvest-title">Урожай готов!</div>
                <div className="harvest-seed">{plot.seed_name}</div>
              </div>
              <button className="harvest-btn" onClick={() => handleHarvest(plot)}>
                Собрать
              </button>
            </div>
          )}
          
          {/* Растёт - таймер */}
          {hasActiveProcess && (
            <div className="growing-timer">
              <div className="timer-icon">
                <PlantIcon plant={seedOf(plot)} size={40} />
              </div>
              <div className="timer-info">
                <div className="timer-title">Растёт...</div>
                <div className="timer-seed">{plot.seed_name}</div>
              </div>
              <div className="timer-countdown">
                <div className="timer-value">{formatTime(Math.max(0, plotReadyAt(plot) - now))}</div>
                <div className="timer-label">до созревания</div>
              </div>
            </div>
          )}
          
          {/* Кнопки Ускорить и Удобрить */}
          {hasActiveProcess && (
            <div className="plot-actions">
              <button className="action-btn accelerate-btn" onClick={() => alert("Ускорение будет доступно в будущем!")}>
                ⚡ Ускорить
              </button>
              <button className="action-btn fertilize-btn" onClick={() => alert("Удобрение будет доступно в будущем!")}>
                🌿 Удобрить
              </button>
            </div>
          )}
          
          {/* Урожай только что собран - повторить посадку или выбрать другие семена */}
          {!plot && harvested && (() => {
            const lastSeed = seeds.find((s) => s.id === harvested.seedId);
            return (
              <>
                {harvested.itemName && (
                  <div className="harvest-done">
                    ✅ Собрано: {harvested.itemName} × {harvested.quantity}
                  </div>
                )}
                <div className="plot-actions">
                  <button
                    className="action-btn replant-btn"
                    disabled={!lastSeed}
                    onClick={() => handlePlant(harvested.seedId)}
                  >
                    🔁 Повторить посадку
                    <span className="action-btn-sub">
                      {lastSeed ? `${lastSeed.name} · 💰 ${lastSeed.price_coins}` : harvested.seedName}
                    </span>
                  </button>
                  <button className="action-btn other-seeds-btn" onClick={() => setHarvested(null)}>
                    🌱 Выбрать другие семена
                  </button>
                </div>
              </>
            );
          })()}

          {/* Поле пустое - магазин семян */}
          {!plot && !harvested && (
            <>
              <div className="plant-mode">
                <button className={`plant-mode-btn ${!multi ? "active" : ""}`} onClick={() => setMulti(false)}>
                  🌱 Одиночная посадка
                </button>
                <button
                  className={`plant-mode-btn ${multi ? "active" : ""}`}
                  disabled={!isPremium}
                  onClick={() => setMulti(true)}
                  title={isPremium ? "Семя сажается сюда и на другие поля кликом по карте" : "Доступно с Премиумом"}
                >
                  🌾 Множественная 👑
                </button>
              </div>
              <div className="plant-mode-hint">
                {!isPremium
                  ? "Множественная посадка — с Премиумом: выбранное семя сажается и на другие поля одним кликом по карте."
                  : multi
                    ? "Выберите семя: оно посадится сюда, а дальше кликайте по пустым полям на карте. Выход — «Отмена» или Esc."
                    : "Одно поле — одна посадка."}
              </div>
              <div className="shop-title">Купить семена</div>
              
              {loading && <div className="seed-loading">Загрузка...</div>}
              {error && <div className="seed-error">{error}</div>}

              {!loading && !error && (
                <div className="seeds-grid">
                  {seeds.map((seed) => (
                    <div key={seed.id} className="seed-card" onClick={() => handlePlant(seed.id)}>
                      <div className="seed-card-icon">
                        <PlantIcon plant={seed} size={40} />
                      </div>
                      <div className="seed-card-name">{seed.name}</div>
                      <div className="seed-card-price">💰 {seed.price_coins}</div>
                      {seed.grow_time_minutes && (
                        <div className="seed-card-time">⏱ {seed.grow_time_minutes} мин</div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
          
          <BuildingLevel building={building} coins={coins} onUpgrade={onUpgrade} />

          <div className="modal-footer">
            <button 
              className="sell-btn" 
              onClick={handleSell}
              disabled={hasActiveProcess}
            >
              💰 Продать здание
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
