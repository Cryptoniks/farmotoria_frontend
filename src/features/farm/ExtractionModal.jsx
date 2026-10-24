import { useState, useEffect } from "react";
import "./SeedSelectModal.css";
import "./FarmModals.css";
import PlantIcon from "../../components/PlantIcon";
import BuildingLevel from "./BuildingLevel";
import AnimalsPanel from "./AnimalsPanel";

// Иконки по slug здания (для животноводства)
const ANIMAL_ICONS = {
  "chicken-coop": "🐔",
  "pigsty": "🐷",
  "cowshed": "🐄",
  "sheepfold": "🐑",
};

const KIND_TEXT = {
  extraction: { icon: "⛏️", title: "⛏ Добыча", running: "Добыча в процессе...", done: "" },
  processing: { icon: "🏭", title: "🏭 Переработка", running: "Переработка в процессе...", done: "Переработка завершена!" },
  production: { icon: "⚙️", title: "⚙️ Производство", running: "Производство в процессе...", done: "Производство завершено!" },
  agroproduction: { icon: "🐄", title: "🐄 Животноводство", running: "Животноводство в процессе...", done: "Животноводство завершено!" },
};

function formatTime(minutes, seconds) {
  if (minutes > 0) return `${minutes}м ${seconds}с`;
  return `${seconds}с`;
}

function formatTimeFull(ms) {
  const hours = Math.floor(ms / (1000 * 60 * 60));
  const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((ms % (1000 * 60)) / 1000);
  if (hours > 0) return `${hours}ч ${minutes}м ${seconds}с`;
  return formatTime(minutes, seconds);
}

function formatDuration(seconds) {
  const mins = Math.floor(seconds / 60);
  if (mins > 0) return `${mins} мин`;
  return `${seconds} сек`;
}

