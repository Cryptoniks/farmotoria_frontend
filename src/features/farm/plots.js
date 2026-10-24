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
