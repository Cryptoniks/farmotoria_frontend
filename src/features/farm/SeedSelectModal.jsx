import { useState, useEffect } from "react";
import { api } from "../../shared/services/api";
import "./SeedSelectModal.css";

export default function SeedSelectModal({ isOpen, onClose, buildingId, plots, onPlant, onHarvest, onSell }) {
  const [seeds, setSeeds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [timeLeft, setTimeLeft] = useState(null);
  
  // Фильтруем посадки для текущего здания
  const buildingPlots = plots?.filter(p => p.building_id === buildingId) || [];
  const hasGrowing = buildingPlots.some(p => p.status === "growing");
  const growingPlot = buildingPlots.find(p => p.status === "growing");
  const readyPlot = buildingPlots.find(p => p.status === "ready");
  
  // Проверяем, есть ли активные процессы
  const hasActiveProcess = buildingPlots.some(p => p.status === "growing");
  
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
      loadSeeds();
    }
  }, [isOpen]);

  // Таймер обратного отсчета
  useEffect(() => {
    if (!growingPlot?.ready_at) {
      setTimeLeft(null);
      return;
    }
    
    const updateTimer = () => {
      const now = new Date();
      const ready = new Date(growingPlot.ready_at);
      const diff = ready - now;
      
      if (diff <= 0) {
        setTimeLeft(null);
        return;
      }
      
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      
      setTimeLeft({ hours, minutes, seconds, total: diff });
    };
    
    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [growingPlot?.ready_at]);

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
      await onPlant(buildingId, 0, 0, seedId);
    } catch (e) {
      console.error("Plant error:", e);
      alert("Ошибка посадки: " + (e?.message || e?.response?.data?.detail || "Unknown"));
    }
  }

  async function handleHarvest(plotId) {
    try {
      await api.post("/api/iso/harvest/", { plot_id: plotId });
      // Закрываем и обновляем данные через коллбэк
      onClose();
      if (onHarvest) {
        onHarvest();
      }
    } catch (e) {
      alert("Ошибка сбора: " + (e?.message || e?.response?.data?.detail || "Unknown"));
    }
  }

  function formatTime(hours, minutes, seconds) {
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
          <button className="seed-modal-close" onClick={onClose}>&times;</button>
        </div>

        <div className="seed-modal-body">
          {/* Если есть готовый урожай - показываем кнопку сбора */}
          {readyPlot && (
            <div className="harvest-ready">
              <div className="harvest-icon">🌾</div>
              <div className="harvest-text">
                <div className="harvest-title">Урожай готов!</div>
                <div className="harvest-seed">{readyPlot.seed_name}</div>
              </div>
              <button className="harvest-btn" onClick={() => handleHarvest(readyPlot.id)}>
                Собрать
              </button>
            </div>
          )}
          
          {/* Если растет - показываем таймер */}
          {growingPlot && !readyPlot && timeLeft && (
            <div className="growing-timer">
              <div className="timer-icon">🌱</div>
              <div className="timer-info">
                <div className="timer-title">Растёт...</div>
                <div className="timer-seed">{growingPlot.seed_name}</div>
              </div>
              <div className="timer-countdown">
                <div className="timer-value">{formatTime(timeLeft.hours, timeLeft.minutes, timeLeft.seconds)}</div>
                <div className="timer-label">до созревания</div>
              </div>
            </div>
          )}
          
          {/* Кнопки Ускорить и Удобрить */}
          {growingPlot && !readyPlot && (
            <div className="plot-actions">
              <button className="action-btn accelerate-btn" onClick={() => alert("Ускорение будет доступно в будущем!")}>
                ⚡ Ускорить
              </button>
              <button className="action-btn fertilize-btn" onClick={() => alert("Удобрение будет доступно в будущем!")}>
                🌿 Удобрить
              </button>
            </div>
          )}
          
          {/* Если ничего не растет - показываем магазин семян */}
          {!hasGrowing && !readyPlot && (
            <>
              <div className="shop-title">Купить семена</div>
              
              {loading && <div className="seed-loading">Загрузка...</div>}
              {error && <div className="seed-error">{error}</div>}

              {!loading && !error && (
                <div className="seeds-grid">
                  {seeds.map((seed) => (
                    <div key={seed.id} className="seed-card" onClick={() => handlePlant(seed.id)}>
                      <div className="seed-card-icon">🌱</div>
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
