// Посадки на фермерском поле: готовность считается по часам браузера,
// не дожидаясь, пока сервер при следующем опросе сменит статус на "ready".

export const plotReadyAt = (plot) => (plot?.ready_at ? Date.parse(plot.ready_at) : NaN);

export function isPlotReady(plot, now = Date.now()) {
  return plot?.status === "ready" || Boolean(plot?.is_ready) || plotReadyAt(plot) <= now;
}

/** Через сколько миллисекунд созреет ближайшая из растущих посадок (null — ждать нечего). */
export function msUntilNextReady(plots, now = Date.now()) {
  const waits = (plots || [])
    .filter((p) => !isPlotReady(p, now))
    .map((p) => plotReadyAt(p) - now)
    .filter((ms) => ms > 0);
  return waits.length ? Math.min(...waits) : null;
}

/**
 * Почему здание занято: посадка (растёт или не собрана), добыча, производство или кормление (продукция не забрана).
 * Пока здание занято, улучшить его нельзя — то же правило проверяет сервер.
 */
export function buildingBusyReason(buildingId, { plots, extractionProcesses, processingProcesses }, now = Date.now()) {
  if (buildingId == null) return null;
  const plot = (plots || []).find((p) => p.building_id === buildingId);
  if (plot) {
    return isPlotReady(plot, now)
      ? "На поле созрел урожай — сначала соберите его"
      : "На поле растёт урожай — дождитесь и соберите его";
  }
  if ((extractionProcesses || []).some((p) => p.building_id === buildingId && p.status === "running")) {
    return "Идёт добыча — сначала остановите её";
  }
  if ((processingProcesses || []).some((p) => p.building_id === buildingId && p.status === "running")) {
    return "Идёт производство — дождитесь и заберите продукцию";
  }
  return null;
}
