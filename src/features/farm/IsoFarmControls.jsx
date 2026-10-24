/**
 * IsoFarmControls - UI controls for the isometric farm.
 * Handles buttons, selectors, tooltips, and modals.
 */

import React from "react";
import SeedSelectModal from "./SeedSelectModal";
import { buildingBusyReason } from "./plots";
import ExtractionModal from "./ExtractionModal";
import BuildMenu from "./BuildMenu";

const IsoFarmControls = ({
  coins,
  err,
  catalog,
  buildingToPlace,
  setBuildingToPlace,
  movingBuilding,
  setMovingBuilding,
  moveMode,
  setMoveMode,
  moveChanges,
  setMoveChanges,
  setInitialBuildingsPos,
  hoveredBuilding,
  seedModalOpen,
  setSeedModalOpen,
  clickedBuilding,
  setClickedBuilding,
  extractionModalOpen,
  setExtractionModalOpen,
  extractionBuilding,
  setExtractionBuilding,
  processingRecipes,
  setProcessingRecipes,
  buildMenuOpen,
  setBuildMenuOpen,
  buildMenuMode,
  setBuildMenuMode,
  buildings,
  plots,
  extractionProcesses,
  processingProcesses,
  tryPlantSeed,
  loadPlots,
  tryRemoveBuilding,
  startExtraction,
  stopExtraction,
  collectExtraction,
  startProcessing,
  stopProcessing,
  collectProcessing,
  load,
  tryUpgradeBuilding,
  tryOpenCycle,
  tryBuyAnimal,
  onCustomize,
  isFullscreen,
  onToggleFullscreen,
  animate,
  onToggleAnimate,
}) => {
  // Здание с запущенным процессом не улучшается: окно получает причину вместе с данными здания
  const withBusy = (b) => b && { ...b, busy_reason: buildingBusyReason(b.id, { plots, extractionProcesses, processingProcesses }) };

  const handleSaveMoves = async () => {
    const changes = Object.entries(moveChanges).map(([id, change]) => ({
      placement_id: parseInt(id),
      row: change.newRow,
      col: change.newCol,
    }));

    if (changes.length === 0) {
      return { error: "Нет изменений для сохранения" };
    }

    try {
      const { api } = await import("../../shared/services/api");
      const res = await api.post("/api/iso/move-buildings/", { moves: changes });
      if (res.data.success) {
        setMoveMode(false);
        setMoveChanges({});
        setInitialBuildingsPos({});
        await load();
        return { success: true };
      } else {
        return { error: "Ошибка сохранения: " + (res.data.errors?.[0]?.error || "Unknown") };
      }
    } catch (e) {
      return { error: e?.response?.data?.detail || "Ошибка сохранения" };
    }
  };

  // Здания на сервере не двигались: несохранённые перемещения живут только в moveChanges
  const handleCancelMoves = () => {
    setMoveMode(false);
    setMoveChanges({});
    setInitialBuildingsPos({});
  };

  return (
    <>
      {/* Tooltip */}
      {hoveredBuilding && hoveredBuilding.name && (
        <div
          id="building-tooltip"
          style={{
            position: "fixed",
            pointerEvents: "none",
            zIndex: 9999,
            transform: "translate(15px, -50%)",
            backgroundColor: "rgba(33, 33, 33, 0.95)",
            color: "#fff",
            padding: "8px 14px",
            borderRadius: 6,
            fontSize: 14,
            fontWeight: "bold",
            boxShadow: "0 4px 12px rgba(0,0,0,0.4)",
            border: "1px solid rgba(255,255,255,0.2)",
            whiteSpace: "nowrap",
            opacity: 0,
            transition: "opacity 0.1s",
          }}
        >
          {hoveredBuilding.building_type === "extraction" && "⛏ "}
          {hoveredBuilding.building_type === "processing" && "🏭 "}
          {hoveredBuilding.building_type === "production" && "⚙️ "}
          {hoveredBuilding.building_type === "storage" && "📦 "}
          {hoveredBuilding.building_type === "shop" && "🛒 "}
          {hoveredBuilding.building_type === "market" && "⚖️ "}
          {hoveredBuilding.name}
        </div>
      )}

      {/* Статус поверх карты: режим размещения/перемещения и ошибки */}
      <div style={{ position: "absolute", top: 12, left: "50%", transform: "translateX(-50%)", maxWidth: "min(640px, 60%)", display: "flex", gap: 8, alignItems: "center", justifyContent: "center", flexWrap: "wrap", zIndex: 100, pointerEvents: "none" }}>
        {buildingToPlace && (
          <span style={{
            background: "#ff9800",
            color: "#000",
            padding: "4px 8px",
            borderRadius: 4,
            fontSize: 12,
            pointerEvents: "auto",
          }}>
            🏗 Строительство: {buildingToPlace.name} (💰 {buildingToPlace.price}) — кликайте на карту, можно несколько подряд •
            <button
              onClick={() => setBuildingToPlace(null)}
              style={{
                background: "none",
                border: "none",
                color: "#000",
                cursor: "pointer",
                textDecoration: "underline",
                marginLeft: 4,
              }}
            >
              Отмена (Esc)
            </button>
          </span>
        )}

        {movingBuilding && (
          <span style={{
            background: "#2196f3",
            color: "#fff",
            padding: "4px 8px",
            borderRadius: 4,
            fontSize: 12,
            pointerEvents: "auto",
          }}>
            📦 Перемещение: {movingBuilding.name} (кликните на поле) •
            <button
              onClick={() => setMovingBuilding(null)}
              style={{
                background: "none",
                border: "none",
                color: "#fff",
                cursor: "pointer",
                textDecoration: "underline",
                marginLeft: 4,
              }}
            >
              Отмена
            </button>
          </span>
        )}

        {err && (
          <span style={{ background: "rgba(198, 40, 40, 0.92)", color: "#fff", padding: "4px 8px", borderRadius: 4, fontSize: 12 }}>
            {err}
          </span>
        )}
      </div>

      {/* Action buttons */}
      <div style={{ position: "absolute", bottom: 20, left: "50%", transform: "translateX(-50%)", display: "flex", gap: "12px", zIndex: 100 }}>
        <button
          onClick={() => setBuildMenuOpen(true)}
          style={{
            background: "linear-gradient(135deg, #4caf50 0%, #388e3c 100%)",
            border: "none",
            color: "white",
            padding: "12px 24px",
            borderRadius: "12px",
            cursor: "pointer",
            fontWeight: "bold",
            fontSize: "16px",
            boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
          }}
        >
          🏗️ Построить
        </button>
        <button
          onClick={() => {
            if (buildings.length === 0) {
              return { error: "Нет построенных зданий" };
            }
            const pos = {};
            buildings.forEach((b) => {
              pos[b.id] = { row: b.row, col: b.col };
            });
            setInitialBuildingsPos(pos);
            setMoveChanges({});
            setMoveMode(true);
          }}
          style={{
            background: moveMode
              ? "linear-gradient(135deg, #ff9800 0%, #f57c00 100%)"
              : "linear-gradient(135deg, #2196f3 0%, #1976d2 100%)",
            border: "none",
            color: "white",
            padding: "12px 24px",
            borderRadius: "12px",
            cursor: "pointer",
            fontWeight: "bold",
            fontSize: "16px",
            boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
          }}
        >
          {moveMode ? "🔄 Режим перемещения" : "📦 Переместить"}
        </button>
        {moveMode && (
          <>
            <button
              onClick={handleSaveMoves}
              style={{
                background: "linear-gradient(135deg, #4caf50 0%, #388e3c 100%)",
                border: "none",
                color: "white",
                padding: "12px 24px",
                borderRadius: "12px",
                cursor: "pointer",
                fontWeight: "bold",
                fontSize: "16px",
                boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
              }}
            >
              💾 Сохранить
            </button>
            <button
              onClick={handleCancelMoves}
              style={{
                background: "linear-gradient(135deg, #f44336 0%, #d32f2f 100%)",
                border: "none",
                color: "white",
                padding: "12px 24px",
                borderRadius: "12px",
                cursor: "pointer",
                fontWeight: "bold",
                fontSize: "16px",
                boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
              }}
            >
              ❌ Отменить
            </button>
          </>
        )}
        <button
          onClick={onToggleAnimate}
          title={animate ? "Выключить анимацию зданий" : "Включить анимацию зданий"}
          aria-label={animate ? "Выключить анимацию" : "Включить анимацию"}
          style={{
            background: animate ? "linear-gradient(135deg, #8e24aa 0%, #6a1b9a 100%)" : "linear-gradient(135deg, #546e7a 0%, #37474f 100%)",
            border: "none",
            color: "white",
            width: 48,
            borderRadius: "12px",
            cursor: "pointer",
            fontSize: 18,
            boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
          }}
        >
          {animate ? "⏸" : "▶"}
        </button>
        <button
          onClick={onToggleFullscreen}
          title={isFullscreen ? "Свернуть (Esc)" : "На весь экран"}
          aria-label={isFullscreen ? "Свернуть" : "На весь экран"}
          style={{
            background: "linear-gradient(135deg, #546e7a 0%, #37474f 100%)",
            border: "none",
            color: "white",
            width: 48,
            borderRadius: "12px",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
          }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            {isFullscreen ? (
              <path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5" />
            ) : (
              <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />
            )}
          </svg>
        </button>
      </div>

      {/* Modals */}
      <SeedSelectModal
        isOpen={seedModalOpen}
        onClose={() => {
          setSeedModalOpen(false);
          setClickedBuilding(null);
        }}
        buildingId={clickedBuilding?.id}
        building={withBusy(buildings.find((b) => b.id === clickedBuilding?.id))}
        coins={coins}
        onUpgrade={tryUpgradeBuilding}
        plots={plots}
        onPlant={tryPlantSeed}
        onHarvest={loadPlots}
        onSell={tryRemoveBuilding}
      />

      <ExtractionModal
        isOpen={extractionModalOpen}
        onClose={() => {
          setExtractionModalOpen(false);
          setExtractionBuilding(null);
          setProcessingRecipes([]);
        }}
        building={withBusy(buildings.find((b) => b.id === extractionBuilding?.id) || extractionBuilding)}
        coins={coins}
        onUpgrade={tryUpgradeBuilding}
        onCustomize={() => onCustomize?.(extractionBuilding)}
        processes={
          ["processing", "production", "agroproduction"].includes(extractionBuilding?.building_type)
            ? processingProcesses
            : extractionProcesses
        }
        onStart={async (buildingId, recipeId, quantity) => {
          if (["processing", "production", "agroproduction"].includes(extractionBuilding?.building_type)) {
            await startProcessing(buildingId, recipeId, quantity || 1);
            // Ингредиенты списаны — пересчитываем «Макс» для следующего свободного цикла
            try {
              const { api } = await import("../../shared/services/api");
              const res = await api.get(`/api/processing/recipes/?building_type=${extractionBuilding.slug}`);
              setProcessingRecipes(res.data);
            } catch (e) {
              console.error("Failed to reload recipes after start:", e);
            }
          } else {
            startExtraction(buildingId);
          }
        }}
        onStop={async (processId) => {
          if (["processing", "production", "agroproduction"].includes(extractionBuilding?.building_type)) {
            await stopProcessing(processId);
            await new Promise((r) => setTimeout(r, 100));
            try {
              const { api } = await import("../../shared/services/api");
              const access = localStorage.getItem("access");
              const res = await api.get(`/api/processing/recipes/?building_type=${extractionBuilding.slug}`, {
                headers: { Authorization: `Bearer ${access}` },
              });
              setProcessingRecipes(res.data);
            } catch (e) {
              console.error("Failed to reload recipes after stop:", e);
            }
          } else {
            await stopExtraction(processId);
          }
        }}
        onCollect={(processId) => {
          if (["processing", "production", "agroproduction"].includes(extractionBuilding?.building_type)) {
            return collectProcessing(processId);
          } else {
            return collectExtraction(processId);
          }
        }}
        onCollectComplete={async () => {
          if (["processing", "production", "agroproduction"].includes(extractionBuilding?.building_type)) {
            try {
              const { api } = await import("../../shared/services/api");
              const access = localStorage.getItem("access");
              const res = await api.get(`/api/processing/recipes/?building_type=${extractionBuilding.slug}`, {
                headers: { Authorization: `Bearer ${access}` },
              });
              setProcessingRecipes(res.data);
            } catch (e) {
              console.error("Failed to reload recipes:", e);
            }
          }
        }}
        onSell={tryRemoveBuilding}
        onOpenCycle={tryOpenCycle}
        onBuyAnimal={tryBuyAnimal}
        recipes={processingRecipes}
        isProcessing={["processing", "production", "agroproduction"].includes(extractionBuilding?.building_type)}
      />

      <BuildMenu
        isOpen={buildMenuOpen}
        onClose={() => {
          setBuildMenuOpen(false);
          setBuildMenuMode("build");
        }}
        buildings={buildMenuMode === "move" ? buildings : catalog}
        coins={coins}
        mode={buildMenuMode}
        onBuild={(building) => {
          setBuildingToPlace(building);
          setBuildMenuOpen(false);
        }}
        onMove={(building) => {
          setMovingBuilding(building);
          setBuildMenuOpen(false);
        }}
      />
    </>
  );
};

export default IsoFarmControls;
