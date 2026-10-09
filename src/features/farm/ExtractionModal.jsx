import { useState, useEffect, useMemo } from "react";
import "./SeedSelectModal.css";

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
  onRecipesUpdate = null   // Колбэк для обновления рецептов
}) {
  const [quantities, setQuantities] = useState({});
  const [maxQuantities, setMaxQuantities] = useState({});
  const [collecting, setCollecting] = useState(false);
  
  // Обновляем maxQuantities когда приходят рецепты
  useEffect(() => {
    if (recipes && recipes.length > 0) {
      const newMaxQuantities = {};
      recipes.forEach(recipe => {
        newMaxQuantities[recipe.id] = recipe.max_possible || 0;
      });
      setMaxQuantities(newMaxQuantities);
    }
  }, [recipes]);
  
  // Определяем тип здания
  const buildingType = building?.building_type || (isProcessing ? "processing" : "extraction");
  const isExtraction = buildingType === "extraction";
  const isProc = buildingType === "processing";
  const isProduction = buildingType === "production";
  const isAgroProduction = buildingType === "agroproduction";
  
  // Находим процесс для текущего здания
  const buildingProcess = processes?.find(p => p.building_id === building?.id);
  const isRunning = buildingProcess && buildingProcess.status === "running";
  const isAllComplete = buildingProcess && buildingProcess.all_complete === true;
  const canCollect = (isProc || isProduction || isAgroProduction) && isAllComplete;

  // Таймер обратного отсчёта - используем правильное поле для processing vs extraction
  const [timeLeft, setTimeLeft] = useState(null);
  const [currentCycle, setCurrentCycle] = useState(null);
  const [totalTimeLeft, setTotalTimeLeft] = useState(null);

  useEffect(() => {
    // Для переработки и производства используем ready_at, для добычи - next_harvest_at
    const targetTime = (isProc || isProduction || isAgroProduction)
      ? buildingProcess?.ready_at 
      : buildingProcess?.next_harvest_at;
    
    if (!targetTime) {
      setTimeLeft(null);
      setTotalTimeLeft(null);
      return;
    }
    
    const updateTimer = () => {
      const now = new Date();
      const ready = new Date(targetTime);
      const diff = ready - now;
      
      if (diff <= 0) {
        setTimeLeft(null);
        // Если процесс готов - показываем что всё завершено
        return;
      }
      
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      
      setTimeLeft({ hours, minutes, seconds, total: diff });
      
      // Вычисляем общее время для всех оставшихся циклов
      if ((isProc || isProduction || isAgroProduction) && buildingProcess) {
        const remaining = buildingProcess.remaining || 0;
        const durationPerOne = buildingProcess.duration_per_one || 1;
        const totalRemainingMs = diff + (remaining - 1) * durationPerOne * 1000;
        
        const totalHours = Math.floor(totalRemainingMs / (1000 * 60 * 60));
        const totalMinutes = Math.floor((totalRemainingMs % (1000 * 60 * 60)) / (1000 * 60));
        const totalSeconds = Math.floor((totalRemainingMs % (1000 * 60)) / 1000);
        
        setTotalTimeLeft({ hours: totalHours, minutes: totalMinutes, seconds: totalSeconds, total: totalRemainingMs });
        
        // Текущий цикл
        const currentCycleNum = buildingProcess.quantity_done + 1;
        setCurrentCycle({ current: currentCycleNum, total: buildingProcess.quantity });
      }
    };
    
    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [buildingProcess?.ready_at, buildingProcess?.next_harvest_at, buildingProcess?.remaining, buildingProcess?.quantity_done, buildingProcess?.duration_per_one, isProc, isProduction, isAgroProduction]);

  function formatTime(minutes, seconds) {
    if (minutes > 0) return `${minutes}м ${seconds}с`;
    return `${seconds}с`;
  }

  function formatTimeFull(hours, minutes, seconds) {
    if (hours > 0) return `${hours}ч ${minutes}м ${seconds}с`;
    if (minutes > 0) return `${minutes}м ${seconds}с`;
    return `${seconds}с`;
  }

  function formatDuration(seconds) {
    const mins = Math.floor(seconds / 60);
    if (mins > 0) return `${mins} мин`;
    return `${seconds} сек`;
  }

  async function handleStop() {
    if (buildingProcess?.id) {
      await onStop(buildingProcess.id);
      // После остановки обновляем рецепты (могут освободиться ингредиенты)
      if (onStopComplete) {
        onStopComplete();
      }
      if (onRecipesUpdate) {
        onRecipesUpdate();
      }
    }
  }

  async function handleCollect() {
    if (buildingProcess?.id && onCollect) {
      setCollecting(true);
      try {
        const result = await onCollect(buildingProcess.id);
        // Если есть колбэк после сбора - вызываем его
        if (onCollectComplete) {
          onCollectComplete(result);
        }
      } finally {
        setCollecting(false);
      }
    }
  }

  async function handleSell() {
    if (building?.id && isRunning) {
      alert("Нельзя продать здание с активным процессом!");
      return;
    }
    if (building?.id && confirm("Вы уверены, что хотите продать это здание?")) {
      await onSell(building.id);
      onClose();
    }
  }

  if (!isOpen) return null;

  // Заголовок модального окна с названием здания
  const buildingName = building?.name || "";
  const buildingSlug = building?.slug || "";
  
  // Иконки по slug здания (для животноводства)
  const buildingIcons = {
    "chicken-coop": "🐔",
    "pigsty": "🐷",
    "cowshed": "🐄",
    "sheepfold": "🐑",
  };
  
  // Иконки по slug продукта/результата
  const productIcons = {
    // Животноводство
    "eggs": "🐔",
    "pork": "🐷",
    "milk": "🐄",
    "wool": "🐑",
    // Переработка
    "board": "🪵",
    "iron-ingot": "⛓️",
    "stone-block": "🪨",
    "flour": "🌾",
    "sunflower_oil": "🌻",
    // Производство
    "ketchup": "🍅",
    "bread": "🍞",
    // Корм
    "chicken_food": "🌾",
    "pig_food": "🥕",
    "cow_food": "🌿",
    "sheep_food": "🌱",
  };
  
  // Функция для получения иконки рецепта
  const getRecipeIcon = (recipe) => {
    // Для животноводства - иконка по зданию
    if (isAgroProduction) {
      return buildingIcons[buildingSlug] || "";
    }
    // Для других типов - по продукту
    if (recipe?.output_item_slug && productIcons[recipe.output_item_slug]) {
      return productIcons[recipe.output_item_slug];
    }
    return "";
  };
  
  // Иконки типов зданий для заголовка
  const typeIcons = {
    "production": "⚙️",
    "processing": "🏭",
    "extraction": "⛏️",
    "agroproduction": buildingIcons[buildingSlug] || "🐄",
  };
  const typeIcon = typeIcons[building?.building_type] || "🏭";
  
  const modalTitle = isProduction
    ? `⚙️ Производство${buildingName ? ` - ${buildingName}` : ""}`
    : (isAgroProduction
        ? `${buildingIcons[buildingSlug] || "🐄"} Животноводство${buildingName ? ` - ${buildingName}` : ""}`
        : (isProc 
            ? `🏭 Переработка${buildingName ? ` - ${buildingName}` : ""}`
            : (isExtraction ? `⛏ Добыча${buildingName ? ` - ${buildingName}` : ""}` : `🏭 Переработка${buildingName ? ` - ${buildingName}` : ""}`)));

  return (
    <div className="seed-modal-overlay" onClick={onClose}>
      <div className="seed-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="seed-modal-header">
          <h2>{modalTitle}</h2>
          <button className="seed-modal-close" onClick={onClose}>&times;</button>
        </div>

        <div className="seed-modal-body">
          {/* Показываем таймер для активного процесса */}
          {isRunning && timeLeft && !canCollect && (
            <div className="growing-timer">
              <div className="timer-icon">{isExtraction ? "⛏️" : (isProduction ? "⚙️" : (isAgroProduction ? (buildingIcons[buildingSlug] || "🐄") : (isProc ? "🏭" : "🏭")))}</div>
              <div className="timer-info">
                <div className="timer-title">
                  {isExtraction ? "Добыча в процессе..." : (isProduction ? "Производство в процессе..." : (isAgroProduction ? "Животноводство в процессе..." : "Переработка в процессе..."))}
                </div>
                <div className="timer-seed">{buildingProcess?.recipe_name || buildingProcess?.resource_name}</div>
                {(isProc || isProduction || isAgroProduction) && currentCycle && (
                  <div className="timer-cycle">Цикл {currentCycle.current} из {currentCycle.total}</div>
                )}
              </div>
              <div className="timer-countdown">
                <div className="timer-value">{formatTime(timeLeft.minutes, timeLeft.seconds)}</div>
                <div className="timer-label">{isExtraction ? "автосбор" : "готово"}</div>
              </div>
              {(isProc || isProduction || isAgroProduction) && totalTimeLeft && (
                <div className="timer-total">
                  Всего осталось: {formatTimeFull(totalTimeLeft.hours, totalTimeLeft.minutes, totalTimeLeft.seconds)}
                </div>
              )}
            </div>
          )}

          {/* Кнопка "Все готово - собрать" для переработки/производства */}
          {canCollect && (
            <div className="harvest-ready">
              <div className="harvest-icon">✅</div>
              <div className="harvest-text">
                <div className="harvest-title">{isProduction ? "Производство завершено!" : (isAgroProduction ? "Животноводство завершено!" : "Переработка завершена!")}</div>
                <div className="harvest-seed">
                  {buildingProcess?.output_item_name} x{buildingProcess?.output_quantity}
                </div>
              </div>
              <button 
                className="harvest-btn" 
                onClick={handleCollect}
                disabled={collecting}
              >
                {collecting ? "..." : "📦 Собрать"}
              </button>
            </div>
          )}

          {/* Кнопка остановки для активного процесса (только если не всё готово) */}
          {isRunning && !canCollect && (
            <div className="action-buttons">
              <button 
                className="harvest-btn stop-btn" 
                onClick={handleStop}
              >
                ⏹ Остановить работу
              </button>
            </div>
          )}

          {/* Если это переработка или производство и есть рецепты - показываем их список (только если нет активного процесса) */}
          {(isProc || isProduction || isAgroProduction) && recipes && recipes.length > 0 && !isRunning && !canCollect && (
            <div className="recipes-section">
              <div className="recipes-title">Доступные рецепты:</div>
              {recipes.map((recipe) => {
                const qty = parseInt(quantities[recipe.id]) || 1;
                const maxQty = maxQuantities[recipe.id] || 0;
                const totalTime = formatDuration(recipe.duration_seconds * qty);
                
                const isAvailable = maxQty > 0;
                
                return (
                  <div key={recipe.id} className="recipe-card" style={{ opacity: isAvailable ? 1 : 0.5 }}>
                    <div className="recipe-name">{getRecipeIcon(recipe)} {recipe.name} {!isAvailable && <span style={{color: '#f44336', fontSize: 12}}>(нет ингредиентов)</span>}</div>
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
                      Всего: {totalTime} ({qty} циклов)
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
          {!buildingProcess && isExtraction && (
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
          
          {isRunning && !timeLeft && !canCollect && (
            <div className="growing-timer">
              <div className="timer-icon">⏳</div>
              <div className="timer-info">
                <div className="timer-title">Ожидание...</div>
              </div>
            </div>
          )}

          <div className="modal-footer">
            <button 
              className="sell-btn" 
              onClick={handleSell}
              disabled={isRunning}
            >
              💰 Продать здание
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
