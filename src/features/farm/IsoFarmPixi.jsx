/**
 * IsoFarmPixi - Main isometric farm component.
 * Uses useIsoFarmEngine hook and renders IsoFarmRenderer + IsoFarmControls.
 */

import React from "react";
import { useIsoFarmEngine } from "./useIsoFarmEngine";
import IsoFarmRenderer from "./IsoFarmRenderer";
import IsoFarmControls from "./IsoFarmControls";
import { api } from "../../shared/services/api";

// Здания с рецептами: окно показывает список рецептов из /api/processing/recipes/
const RECIPE_BUILDING_TYPES = ["processing", "production", "agroproduction"];

const IsoFarmPixi = () => {
  const engine = useIsoFarmEngine();

  // Клик по зданию: поле — окно посадки, остальное — окно добычи/переработки
  const handleBuildingClick = async (building) => {
    if (building.building_type === "field") {
      engine.setClickedBuilding(building);
      engine.setSeedModalOpen(true);
      return;
    }
    engine.setExtractionBuilding(building);
    engine.setProcessingRecipes([]);
    engine.setExtractionModalOpen(true);
    if (RECIPE_BUILDING_TYPES.includes(building.building_type)) {
      try {
        const res = await api.get(`/api/processing/recipes/?building_type=${building.slug}`);
        engine.setProcessingRecipes(res.data);
      } catch (e) {
        console.error("Failed to load recipes:", e);
      }
    }
  };

  const handlePlaceBuilding = async (row, col) => {
    await engine.tryPlaceBuilding(row, col);
    engine.setSelectedId("");
  };

  return (
    <div style={{ display: "grid", gap: 12 }}>
      {/* Controls */}
      <IsoFarmControls
        coins={engine.coins}
        fieldCfg={engine.fieldCfg}
        err={engine.err}
        selectedId={engine.selectedId}
        setSelectedId={engine.setSelectedId}
        catalog={engine.catalog}
        buildingToPlace={engine.buildingToPlace}
        setBuildingToPlace={engine.setBuildingToPlace}
        movingBuilding={engine.movingBuilding}
        setMovingBuilding={engine.setMovingBuilding}
        moveMode={engine.moveMode}
        setMoveMode={engine.setMoveMode}
        moveChanges={engine.moveChanges}
        setMoveChanges={engine.setMoveChanges}
        setInitialBuildingsPos={engine.setInitialBuildingsPos}
        hoveredBuilding={engine.hoveredBuilding}
        seedModalOpen={engine.seedModalOpen}
        setSeedModalOpen={engine.setSeedModalOpen}
        clickedBuilding={engine.clickedBuilding}
        setClickedBuilding={engine.setClickedBuilding}
        extractionModalOpen={engine.extractionModalOpen}
        setExtractionModalOpen={engine.setExtractionModalOpen}
        extractionBuilding={engine.extractionBuilding}
        setExtractionBuilding={engine.setExtractionBuilding}
        processingRecipes={engine.processingRecipes}
        setProcessingRecipes={engine.setProcessingRecipes}
        buildMenuOpen={engine.buildMenuOpen}
        setBuildMenuOpen={engine.setBuildMenuOpen}
        buildMenuMode={engine.buildMenuMode}
        setBuildMenuMode={engine.setBuildMenuMode}
        buildings={engine.buildings}
        plots={engine.plots}
        extractionProcesses={engine.extractionProcesses}
        processingProcesses={engine.processingProcesses}
        tryPlantSeed={engine.tryPlantSeed}
        loadPlots={engine.loadPlots}
        tryRemoveBuilding={engine.tryRemoveBuilding}
        startExtraction={engine.startExtraction}
        stopExtraction={engine.stopExtraction}
        collectExtraction={engine.collectExtraction}
        startProcessing={engine.startProcessing}
        stopProcessing={engine.stopProcessing}
        collectProcessing={engine.collectProcessing}
        load={engine.load}
      />

      {/* Game canvas */}
      <div style={{ position: "relative", width: "100%", height: "72vh" }}>
        <IsoFarmRenderer
          fieldCfg={engine.fieldCfg}
          chunks={engine.chunks}
          buildings={engine.buildings}
          plots={engine.plots}
          availableChunks={engine.availableChunks}
          coins={engine.coins}
          setHoveredBuilding={engine.setHoveredBuilding}
          selected={engine.selected}
          buildingToPlace={engine.buildingToPlace}
          movingBuilding={engine.movingBuilding}
          moveMode={engine.moveMode}
          moveChanges={engine.moveChanges}
          setMoveChanges={engine.setMoveChanges}
          onBuildingClick={handleBuildingClick}
          onBuyChunk={engine.tryBuyChunk}
          onPlaceBuilding={handlePlaceBuilding}
          onMoveBuilding={engine.tryMoveBuilding}
        />
      </div>
    </div>
  );
};

export default IsoFarmPixi;
