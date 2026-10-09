/**
 * useIsoFarmEngine - Custom hook for farm game state and API operations.
 * Manages all game state, API calls, and business logic.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "../../shared/services/api";

const INITIAL_STATE = {
  err: "",
  coins: 0,
  fieldCfg: null,
  chunks: [],
  availableChunks: [],
  buildings: [],
  catalog: [],
  plots: [],
  extractionProcesses: [],
  processingProcesses: [],
  processingRecipes: [],
};

export function useIsoFarmEngine() {
  const [state, setState] = useState(INITIAL_STATE);
  
  // Refs for accessing latest state in callbacks
  const stateRef = useRef(state);
  stateRef.current = state;

  // UI state
  const [selectedId, setSelectedId] = useState("");
  const [seedModalOpen, setSeedModalOpen] = useState(false);
  const [clickedBuilding, setClickedBuilding] = useState(null);
  const [extractionModalOpen, setExtractionModalOpen] = useState(false);
  const [extractionBuilding, setExtractionBuilding] = useState(null);
  const [hoveredBuilding, setHoveredBuilding] = useState(null);
  const [buildMenuOpen, setBuildMenuOpen] = useState(false);
  const [buildMenuMode, setBuildMenuMode] = useState("build");
  const [buildingToPlace, setBuildingToPlace] = useState(null);
  const [movingBuilding, setMovingBuilding] = useState(null);
  const [moveMode, setMoveMode] = useState(false);
  const [moveChanges, setMoveChanges] = useState({});
  const [initialBuildingsPos, setInitialBuildingsPos] = useState({});

  // Refs for latest values
  const buildingToPlaceRef = useRef(buildingToPlace);
  const moveModeRef = useRef(moveMode);
  const movingBuildingRef = useRef(movingBuilding);
  
  useEffect(() => { buildingToPlaceRef.current = buildingToPlace; }, [buildingToPlace]);
  useEffect(() => { moveModeRef.current = moveMode; }, [moveMode]);
  useEffect(() => { movingBuildingRef.current = movingBuilding; }, [movingBuilding]);

  const selected = state.catalog.find((b) => String(b.id) === String(selectedId)) || null;

  const unlockedSet = new Set(
    state.chunks.map((ch) => `${ch.chunk_row},${ch.chunk_col}`)
  );

  // ===== API CALLS =====

  const load = useCallback(async () => {
    setState(prev => ({ ...prev, err: "" }));
    try {
      const [fieldRes, availableRes, plotsRes, extractionRes] = await Promise.all([
        api.get("/api/iso/field/"),
        api.get("/api/iso/available-chunks/"),
        api.get("/api/iso/plots/"),
        api.get("/api/extraction/status/"),
      ]);
      
      setState(prev => ({
        ...prev,
        coins: fieldRes.data.coins_balance,
        fieldCfg: fieldRes.data.field,
        chunks: fieldRes.data.chunks || [],
        buildings: fieldRes.data.buildings || [],
        catalog: fieldRes.data.available_buildings || [],
        plots: plotsRes.data.plots || [],
        extractionProcesses: extractionRes.data.processes || [],
      }));
      
      setState(prev => ({
        ...prev,
        availableChunks: availableRes.data.available_chunks || [],
      }));
    } catch (e) {
      setState(prev => ({
        ...prev,
        err: e?.response?.data?.detail || e.message || "Ошибка загрузки",
      }));
    }
  }, []);

  const loadPlots = useCallback(async () => {
    try {
      const res = await api.get("/api/iso/plots/");
      setState(prev => ({ ...prev, plots: res.data.plots || [] }));
    } catch (e) {
      console.error("Failed to load plots:", e);
    }
  }, []);

  const tryBuyChunk = useCallback(async (cr, cc) => {
    try {
      const res = await api.post("/api/iso/expand-chunk/", {
        chunk_row: cr,
        chunk_col: cc,
      });
      
      setState(prev => ({
        ...prev,
        coins: res.data.coins_balance,
        chunks: [...prev.chunks, { chunk_row: cr, chunk_col: cc, price_paid: res.data.paid }],
        fieldCfg: prev.fieldCfg 
          ? { ...prev.fieldCfg, next_chunk_cost: res.data.next_cost } 
          : prev.fieldCfg,
      }));
      
      const availableRes = await api.get("/api/iso/available-chunks/");
      setState(prev => ({ ...prev, availableChunks: availableRes.data.available_chunks || [] }));
    } catch (e) {
      setState(prev => ({
        ...prev,
        err: e?.response?.data?.detail || e.message || "Ошибка покупки чанка",
      }));
    }
  }, []);

  const tryPlantSeed = useCallback(async (buildingId, cellRow, cellCol, seedId) => {
    try {
      const res = await api.post("/api/iso/plant-seed/", {
        building_id: buildingId,
        cell_row: cellRow,
        cell_col: cellCol,
        seed_id: seedId,
      });
      
      setState(prev => ({ ...prev, coins: res.data.coins_balance }));
      setSeedModalOpen(false);
      setClickedBuilding(null);
      loadPlots();
    } catch (e) {
      setState(prev => ({
        ...prev,
        err: e?.response?.data?.detail || e.message || "Ошибка посадки",
      }));
    }
  }, [loadPlots]);

  const tryPlaceBuilding = useCallback(async (row, col) => {
    const sel = buildingToPlaceRef.current || selected;
    if (!sel) return;
    
    try {
      const res = await api.post("/api/iso/place-building/", {
        row,
        col,
        building_id: sel.id,
      });
      
      const newBuilding = {
        ...res.data.building,
        name: res.data.building?.name || sel.name,
      };
      
      setState(prev => ({
        ...prev,
        coins: res.data.coins_balance,
        buildings: [...prev.buildings, newBuilding],
      }));
      setBuildingToPlace(null);
      setTimeout(() => load(), 100);
    } catch (e) {
      setState(prev => ({
        ...prev,
        err: e?.response?.data?.detail || e.message || "Ошибка размещения",
      }));
    }
  }, [selected, load]);

  const tryRemoveBuilding = useCallback(async (buildingId) => {
    try {
      const res = await api.post("/api/iso/remove-building/", {
        placement_id: buildingId,
      });
      
      setState(prev => ({
        ...prev,
        coins: res.data.coins_balance,
        buildings: prev.buildings.filter((b) => b.id !== buildingId),
      }));
    } catch (e) {
      setState(prev => ({
        ...prev,
        err: e?.response?.data?.detail || e.message || "Ошибка продажи",
      }));
    }
  }, []);

  const tryMoveBuilding = useCallback(async (buildingId, newRow, newCol) => {
    try {
      const res = await api.post("/api/iso/move-building/", {
        placement_id: buildingId,
        row: newRow,
        col: newCol,
      });
      
      setState(prev => ({
        ...prev,
        buildings: prev.buildings.map((b) =>
          b.id === buildingId ? { ...b, row: newRow, col: newCol } : b
        ),
      }));
      
      setMovingBuilding(null);
      return res.data;
    } catch (e) {
      setState(prev => ({
        ...prev,
        err: e?.response?.data?.detail || e.message || "Ошибка перемещения",
      }));
      throw e;
    }
  }, []);

  // Extraction operations
  const startExtraction = useCallback(async (buildingId) => {
    try {
      await api.post("/api/extraction/start/", { building_id: buildingId });
      load();
    } catch (e) {
      setState(prev => ({
        ...prev,
        err: e?.response?.data?.detail || e.message || "Ошибка запуска добычи",
      }));
    }
  }, [load]);

  const stopExtraction = useCallback(async (processId) => {
    try {
      await api.post("/api/extraction/stop/", { process_id: processId });
      const statusRes = await api.get("/api/extraction/status/");
      setState(prev => ({ ...prev, extractionProcesses: statusRes.data.processes || [] }));
    } catch (e) {
      setState(prev => ({
        ...prev,
        err: e?.response?.data?.detail || e.message || "Ошибка остановки",
      }));
    }
  }, []);

  const collectExtraction = useCallback(async (processId) => {
    try {
      await api.post("/api/extraction/collect/", { process_id: processId });
      const statusRes = await api.get("/api/extraction/status/");
      setState(prev => ({ ...prev, extractionProcesses: statusRes.data.processes || [] }));
    } catch (e) {
      console.error("Collect error:", e);
    }
  }, []);

  // Processing operations
  const startProcessing = useCallback(async (buildingId, recipeId, quantity = 1) => {
    try {
      const access = localStorage.getItem("access");
      await api.post("/api/processing/start/", {
        building_id: buildingId,
        recipe_id: recipeId,
        quantity,
      }, { headers: { Authorization: `Bearer ${access}` } });
      
      const procRes = await api.get("/api/processing/status/", {
        headers: { Authorization: `Bearer ${access}` }
      });
      setState(prev => ({ ...prev, processingProcesses: procRes.data || [] }));
    } catch (e) {
      setState(prev => ({
        ...prev,
        err: e?.response?.data?.detail || e.message || "Ошибка запуска переработки",
      }));
    }
  }, []);

  const stopProcessing = useCallback(async (processId) => {
    try {
      const access = localStorage.getItem("access");
      await api.post("/api/processing/stop/", { process_id: processId }, {
        headers: { Authorization: `Bearer ${access}` }
      });
      const procRes = await api.get("/api/processing/status/", {
        headers: { Authorization: `Bearer ${access}` }
      });
      setState(prev => ({ ...prev, processingProcesses: procRes.data || [] }));
    } catch (e) {
      setState(prev => ({
        ...prev,
        err: e?.response?.data?.detail || e.message || "Ошибка остановки переработки",
      }));
    }
  }, []);

  const collectProcessing = useCallback(async (processId) => {
    try {
      const access = localStorage.getItem("access");
      const res = await api.post("/api/processing/collect/", { process_id: processId }, {
        headers: { Authorization: `Bearer ${access}` }
      });
      const procRes = await api.get("/api/processing/status/", {
        headers: { Authorization: `Bearer ${access}` }
      });
      setState(prev => ({ ...prev, processingProcesses: procRes.data || [] }));
      return res.data;
    } catch (e) {
      setState(prev => ({
        ...prev,
        err: e?.response?.data?.detail || e.message || "Ошибка сбора переработки",
      }));
      throw e;
    }
  }, []);

  // Auto-refresh status
  useEffect(() => {
    const checkStatus = async () => {
      try {
        const [extRes, procRes, plotsRes] = await Promise.all([
          api.get("/api/extraction/status/"),
          api.get("/api/processing/status/"),
          api.get("/api/iso/plots/"),
        ]);
        setState(prev => ({
          ...prev,
          extractionProcesses: extRes.data.processes || [],
          processingProcesses: procRes.data || [],
          plots: plotsRes.data.plots || [],
        }));
      } catch (e) {
        console.error("Status check error:", e);
      }
    };
    
    const interval = setInterval(checkStatus, 5000);
    checkStatus();
    return () => clearInterval(interval);
  }, []);

  // Initial load
  useEffect(() => {
    load();
  }, [load]);

  return {
    // State
    ...state,
    selected,
    unlockedSet,
    selectedId,
    setSelectedId,
    seedModalOpen,
    setSeedModalOpen,
    clickedBuilding,
    setClickedBuilding,
    extractionModalOpen,
    setExtractionModalOpen,
    extractionBuilding,
    setExtractionBuilding,
    hoveredBuilding,
    setHoveredBuilding,
    buildMenuOpen,
    setBuildMenuOpen,
    buildMenuMode,
    setBuildMenuMode,
    buildingToPlace,
    setBuildingToPlace,
    movingBuilding,
    setMovingBuilding,
    moveMode,
    setMoveMode,
    moveChanges,
    setMoveChanges,
    initialBuildingsPos,
    setInitialBuildingsPos,
    processingRecipes,
    setProcessingRecipes,
    
    // Actions
    load,
    loadPlots,
    tryBuyChunk,
    tryPlantSeed,
    tryPlaceBuilding,
    tryRemoveBuilding,
    tryMoveBuilding,
    startExtraction,
    stopExtraction,
    collectExtraction,
    startProcessing,
    stopProcessing,
    collectProcessing,
  };
}
