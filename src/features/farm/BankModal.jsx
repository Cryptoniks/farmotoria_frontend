import { useEffect, useState } from "react";
import { api } from "../../shared/services/api";
import "./SeedSelectModal.css";
import "./FarmModals.css";

const fmt = (n) => (n ?? 0).toLocaleString("ru-RU");
const toInt = (v) => Math.max(0, parseInt(v) || 0);

/** Банк: обмен алмазов и монет, кредит (процент сразу в сумме к возврату, гасится частями). */
export default function BankModal({ isOpen, onClose, onChanged }) {
  const [data, setData] = useState(null);
  const [tab, setTab] = useState("exchange");
  const [sell, setSell] = useState("1");
  const [buy, setBuy] = useState("1");
  const [loanAmount, setLoanAmount] = useState("");
  const [repayAmount, setRepayAmount] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState({ text: "", error: false });

  useEffect(() => {
    if (!isOpen) return;
    setStatus({ text: "", error: false });
    api.get("/api/bank/")
      .then((res) => setData(res.data))
      .catch(() => setStatus({ text: "Ошибка загрузки Банка", error: true }));
  }, [isOpen]);

  if (!isOpen) return null;

  const run = async (url, body, okText) => {
    setBusy(true);
    try {
      const res = await api.post(url, body);
      setData(res.data);
      onChanged?.(res.data);
      setStatus({ text: okText(res.data), error: false });
    } catch (e) {
      setStatus({ text: e?.response?.data?.detail || "Операция не выполнена", error: true });
    }
    setBusy(false);
  };

  const rates = data?.rates;
  const loan = data?.loan;
  const sellN = toInt(sell);
  const buyN = toInt(buy);
  const loanN = toInt(loanAmount);
  const repayN = toInt(repayAmount);
  const maxBuy = data ? Math.floor(data.coins_balance / rates.buy_diamond) : 0;
  const due = (n) => n + Math.ceil(n * (data?.loan_rate || 0));

  return (
    <div className="seed-modal-overlay" onClick={onClose}>
      <div className="seed-modal-content farm-modal-wide" onClick={(e) => e.stopPropagation()}>
        <div className="seed-modal-header">
          <h2>🏦 Банк</h2>
          <button className="seed-modal-close" onClick={onClose}>&times;</button>
        </div>

        <div className="seed-modal-body">
          {!data ? (
            <div className="farm-modal-empty">{status.text || "Загрузка..."}</div>
          ) : (
            <>
              <div className="academy-summary">
                <span>💰 <b>{fmt(data.coins_balance)}</b> монет</span>
                <span>💎 <b>{fmt(data.diamonds_balance)}</b> алмазов</span>
              </div>

              <div className="farm-modal-tabs academy-tabs">
                <button className={`farm-modal-tab ${tab === "exchange" ? "active" : ""}`} onClick={() => setTab("exchange")}>Обмен</button>
                <button className={`farm-modal-tab ${tab === "loan" ? "active" : ""}`} onClick={() => setTab("loan")}>
                  Кредит{loan ? " •" : ""}
                </button>
              </div>

              {status.text && <div className={`farm-modal-status ${status.error ? "error" : ""}`}>{status.text}</div>}

              {tab === "exchange" && (
                <div className="bank-grid">
                  <div className="academy-card">
                    <div className="farm-modal-name">💎 → 💰 Продать алмазы</div>
                    <div className="farm-modal-sub">1 алмаз = {fmt(rates.sell_diamond)} монет</div>
                    <div className="bank-row">
                      <input className="farm-modal-input" type="number" min="1" value={sell} onChange={(e) => setSell(e.target.value)} />
                      <button type="button" className="farm-modal-btn ghost" onClick={() => setSell(String(data.diamonds_balance))}
                        disabled={data.diamonds_balance === 0}>Все</button>
                    </div>
                    <div className="bank-total">Получите: 💰 {fmt(sellN * rates.sell_diamond)}</div>
                    <button className="farm-modal-btn bank-action" disabled={busy || sellN < 1 || sellN > data.diamonds_balance}
                      onClick={() => run("/api/bank/exchange/", { direction: "sell", diamonds: sellN },
                        () => `✅ Продано алмазов: ${sellN}, получено 💰 ${fmt(sellN * rates.sell_diamond)}`)}>
                      Продать
                    </button>
                  </div>

                  <div className="academy-card">
                    <div className="farm-modal-name">💰 → 💎 Купить алмазы</div>
                    <div className="farm-modal-sub">1 алмаз = {fmt(rates.buy_diamond)} монет — дорого, но честно заработано</div>
                    <div className="bank-row">
                      <input className="farm-modal-input" type="number" min="1" value={buy} onChange={(e) => setBuy(e.target.value)} />
                      <button type="button" className="farm-modal-btn ghost" onClick={() => setBuy(String(maxBuy))} disabled={maxBuy === 0}>
                        Макс ({maxBuy})
                      </button>
                    </div>
                    <div className="bank-total">Стоимость: 💰 {fmt(buyN * rates.buy_diamond)}</div>
                    <button className="farm-modal-btn bank-action" disabled={busy || buyN < 1 || buyN > maxBuy}
                      onClick={() => run("/api/bank/exchange/", { direction: "buy", diamonds: buyN },
                        () => `✅ Куплено алмазов: ${buyN}`)}>
                      Купить
                    </button>
                  </div>
                </div>
              )}

              {tab === "loan" && (
                <div className="academy-card">
                  {loan ? (
                    <>
                      <div className="farm-modal-name">Текущий кредит</div>
                      <div className="confirm-prices">
                        <span>Взято: 💰 {fmt(loan.amount)}</span>
                        <span>К возврату: 💰 {fmt(loan.total_due)}</span>
                        <span>Погашено: 💰 {fmt(loan.repaid)}</span>
                      </div>
                      <div className="capacity-bar" style={{ marginTop: 8 }}>
                        <div className="capacity-bar-fill" style={{ width: `${Math.round((loan.repaid / loan.total_due) * 100)}%` }} />
                      </div>
                      <div className="bank-total">Осталось вернуть: 💰 {fmt(loan.remaining)}</div>
                      <div className="bank-row">
                        <input className="farm-modal-input" type="number" min="1" placeholder="Сумма" value={repayAmount}
                          onChange={(e) => setRepayAmount(e.target.value)} />
                        <button className="farm-modal-btn" disabled={busy || repayN < 1 || repayN > data.coins_balance}
                          onClick={() => run("/api/bank/repay/", { amount: repayN },
                            (d) => (d.loan ? `✅ Погашено 💰 ${fmt(Math.min(repayN, loan.remaining))}` : "✅ Кредит закрыт"))}>
                          Погасить часть
                        </button>
                      </div>
                      <button className="farm-modal-btn bank-action" disabled={busy || data.coins_balance < loan.remaining}
                        onClick={() => run("/api/bank/repay/", {}, () => "✅ Кредит полностью погашен")}>
                        Погасить всё — 💰 {fmt(loan.remaining)}
                      </button>
                      <div className="farm-modal-sub" style={{ marginTop: 8 }}>
                        Срок не ограничен. Новый кредит можно взять после полного погашения.
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="farm-modal-name">Взять кредит</div>
                      <div className="farm-modal-sub">
                        Ставка {Math.round(data.loan_rate * 100)}% сразу входит в сумму к возврату. Срок не ограничен,
                        гасить можно частями. Лимит — 1 000 монет за каждый уровень игрока.
                      </div>
                      <div className="bank-row">
                        <input className="farm-modal-input" type="number" min="1" max={data.loan_limit} placeholder="Сумма"
                          value={loanAmount} onChange={(e) => setLoanAmount(e.target.value)} />
                        <button type="button" className="farm-modal-btn ghost" onClick={() => setLoanAmount(String(data.loan_limit))}>
                          Макс ({fmt(data.loan_limit)})
                        </button>
                      </div>
                      <div className="bank-total">Вернуть нужно будет: 💰 {fmt(due(loanN))}</div>
                      <button className="farm-modal-btn bank-action" disabled={busy || loanN < 1 || loanN > data.loan_limit}
                        onClick={() => run("/api/bank/loan/", { amount: loanN }, () => `✅ Получено 💰 ${fmt(loanN)}`)}>
                        Взять кредит
                      </button>
                    </>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
