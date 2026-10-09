import { useState } from "react";
import "./BuildMenu.css";

const CATEGORY_LABELS = {
  "field": "Поля",
  "agroproduction": "Сельхозпродукция",
  "extraction": "Добыча",
  "processing": "Переработка",
  "production": "Производство",
};

const CATEGORY_ORDER = ["field", "agroproduction", "extraction", "processing", "production"];

export default function BuildMenu({ 
  isOpen, 
  onClose, 
  buildings = [], 
  coins = 0,
  onBuild,
  mode = "build", // "build" или "move" - режим работы
  onMove, // колбэк для перемещения
}) {
  const [activeTab, setActiveTab] = useState("all");
  
  // Группировка зданий по категориям
  const groupedBuildings = buildings.reduce((acc, b) => {
    const type = b.building_type || "field";
    if (!acc[type]) acc[type] = [];
    acc[type].push(b);
    return acc;
  }, {});
  
  // Фильтрация по вкладке
  const filteredBuildings = activeTab === "all" 
    ? buildings 
    : groupedBuildings[activeTab] || [];
  
  // Категории для вкладок
  const tabs = [
    { key: "all", label: "Все" },
    ...CATEGORY_ORDER.map(key => ({ key, label: CATEGORY_LABELS[key] || key }))
  ];
  
  // Проверка доступности здания по цене
  const canAfford = (price) => coins >= price;
  
  // Обработчик клика "Построить"
  const handleBuild = (building) => {
    if (!canAfford(building.price)) return;
    onBuild(building);
    onClose();
  };
  
  // Обработчик клика "Переместить"
  const handleMove = (building) => {
    if (onMove) {
      onMove(building);
    }
    onClose();
  };
  
  if (!isOpen) return null;
  
  const isMoveMode = mode === "move";
  
  return (
    <div className="build-menu-overlay" onClick={onClose}>
      <div className="build-menu-content" onClick={e => e.stopPropagation()}>
        <div className="build-menu-header">
          <h2>{isMoveMode ? "📦 Переместить здание" : "🏗️ Построить здание"}</h2>
          {!isMoveMode && <span className="build-menu-coins">💰 {coins}</span>}
          <button className="build-menu-close" onClick={onClose}>&times;</button>
        </div>
        
        <div className="build-menu-tabs">
          {tabs.map(tab => (
            <button 
              key={tab.key}
              className={`build-menu-tab ${activeTab === tab.key ? "active" : ""}`}
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </div>
        
        <div className="build-menu-list">
          {filteredBuildings.map(building => (
            <div 
              key={building.id} 
              className={`build-card ${!isMoveMode && !canAfford(building.price) ? "disabled" : ""}`}
            >
              <div className="build-card-info">
                <div className="build-card-name">{building.name}</div>
                <div className="build-card-type">{CATEGORY_LABELS[building.building_type] || building.building_type}</div>
                <div className="build-card-size">Размер: {building.width}×{building.height}</div>
                {isMoveMode && building.row !== undefined && (
                  <div className="build-card-position">Позиция: ({building.row}, {building.col})</div>
                )}
              </div>
              {!isMoveMode && (
                <div className="build-card-price">
                  <span className={canAfford(building.price) ? "can-afford" : "cannot-afford"}>
                    💰 {building.price}
                  </span>
                </div>
              )}
              {isMoveMode ? (
                <button 
                  className="build-card-btn move-btn"
                  onClick={() => handleMove(building)}
                >
                  Выбрать
                </button>
              ) : (
                <button 
                  className="build-card-btn"
                  disabled={!canAfford(building.price)}
                  onClick={() => handleBuild(building)}
                >
                  Построить
                </button>
              )}
            </div>
          ))}
          
          {filteredBuildings.length === 0 && (
            <div className="build-menu-empty">
              {isMoveMode ? "Нет построенных зданий" : "Нет доступных зданий"}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
