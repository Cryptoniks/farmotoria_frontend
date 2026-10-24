import { useEffect, useState } from "react";
import PlantIcon from "../../components/PlantIcon";
import "./FarmModals.css";
import { useT } from "../../i18n/context";

const ANIMAL_EMOJI = { "chicken-coop": "🐔", pigsty: "🐷", cowshed: "🐄", sheepfold: "🐑" };

/**
 * Животные здания животноводства — сетка 3×3: каждое животное кормится отдельно (N кормлений → продукты).
 * Ячейки: животное (голодное / ест / продукты готовы), «Купить» следующее, закрытые — до нужного уровня навыка.
 */
export default function AnimalsPanel({ building, processes, recipes, coins, onStart, onStop, onCollect, onBuyAnimal }) {
  const t = useT();
  const [now, setNow] = useState(() => Date.now());
  const [qty, setQty] = useState("1");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const own = (processes || []).filter((p) => p.building_id === building.id).sort((a, b) => a.id - b.id);
  const eating = own.some((p) => !p.all_complete);

  useEffect(() => {
    if (!eating) return undefined;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [eating]);

  const emoji = ANIMAL_EMOJI[building.slug] || "🐾";
  const recipe = recipes?.[0];
  const { animals, max_animals: max, animal_price: price, animal_lock_reason: lockReason } = building;
  const hungry = Math.max(0, animals - own.length);
  const ready = own.filter((p) => p.all_complete);
  const maxFeeds = recipe?.max_possible || 0;
  const perAnimal = Math.max(1, parseInt(qty) || 1);

  const run = async (action) => {
    setBusy(true);
    setError("");
    try {
      await action();
    } catch (e) {
      setError(e?.response?.data?.detail || e?.message || t("common.error"));
    }
    setBusy(false);
  };

  const feedOne = () => run(() => onStart(building.id, recipe.id, perAnimal));
  const feedAll = () => run(async () => {
    for (let i = 0; i < hungry; i++) await onStart(building.id, recipe.id, perAnimal);
  });
  const collectAll = () => run(async () => {
    for (const p of ready) await onCollect(p.id);
  });
  const buy = () => run(async () => {
    const res = await onBuyAnimal?.(building.id);
    if (res?.error) throw new Error(res.error);
  });

  const cells = [];
  for (let i = 0; i < max; i++) {
    const p = own[i];
    if (p && p.all_complete) {
      cells.push(
        <div key={i} className="animal-cell ready">
          <div className="animal-emoji">{emoji}</div>
          <div className="animal-state">✅ {p.output_item_name} ×{p.output_quantity}</div>
          <button className="animal-btn" disabled={busy} onClick={() => run(() => onCollect(p.id))}>{t("common.collect")}</button>
        </div>
      );
    } else if (p) {
      const left = p.ready_at ? new Date(p.ready_at).getTime() - now : 0;
      cells.push(
        <div key={i} className="animal-cell eating">
          <div className="animal-emoji">{emoji}</div>
          <div className="animal-state">{t("animals.feeding", { done: Math.min(p.quantity_done + 1, p.quantity), total: p.quantity })}</div>
          <div className="animal-timer">{left > 0 ? t.duration(left) : t("animals.almostDone")}</div>
          <button className="animal-btn ghost" disabled={busy} title={t("animals.stopTitle")}
            onClick={() => run(() => onStop(p.id))}>⏹</button>
        </div>
      );
    } else if (i < animals) {
      cells.push(
        <div key={i} className="animal-cell hungry">
          <div className="animal-emoji">{emoji}</div>
          <div className="animal-state">{t("animals.hungry")}</div>
          <button className="animal-btn" disabled={busy || !recipe || maxFeeds < perAnimal} onClick={feedOne}
            title={maxFeeds < perAnimal ? t("animals.noFeed") : undefined}>{t("animals.feed")}</button>
        </div>
      );
    } else if (i === animals) {
      cells.push(
        <div key={i} className={`animal-cell buy ${lockReason ? "locked" : ""}`} title={lockReason || undefined}>
          <div className="animal-emoji">{lockReason ? "🔒" : "➕"}</div>
          {lockReason ? (
            <div className="animal-state">{t("animals.needLevel", { level: i + 1 })}</div>
          ) : (
            <button className="animal-btn" disabled={busy || coins < price} onClick={buy}
              title={coins < price ? t("common.noCoins") : undefined}>
              {t("animals.buy", { price: t.num(price) })}
            </button>
          )}
        </div>
      );
    } else {
      cells.push(
        <div key={i} className="animal-cell locked" title={t("animals.opensAt", { level: i + 1 })}>
          <div className="animal-emoji">🔒</div>
          <div className="animal-state">{t("animals.lockedLevel", { level: i + 1 })}</div>
        </div>
      );
    }
  }

  return (
    <div className="animals-panel">
      <div className="cycles-head">
        <span className="farm-modal-name">{t("animals.count", { count: animals, max })}</span>
        <span className="farm-modal-sub">{t("animals.summary", { hungry, ready: ready.length })}</span>
      </div>

      {recipe && (
        <div className="animals-feed">
          <span className="recipe-name">
            {recipe.output_item_slug && <PlantIcon plant={{ slug: recipe.output_item_slug, name: recipe.output_item_name }} size={20} />}
            {" "}{recipe.ingredients.map((ing) => `${ing.item_name} ×${ing.quantity}`).join(", ")} → {recipe.output_quantity} {recipe.output_item_name}
            {" "}{t("animals.recipeTime", { time: t.minutes(recipe.duration_seconds) })}
          </span>
          <span className="farm-modal-sub">{t("animals.feedEnough", { count: maxFeeds })}</span>
          <label className="animals-qty">
            {t("animals.feedsPerAnimal")}
            <input type="number" min="1" value={qty} onChange={(e) => setQty(e.target.value)} />
            <button type="button" disabled={hungry === 0 || maxFeeds < hungry}
              onClick={() => setQty(String(Math.max(1, Math.floor(maxFeeds / Math.max(1, hungry)))))}>
              {t("common.max")}
</button>
          </label>
          <div className="animals-actions">
            <button className="farm-modal-btn" disabled={busy || hungry === 0 || maxFeeds < perAnimal * hungry} onClick={feedAll}>
              {t("animals.feedAll", { count: hungry })}
            </button>
            <button className="farm-modal-btn sell" disabled={busy || ready.length === 0} onClick={collectAll}>
              {t("animals.collectAll", { count: ready.length })}
            </button>
          </div>
        </div>
      )}

      <div className="animals-grid">{cells}</div>
      {lockReason && animals < max && <div className="academy-hint">🔒 {lockReason}</div>}
      {error && <div className="farm-modal-error">{error}</div>}
    </div>
  );
}
