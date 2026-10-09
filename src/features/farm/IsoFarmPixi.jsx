/**
 * IsoFarmPixi - Main isometric farm component.
 * Uses useIsoFarmEngine hook and renders IsoFarmRenderer + IsoFarmControls.
 */

import React, { useEffect, useRef } from "react";
import { useIsoFarmEngine } from "./useIsoFarmEngine";
import IsoFarmRenderer from "./IsoFarmRenderer";
import IsoFarmControls from "./IsoFarmControls";

const IsoFarmPixi = () => {
  const engine = useIsoFarmEngine();
  const syncBuildingsRef = useRef(null);
  const syncFieldsRef = useRef(null);

  // Expose sync functions for external access
  useEffect(() => {
    // These will be set by IsoFarmRenderer
    window.syncBuildingsRef = syncBuildingsRef;
    window.syncFieldsRef = syncFieldsRef;
  }, []);

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
        initialBuildingsPos={engine.initialBuildingsPos}
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
        selected={engine.selected}
        tryPlantSeed={engine.tryPlantSeed}
        loadPlots={engine.loadPlots}
        tryRemoveBuilding={engine.tryRemoveBuilding}
        tryBuyChunk={engine.tryBuyChunk}
        tryPlaceBuilding={engine.tryPlaceBuilding}
        tryMoveBuilding={engine.tryMoveBuilding}
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
          hoveredBuilding={engine.hoveredBuilding}
          setHoveredBuilding={engine.setHoveredBuilding}
          selected={engine.selected}
          buildingToPlace={engine.buildingToPlace}
          movingBuilding={engine.movingBuilding}
          moveMode={engine.moveMode}
          onPlantSeed={engine.tryPlantSeed}
          onHarvest={engine.loadPlots}
          onRemoveBuilding={engine.tryRemoveBuilding}
          onBuyChunk={engine.tryBuyChunk}
          onPlaceBuilding={engine.tryPlaceBuilding}
          onMoveBuilding={engine.tryMoveBuilding}
          syncBuildingsRef={syncBuildingsRef}
          syncFieldsRef={syncFieldsRef}
        />
      </div>
    </div>
  );
};

export default IsoFarmPixi;
