import { useState, useEffect } from "react";
import { api } from "../../shared/services/api";
import PlantIcon from "../../components/PlantIcon";
import BuildingLevel from "./BuildingLevel";
import { isPlotReady, plotReadyAt } from "./plots";
import "./SeedSelectModal.css";
import { useT } from "../../i18n/context";

export default function SeedSelectModal({
  isOpen, onClose, buildingId, building, coins, onUpgrade, plots, onPlant, onHarvest, onSell, isPremium, onStartMulti,
  onCoinsChange,
}) {
  const t = useT();
  const [seeds, setSeeds] = useState([]);
  // Одиночная посадка — одно поле; множественная (Премиум) — то же семя и на другие поля кликом по карте
  const [multi, setMulti] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [now, setNow] = useState(() => Date.now());
  // Только что собранный урожай: окно остаётся открытым и предлагает повторить посадку или выбрать другие семена
  const [harvested, setHarvested] = useState(null);
  // Сбор со всех созревших полей (Премиум): итог последней операции
  const [bulk, setBulk] = useState(null);
  const [bulkBusy, setBulkBusy] = useState(false);

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
      alert(t("common.sellRunning"));
      return;
    }
    if (buildingId && confirm(t("common.sellConfirm"))) {
      await onSell(buildingId);
      onClose();
    }
  }

  useEffect(() => {
    if (isOpen) {
      setHarvested(null);
      setBulk(null);
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
      alert(t("field.noBuilding"));
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
      alert(t("field.plantError", { error: e?.response?.data?.detail || e?.message || "Unknown" }));
    }
  }

  const readyCount = (plots || []).filter((p) => isPlotReady(p, now)).length;

  async function harvestAll(replant) {
    setBulkBusy(true);
    try {
      const res = await api.post("/api/iso/harvest-all/", { replant });
      setBulk({ ...res.data, replant });
      onCoinsChange?.(res.data.coins_balance);
      onHarvest?.();
    } catch (e) {
      setBulk({ error: e?.response?.data?.detail || t("field.bulkError") });
    }
    setBulkBusy(false);
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
      alert(t("field.harvestError", { error: e?.response?.data?.detail || e?.message || "Unknown" }));
    }
  }

if (!isOpen) return null;

  return (
    <div className="seed-modal-overlay" onClick={onClose}>
      <div className="seed-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="seed-modal-header">
          <h2>{t("field.title")}</h2>
          <div className="seed-modal-header-actions">
            <button className="seed-modal-close" onClick={onClose}>&times;</button>
          </div>
        </div>

        <div className="seed-modal-body">
          {/* Готовый урожай - кнопка сбора */}
          {plot && ready && (
            <>
            <div className="harvest-ready">
              <div className="harvest-icon">
                <PlantIcon plant={harvestOf(plot)} size={40} />
              </div>
              <div className="harvest-text">
                <div className="harvest-title">{t("field.ready")}</div>
                <div className="harvest-seed">{plot.seed_name}</div>
              </div>
              <button className="harvest-btn" onClick={() => handleHarvest(plot)}>
                {t("field.harvest")}
              </button>
            </div>
            <div className="bulk-harvest">
              <div className="bulk-harvest-title">
                {t("field.allReady", { count: readyCount })}
              </div>
              {isPremium ? (
                <div className="bulk-harvest-actions">
                  <button className="action-btn other-seeds-btn" disabled={bulkBusy} onClick={() => harvestAll(false)}>
                    {t("field.harvestAll")}
                  </button>
                  <button className="action-btn replant-btn" disabled={bulkBusy} onClick={() => harvestAll(true)}>
                    {t("field.harvestReplant")}
                  </button>
                </div>
              ) : (
                <div className="plant-mode-hint">{t("field.bulkPremiumHint")}</div>
              )}
            </div>
            </>
          )}

          {/* Итог сбора со всех полей */}
          {bulk && (
            <div className={`bulk-result ${bulk.error ? "error" : ""}`}>
              {bulk.error || (
                <>
                  {t("field.bulkDone", { count: bulk.harvested, items: bulk.items.map((i) => `${i.name} ×${i.quantity}`).join(", ") })}
                  {bulk.replant && t("field.replanted", { count: bulk.replanted })}
                  {bulk.errors?.map((e) => <div key={e} className="farm-modal-error">{e}</div>)}
                </>
              )}
            </div>
          )}
          
          {/* Растёт - таймер */}
          {hasActiveProcess && (
            <div className="growing-timer">
              <div className="timer-icon">
                <PlantIcon plant={seedOf(plot)} size={40} />
              </div>
              <div className="timer-info">
                <div className="timer-title">{t("field.growing")}</div>
                <div className="timer-seed">{plot.seed_name}</div>
              </div>
              <div className="timer-countdown">
                <div className="timer-value">{t.duration(Math.max(0, plotReadyAt(plot) - now))}</div>
                <div className="timer-label">{t("field.untilRipe")}</div>
              </div>
            </div>
          )}
          
          {/* Кнопки Ускорить и Удобрить */}
          {hasActiveProcess && (
            <div className="plot-actions">
              <button className="action-btn accelerate-btn" onClick={() => alert(t("field.speedUpSoon"))}>
                {t("field.speedUp")}
              </button>
              <button className="action-btn fertilize-btn" onClick={() => alert(t("field.fertilizeSoon"))}>
                {t("field.fertilize")}
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
                    {t("field.harvested", { item: harvested.itemName, count: harvested.quantity })}
                  </div>
                )}
                <div className="plot-actions">
                  <button
                    className="action-btn replant-btn"
                    disabled={!lastSeed}
                    onClick={() => handlePlant(harvested.seedId)}
                  >
                    {t("field.replant")}
                    <span className="action-btn-sub">
                      {lastSeed ? `${lastSeed.name} · 💰 ${lastSeed.price_coins}` : harvested.seedName}
                    </span>
                  </button>
                  <button className="action-btn other-seeds-btn" onClick={() => setHarvested(null)}>
                    {t("field.otherSeeds")}
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
                  {t("field.single")}
                </button>
                <button
                  className={`plant-mode-btn ${multi ? "active" : ""}`}
                  disabled={!isPremium}
                  onClick={() => setMulti(true)}
                  title={isPremium ? t("field.multiTitle") : t("field.premiumOnly")}
                >
                  {t("field.multi")}
                </button>
              </div>
              <div className="plant-mode-hint">
                {!isPremium
                  ? t("field.multiNoPremium")
                  : multi
                    ? t("field.multiHint")
                    : t("field.singleHint")}
              </div>
              <div className="shop-title">{t("field.buySeeds")}</div>
              
              {loading && <div className="seed-loading">{t("common.loading")}</div>}
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
                        <div className="seed-card-time">{t("field.minutes", { count: seed.grow_time_minutes })}</div>
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
              {t("common.sellBuilding")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
