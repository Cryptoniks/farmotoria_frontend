import { useState } from "react";
import "./BuildMenu.css";
import { useT } from "../../i18n/context";

const CATEGORY_ORDER = ["field", "storage", "agroproduction", "extraction", "processing", "production"];

export default function BuildMenu({ 
  isOpen, 
  onClose, 
  buildings = [], 
  coins = 0,
  onBuild,
  mode = "build", // "build" или "move" - режим работы
  onMove, // колбэк для перемещения
}) {
  const t = useT();
  const categoryLabel = (type) => t(`build.cat.${type}`);
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
    { key: "all", label: t("build.all") },
    ...CATEGORY_ORDER.map(key => ({ key, label: categoryLabel(key) }))
  ];
  
  // Проверка доступности здания по цене
  const canAfford = (price) => coins >= price;
  // Без нужной квалификации (Академия) здание видно, но построить его нельзя
  const canBuild = (building) => canAfford(building.price) && !building.locked_reason;
  
  // Обработчик клика "Построить"
  const handleBuild = (building) => {
    if (!canBuild(building)) return;
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
          <h2>{isMoveMode ? t("build.titleMove") : t("build.titleBuild")}</h2>
          {!isMoveMode && <span className="build-menu-coins">💰 {t.num(coins)}</span>}
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
              className={`build-card ${!isMoveMode && !canBuild(building) ? "disabled" : ""}`}
            >
              <div className="build-card-info">
                <div className="build-card-name">{building.name}</div>
                <div className="build-card-type">{categoryLabel(building.building_type)}</div>
                <div className="build-card-size">{t("build.size", { w: building.width, h: building.height })}</div>
                {!isMoveMode && building.locked_reason && (
                  <div className="build-card-locked">🔒 {building.locked_reason}</div>
                )}
                {isMoveMode && building.row !== undefined && (
                  <div className="build-card-position">{t("build.position", { row: building.row, col: building.col })}</div>
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
                  {t("build.select")}
                </button>
              ) : (
                <button 
                  className="build-card-btn"
                  disabled={!canBuild(building)}
                  onClick={() => handleBuild(building)}
                  title={building.locked_reason || undefined}
                >
                  {building.locked_reason ? t("build.locked") : t("build.build")}
                </button>
              )}
            </div>
          ))}
          
          {filteredBuildings.length === 0 && (
            <div className="build-menu-empty">
              {isMoveMode ? t("build.noneBuilt") : t("build.noneAvailable")}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