/** Один процесс здания: таймер и «Остановить», а когда всё готово — «Собрать». */
function ProcessCard({ process, kind, icon, onStop, onCollect }) {
  const isExtraction = kind === "extraction";
  const complete = !isExtraction && process.all_complete === true;
  const target = isExtraction ? process.next_harvest_at : process.ready_at;
  const [now, setNow] = useState(() => Date.now());
  const [collecting, setCollecting] = useState(false);

  useEffect(() => {
    if (!target || complete) return undefined;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [target, complete]);

  const text = KIND_TEXT[kind] || KIND_TEXT.processing;

  if (complete) {
    const collect = async () => {
      setCollecting(true);
      try {
        await onCollect(process.id);
      } catch (e) {
        // Например, «Склад: не хватает места…» — показываем прямо в окне
        alert(e?.response?.data?.detail || e?.message || "Ошибка сбора");
      } finally {
        setCollecting(false);
      }
    };
    return (
      <div className="harvest-ready">
        <div className="harvest-icon">✅</div>
        <div className="harvest-text">
          <div className="harvest-title">{text.done}</div>
          <div className="harvest-seed">{process.output_item_name} x{process.output_quantity}</div>
        </div>
        <button className="harvest-btn" onClick={collect} disabled={collecting}>
          {collecting ? "..." : "📦 Собрать"}
        </button>
      </div>
    );
  }

  // Для переработки ready_at — конец всех циклов; до конца текущего — остаток от длительности одного цикла
  const totalLeft = target ? new Date(target).getTime() - now : 0;
  const perOne = (process.duration_per_one || 1) * 1000;
  const cycleLeft = isExtraction ? totalLeft : totalLeft - Math.max(0, (process.remaining || 1) - 1) * perOne;

  return (
    <div className="process-card">
      <div className="growing-timer">
        <div className="timer-icon">{icon}</div>
        <div className="timer-info">
          <div className="timer-title">{totalLeft > 0 ? text.running : "Ожидание..."}</div>
          <div className="timer-seed">{process.recipe_name || process.resource_name}</div>
          {!isExtraction && (
            <div className="timer-cycle">Цикл {Math.min(process.quantity_done + 1, process.quantity)} из {process.quantity}</div>
          )}
        </div>
        {cycleLeft > 0 && (
          <div className="timer-countdown">
            <div className="timer-value">{formatTimeFull(cycleLeft)}</div>
            <div className="timer-label">{isExtraction ? "автосбор" : "готово"}</div>
          </div>
        )}
        {!isExtraction && totalLeft > 0 && (
          <div className="timer-total">Всего осталось: {formatTimeFull(totalLeft)}</div>
        )}
      </div>
      <div className="action-buttons">
        <button className="harvest-btn stop-btn" onClick={() => onStop(process.id)}>⏹ Остановить работу</button>
      </div>
    </div>
  );
}

/** Циклы здания переработки/производства: сколько открыто и занято, кнопка «Открыть новый цикл». */
function CyclesPanel({ building, busyCount, coins, onOpenCycle }) {
  const [opening, setOpening] = useState(false);
  const [error, setError] = useState("");
  const { cycles, max_cycles: max, cycle_price: price, cycle_lock_reason: lockReason } = building;
  const allOpen = cycles >= max;
  const noCoins = coins < price;

  const open = async () => {
    setOpening(true);
    setError("");
    const res = await onOpenCycle?.(building.id);
    if (res?.error) setError(res.error);
    setOpening(false);
  };

  return (
    <div className="cycles-panel">
      <div className="cycles-head">
        <span className="farm-modal-name">Циклы: {cycles} из {max}</span>
        <span className="farm-modal-sub">занято {busyCount} из {cycles}</span>
      </div>
      <div className="cycles-slots">
        {Array.from({ length: max }, (_, i) => (
          <span
            key={i}
            className={`cycles-slot ${i < busyCount ? "busy" : i < cycles ? "free" : "locked"}`}
            title={i < busyCount ? "Занят" : i < cycles ? "Свободен" : "Закрыт"}
          >
            {i < busyCount ? "⚙️" : i < cycles ? "" : "🔒"}
          </span>
        ))}
      </div>
      {!allOpen && (
        <>
          <button
            className="farm-modal-btn cycles-open-btn"
            disabled={Boolean(lockReason) || noCoins || opening}
            onClick={open}
            title={lockReason || (noCoins ? "Недостаточно монет" : undefined)}
          >
            🏭 Открыть новый цикл (💰 {price.toLocaleString("ru-RU")})
          </button>
          {lockReason && <div className="academy-hint">🔒 {lockReason}</div>}
          {!lockReason && noCoins && <div className="academy-hint">Недостаточно монет</div>}
        </>
      )}
      {error && <div className="farm-modal-error">{error}</div>}
    </div>
  );
}

export default function ExtractionModal({
  isOpen,
  onClose,
  building,
  processes,
  onStart,
  onStop,
  onCollect,
  onSell,
  recipes = [],
  isProcessing = false,
  onCollectComplete = null,
  onStopComplete = null,  // Колбэк после остановки
  onRecipesUpdate = null,  // Колбэк для обновления рецептов
  coins = 0,
  onUpgrade = null,
  onCustomize = null,
  onOpenCycle = null,
  onBuyAnimal = null,
}) {
  const [quantities, setQuantities] = useState({});

  if (!isOpen) return null;

  // Определяем тип здания
  const buildingType = building?.building_type || (isProcessing ? "processing" : "extraction");
  const isExtraction = buildingType === "extraction";
  const isRecipeBuilding = ["processing", "production", "agroproduction"].includes(buildingType);
  const buildingSlug = building?.slug || "";
  const text = KIND_TEXT[buildingType] || KIND_TEXT.processing;
  const icon = buildingType === "agroproduction" ? ANIMAL_ICONS[buildingSlug] || text.icon : text.icon;

  // Процессы этого здания: у добычи один, у переработки и производства — по одному на открытый цикл
  const buildingProcesses = (processes || []).filter((p) => p.building_id === building?.id && p.status !== "stopped");
  const hasRunning = buildingProcesses.length > 0;
  const hasAnimals = building?.animals != null;
  const cycles = building?.cycles ?? 1;
  const freeCycles = Math.max(0, cycles - buildingProcesses.length);

  async function handleStop(processId) {
    await onStop(processId);
    // После остановки обновляем рецепты (могут освободиться ингредиенты)
    onStopComplete?.();
    onRecipesUpdate?.();
  }

  async function handleCollect(processId) {
    const result = await onCollect(processId);
    onCollectComplete?.(result);
  }

  async function handleSell() {
    if (building?.id && hasRunning) {
      alert("Нельзя продать здание с активным процессом!");
      return;
    }
    if (building?.id && confirm("Вы уверены, что хотите продать это здание?")) {
      await onSell(building.id);
      onClose();
    }
  }

  // Картинка готового продукта (src/assets/items, src/assets/plants), иначе эмодзи
  const getRecipeIcon = (recipe) => {
    if (recipe?.output_item_slug) {
      return <PlantIcon plant={{ slug: recipe.output_item_slug, name: recipe.output_item_name }} size={22} />;
    }
    return buildingType === "agroproduction" ? ANIMAL_ICONS[buildingSlug] || "" : "";
  };

  const modalTitle = `${buildingType === "agroproduction" ? `${icon} Животноводство` : text.title}${building?.name ? ` - ${building.name}` : ""}`;

  return (
    <div className="seed-modal-overlay" onClick={onClose}>
      <div className="seed-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="seed-modal-header">
          <h2>{modalTitle}</h2>
          <div className="seed-modal-header-actions">
            {onCustomize && <button className="customize-btn" onClick={onCustomize}>🎨 Внешний вид</button>}
            <button className="seed-modal-close" onClick={onClose}>&times;</button>
          </div>
        </div>

        <div className="seed-modal-body">
          {building?.cycles != null && (
            <CyclesPanel building={building} busyCount={buildingProcesses.length} coins={coins} onOpenCycle={onOpenCycle} />
          )}

          {/* Животноводство: сетка животных, каждое кормится отдельно */}
          {hasAnimals && (
            <AnimalsPanel
              building={building}
              processes={processes}
              recipes={recipes}
              coins={coins}
              onStart={onStart}
              onStop={handleStop}
              onCollect={handleCollect}
              onBuyAnimal={onBuyAnimal}
            />
          )}

          {!hasAnimals && buildingProcesses.map((p) => (
            <ProcessCard key={p.id} process={p} kind={buildingType} icon={icon} onStop={handleStop} onCollect={handleCollect} />
          ))}

          {/* Рецепты — пока в здании есть свободный цикл */}
          {isRecipeBuilding && !hasAnimals && recipes && recipes.length > 0 && freeCycles > 0 && (
            <div className="recipes-section">
              <div className="recipes-title">
                Доступные рецепты{cycles > 1 ? ` (свободно циклов: ${freeCycles})` : ""}:
              </div>
              {recipes.map((recipe) => {
                const qty = parseInt(quantities[recipe.id]) || 1;
                const maxQty = recipe.max_possible || 0;
                const isAvailable = maxQty > 0;

                return (
                  <div key={recipe.id} className="recipe-card" style={{ opacity: isAvailable ? 1 : 0.5 }}>
                    <div className="recipe-name">{getRecipeIcon(recipe)} {recipe.name} {!isAvailable && <span style={{ color: '#f44336', fontSize: 12 }}>(нет ингредиентов)</span>}</div>
                    <div className="recipe-time">⏱ {formatDuration(recipe.duration_seconds)} за цикл</div>
                    <div className="recipe-inputs">
                      {recipe.ingredients?.map((ing, idx) => (
                        <span key={idx} className="recipe-ingredient" style={{ color: ing.available >= ing.quantity ? '#4caf50' : '#f44336' }}>
                          {ing.item_name} x{ing.quantity * qty} (доступно: {ing.available})
                        </span>
                      ))}
                    </div>
                    <div className="recipe-outputs">
                      → {recipe.output_quantity * qty} x {recipe.output_item_name}
                    </div>
                    <div className="recipe-total-time">
                      Всего: {formatDuration(recipe.duration_seconds * qty)} ({qty} циклов)
                    </div>
                    <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 8 }}>
                      <input
                        type="number"
                        min="1"
                        max={maxQty || 99}
                        value={quantities[recipe.id] || ""}
                        onChange={(e) => setQuantities(prev => ({
                          ...prev,
                          [recipe.id]: e.target.value
                        }))}
                        placeholder="1"
                        style={{ width: 60, padding: "4px" }}
                      />
                      <button
                        type="button"
                        onClick={() => setQuantities(prev => ({ ...prev, [recipe.id]: String(maxQty) }))}
                        style={{ padding: "4px 12px", fontSize: 12 }}
                        disabled={maxQty <= 0}
                      >
                        Макс ({maxQty})
                      </button>
                      <button
                        className="harvest-btn start-btn"
                        onClick={() => onStart(building?.id, recipe.id, qty)}
                        disabled={maxQty <= 0 || qty <= 0 || qty > maxQty}
                        title={maxQty <= 0 ? "Недостаточно ингредиентов" : ""}
                      >
                        ▶ Запустить ×{qty}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Если нет активного процесса и это добыча - показываем кнопку запуска */}
          {!hasRunning && isExtraction && (
            <div className="start-section">
              <div className="start-info">
                <p>Здание: <strong>{building?.name}</strong></p>
                <p>Тип: <strong>Добыча ресурсов</strong></p>
              </div>

              <button
                className="harvest-btn start-btn"
                onClick={() => onStart(building?.id)}
              >
                ▶ Начать работу
              </button>

              <p className="start-hint">Бесплатно. Работает циклично.</p>
            </div>
          )}

          <BuildingLevel building={building} coins={coins} onUpgrade={onUpgrade} />

          <div className="modal-footer">
            <button
              className="sell-btn"
              onClick={handleSell}
              disabled={hasRunning}
            >
              💰 Продать здание
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
