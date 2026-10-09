/**
 * IsoFarmControls - UI controls for the isometric farm.
 * Handles buttons, selectors, tooltips, and modals.
 */

import React from "react";
import SeedSelectModal from "./SeedSelectModal";
import ExtractionModal from "./ExtractionModal";
import BuildMenu from "./BuildMenu";

const IsoFarmControls = ({
  coins,
  fieldCfg,
  err,
  selectedId,
  setSelectedId,
  catalog,
  buildingToPlace,
  setBuildingToPlace,
  movingBuilding,
  setMovingBuilding,
  moveMode,
  setMoveMode,
  moveChanges,
  initialBuildingsPos,
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
  selected,
  tryPlantSeed,
  loadPlots,
  tryRemoveBuilding,
  tryBuyChunk,
  tryPlaceBuilding,
  tryMoveBuilding,
  startExtraction,
  stopExtraction,
  collectExtraction,
  startProcessing,
  stopProcessing,
  collectProcessing,
  load,
}) => {
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

  const handleCancelMoves = () => {
    setBuildings?.((prev) =>
      prev.map((b) => {
        const initial = initialBuildingsPos[b.id];
        if (initial) {
          return { ...b, row: initial.row, col: initial.col };
        }
        return b;
      })
    );
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
          {hoveredBuilding.name}
        </div>
      )}

      {/* Controls bar */}
      <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <div>Coins: <b>{coins}</b></div>

        <select value={selectedId} onChange={(e) => setSelectedId(e.target.value)}>
          <option value="">— выбрать здание —</option>
          {catalog.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name} ({b.width}x{b.height}) — {b.price}
            </option>
          ))}
        </select>

        {buildingToPlace && (
          <span style={{
            background: "#ff9800",
            color: "#000",
            padding: "4px 8px",
            borderRadius: 4,
            fontSize: 12,
            marginLeft: 8,
          }}>
            🎯 Размещение: {buildingToPlace.name} (кликните на поле) •
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
              Отмена
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
            marginLeft: 8,
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

        {fieldCfg && (
          <div style={{ opacity: 0.85, fontSize: 12 }}>
            Chunk: {fieldCfg.chunk_size}×{fieldCfg.chunk_size} • Max: {fieldCfg.max_size}×{fieldCfg.max_size} • Next chunk cost: {fieldCfg.next_chunk_cost}
          </div>
        )}

        {err && <div style={{ color: "crimson" }}>{err}</div>}
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
      </div>

      <div style={{ fontSize: 12, opacity: 0.75 }}>
        Управление: ЛКМ drag — панорама, ЛКМ click — действие (покупка/постройка/посадка), колесо — zoom.
        На фермерском поле: клик откроет окно посадки семян.
      </div>

      {/* Modals */}
      <SeedSelectModal
        isOpen={seedModalOpen}
        onClose={() => {
          setSeedModalOpen(false);
          setClickedBuilding(null);
        }}
        buildingId={clickedBuilding?.id}
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
        building={extractionBuilding}
        processes={
          ["processing", "production", "agroproduction"].includes(extractionBuilding?.building_type)
            ? processingProcesses
            : extractionProcesses
        }
        onStart={(buildingId, recipeId, quantity) => {
          if (["processing", "production", "agroproduction"].includes(extractionBuilding?.building_type)) {
            startProcessing(buildingId, recipeId, quantity || 1);
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
