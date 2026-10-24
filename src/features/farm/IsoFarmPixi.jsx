/**
 * IsoFarmPixi - Main isometric farm component.
 * Uses useIsoFarmEngine hook and renders IsoFarmRenderer + IsoFarmControls.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useIsoFarmEngine } from "./useIsoFarmEngine";
import IsoFarmRenderer from "./IsoFarmRenderer";
import IsoFarmControls from "./IsoFarmControls";
import ShopModal from "./ShopModal";
import AcademyModal from "./AcademyModal";
import MarketModal from "./MarketModal";
import StorageModal from "./StorageModal";
import AppearanceModal from "./AppearanceModal";
import ProfileModal, { ProfileBadge } from "./ProfileModal";
import { api } from "../../shared/services/api";

// Здания с рецептами: окно показывает список рецептов из /api/processing/recipes/
const RECIPE_BUILDING_TYPES = ["processing", "production", "agroproduction"];

const IsoFarmPixi = ({ setCoinsBalance, user, onUserChanged }) => {
  const engine = useIsoFarmEngine();
  const rootRef = useRef(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Анимация работающих зданий: по умолчанию включена, если в системе не выбрано «уменьшить движение»
  const [animate, setAnimate] = useState(() => {
    try {
      const saved = localStorage.getItem("farm.animate");
      if (saved !== null) return saved === "1";
    } catch {
      /* хранилище недоступно — берём системную настройку */
    }
    return !window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  });
  const toggleAnimate = () => setAnimate((v) => {
    try {
      localStorage.setItem("farm.animate", v ? "0" : "1");
    } catch {
      /* не сохранилось — не страшно */
    }
    return !v;
  });

  // Какие здания сейчас работают: идёт добыча или незавершённая переработка/кормление
  const extraction = engine.extractionProcesses;
  const processing = engine.processingProcesses;
  const workingIds = useMemo(() => new Set([
    ...extraction.filter((p) => p.status === "running").map((p) => p.building_id),
    ...processing.filter((p) => p.status === "running" && !p.all_complete).map((p) => p.building_id),
  ]), [extraction, processing]);
  const [shopOpen, setShopOpen] = useState(false);
  const [marketOpen, setMarketOpen] = useState(false);
  const [academyOpen, setAcademyOpen] = useState(false);
  const [storageId, setStorageId] = useState(null);
  const storageBuilding = engine.buildings.find((b) => b.id === storageId) || null;
  // Смена внешнего вида: { slug, name } типа здания, окно открывается поверх окна здания
  const [customize, setCustomize] = useState(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const openCustomize = (building) => building && setCustomize({ slug: building.slug, name: building.name });
  const byType = (type) => engine.buildings.find((b) => b.building_type === type);

  // Баланс в шапке сайта = баланс игры. Движок обновляет coins после постройки,
  // продажи здания, посадки, покупки участка; до первой загрузки поля (fieldCfg) не трогаем.
  useEffect(() => {
    if (engine.fieldCfg) setCoinsBalance?.(engine.coins);
  }, [engine.coins, engine.fieldCfg, setCoinsBalance]);

  // Полноэкранный режим: Fullscreen API (Esc выходит сам), если его нет — разворачиваем блок
  // на всё окно через CSS и выходим по Esc вручную.
  const toggleFullscreen = useCallback(() => {
    const el = rootRef.current;
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else if (isFullscreen) {
      setIsFullscreen(false);
    } else if (el?.requestFullscreen) {
      // Встроенные окна (iframe без allowfullscreen) могут молча не перейти в полноэкранный режим
      const fallback = setTimeout(() => {
        if (!document.fullscreenElement) setIsFullscreen(true);
      }, 400);
      el.requestFullscreen().catch(() => {
        clearTimeout(fallback);
        setIsFullscreen(true);
      });
    } else {
      setIsFullscreen(true);
    }
  }, [isFullscreen]);

  useEffect(() => {
    const root = rootRef.current;
    const onChange = () => setIsFullscreen(document.fullscreenElement === root);
    const onKey = (e) => {
      if (e.key === "Escape" && !document.fullscreenElement) setIsFullscreen(false);
    };
    document.addEventListener("fullscreenchange", onChange);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("fullscreenchange", onChange);
      window.removeEventListener("keydown", onKey);
      if (document.fullscreenElement === root) document.exitFullscreen();
    };
  }, []);

  // Pixi подстраивает холст под размер блока по событию resize окна
  useEffect(() => {
    const id = requestAnimationFrame(() => window.dispatchEvent(new Event("resize")));
    return () => cancelAnimationFrame(id);
  }, [isFullscreen]);

  // Клик по зданию: поле — окно посадки, остальное — окно добычи/переработки
  const handleBuildingClick = async (building) => {
    if (building.building_type === "shop") return setShopOpen(true);
    if (building.building_type === "market") return setMarketOpen(true);
    if (building.building_type === "academy") return setAcademyOpen(true);
    if (building.building_type === "storage") return setStorageId(building.id);
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

  return (
    <div
      ref={rootRef}
      style={
        isFullscreen
          ? { position: "fixed", inset: 0, zIndex: 1500, background: "#2b2b2b" }
          : { position: "relative", width: "100%", height: "100%" }
      }
    >
      {/* Controls: статус и кнопки поверх карты, модальные окна */}
      <IsoFarmControls
        coins={engine.coins}
        err={engine.err}
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
        tryUpgradeBuilding={engine.tryUpgradeBuilding}
        tryOpenCycle={engine.tryOpenCycle}
        onCustomize={openCustomize}
        isFullscreen={isFullscreen}
        onToggleFullscreen={toggleFullscreen}
        animate={animate}
        onToggleAnimate={toggleAnimate}
      />

      <ShopModal
        isOpen={shopOpen}
        onClose={() => setShopOpen(false)}
        coins={engine.coins}
        onCoinsChange={engine.applyCoins}
        onCustomize={() => openCustomize(byType("shop"))}
      />
      <MarketModal
        isOpen={marketOpen}
        onClose={() => setMarketOpen(false)}
        onCoinsChange={engine.applyCoins}
        onCustomize={() => openCustomize(byType("market"))}
      />
      <AcademyModal
        isOpen={academyOpen}
        onClose={() => setAcademyOpen(false)}
        onCoinsChange={engine.applyCoins}
        onLearned={() => {
          // Новая квалификация меняет доступные постройки и циклы зданий, а очки — значок профиля
          engine.load();
          onUserChanged?.();
        }}
      />
      <StorageModal
        building={storageBuilding}
        onClose={() => setStorageId(null)}
        coins={engine.coins}
        onUpgrade={engine.tryUpgradeBuilding}
        onSell={engine.tryRemoveBuilding}
        onCustomize={() => openCustomize(storageBuilding)}
      />
      <ProfileBadge user={user} onOpen={() => setProfileOpen(true)} />
      <ProfileModal isOpen={profileOpen} onClose={() => setProfileOpen(false)} onSaved={onUserChanged} />
      {customize && (
        <AppearanceModal
          key={customize.slug}
          target={customize}
          saved={engine.appearances[customize.slug] || null}
          coins={engine.coins}
          price={engine.appearancePrice}
          onSave={engine.tryChangeAppearance}
          onReset={(slug) => engine.tryChangeAppearance(slug, null)}
          onClose={() => setCustomize(null)}
        />
      )}

      {/* Game canvas */}
      <div style={{ position: "absolute", inset: 0 }}>
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
          appearances={engine.appearances}
          workingIds={workingIds}
          animate={animate}
          onBuildingClick={handleBuildingClick}
          onBuyChunk={engine.tryBuyChunk}
          onPlaceBuilding={engine.tryPlaceBuilding}
          onMoveBuilding={engine.tryMoveBuilding}
        />
      </div>
    </div>
  );
};

export default IsoFarmPixi;
