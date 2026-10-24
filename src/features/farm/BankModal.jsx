import { useEffect, useState } from "react";
import { api } from "../../shared/services/api";
import "./SeedSelectModal.css";
import "./FarmModals.css";
import { useT } from "../../i18n/context";

const toInt = (v) => Math.max(0, parseInt(v) || 0);

/** Банк: обмен алмазов и монет, кредит (процент сразу в сумме к возврату, гасится частями). */
export default function BankModal({ isOpen, onClose, onChanged }) {
  const t = useT();
  const fmt = t.num;
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
      .catch(() => setStatus({ text: t("bank.loadError"), error: true }));
  }, [isOpen, t]);

  if (!isOpen) return null;

  const run = async (url, body, okText) => {
    setBusy(true);
    try {
      const res = await api.post(url, body);
      setData(res.data);
      onChanged?.(res.data);
      setStatus({ text: okText(res.data), error: false });
    } catch (e) {
      setStatus({ text: e?.response?.data?.detail || t("bank.failed"), error: true });
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
          <h2>{t("bank.title")}</h2>
          <button className="seed-modal-close" onClick={onClose}>&times;</button>
        </div>

        <div className="seed-modal-body">
          {!data ? (
            <div className="farm-modal-empty">{status.text || t("common.loading")}</div>
          ) : (
            <>
              <div className="academy-summary">
                <span>💰 <b>{fmt(data.coins_balance)}</b> {t("bank.coins")}</span>
                <span>💎 <b>{fmt(data.diamonds_balance)}</b> {t("bank.diamonds")}</span>
              </div>

              <div className="farm-modal-tabs academy-tabs">
                <button className={`farm-modal-tab ${tab === "exchange" ? "active" : ""}`} onClick={() => setTab("exchange")}>{t("bank.tab.exchange")}</button>
                <button className={`farm-modal-tab ${tab === "loan" ? "active" : ""}`} onClick={() => setTab("loan")}>
                  {t("bank.tab.loan")}{loan ? " •" : ""}
                </button>
              </div>

              {status.text && <div className={`farm-modal-status ${status.error ? "error" : ""}`}>{status.text}</div>}

              {tab === "exchange" && (
                <div className="bank-grid">
                  <div className="academy-card">
                    <div className="farm-modal-name">{t("bank.sell.title")}</div>
                    <div className="farm-modal-sub">{t("bank.rate", { coins: fmt(rates.sell_diamond) })}</div>
                    <div className="bank-row">
                      <input className="farm-modal-input" type="number" min="1" value={sell} onChange={(e) => setSell(e.target.value)} />
                      <button type="button" className="farm-modal-btn ghost" onClick={() => setSell(String(data.diamonds_balance))}
                        disabled={data.diamonds_balance === 0}>{t("bank.all")}</button>
                    </div>
                    <div className="bank-total">{t("bank.youGet", { coins: fmt(sellN * rates.sell_diamond) })}</div>
                    <button className="farm-modal-btn bank-action" disabled={busy || sellN < 1 || sellN > data.diamonds_balance}
                      onClick={() => run("/api/bank/exchange/", { direction: "sell", diamonds: sellN },
                        () => t("bank.sold", { count: sellN, coins: fmt(sellN * rates.sell_diamond) }))}>
                      {t("bank.sell")}
                    </button>
                  </div>

                  <div className="academy-card">
                    <div className="farm-modal-name">{t("bank.buy.title")}</div>
                    <div className="farm-modal-sub">{t("bank.buyRate", { coins: fmt(rates.buy_diamond) })}</div>
                    <div className="bank-row">
                      <input className="farm-modal-input" type="number" min="1" value={buy} onChange={(e) => setBuy(e.target.value)} />
                      <button type="button" className="farm-modal-btn ghost" onClick={() => setBuy(String(maxBuy))} disabled={maxBuy === 0}>
                        {t("bank.max", { value: maxBuy })}
                      </button>
                    </div>
                    <div className="bank-total">{t("bank.cost", { coins: fmt(buyN * rates.buy_diamond) })}</div>
                    <button className="farm-modal-btn bank-action" disabled={busy || buyN < 1 || buyN > maxBuy}
                      onClick={() => run("/api/bank/exchange/", { direction: "buy", diamonds: buyN },
                        () => t("bank.bought", { count: buyN }))}>
                      {t("common.buy")}
                    </button>
                  </div>
                </div>
              )}

              {tab === "loan" && (
                <div className="academy-card">
                  {loan ? (
                    <>
                      <div className="farm-modal-name">{t("bank.loan.current")}</div>
                      <div className="confirm-prices">
                        <span>{t("bank.loan.taken", { coins: fmt(loan.amount) })}</span>
                        <span>{t("bank.loan.due", { coins: fmt(loan.total_due) })}</span>
                        <span>{t("bank.loan.repaid", { coins: fmt(loan.repaid) })}</span>
                      </div>
                      <div className="capacity-bar" style={{ marginTop: 8 }}>
                        <div className="capacity-bar-fill" style={{ width: `${Math.round((loan.repaid / loan.total_due) * 100)}%` }} />
                      </div>
                      <div className="bank-total">{t("bank.loan.left", { coins: fmt(loan.remaining) })}</div>
                      <div className="bank-row">
                        <input className="farm-modal-input" type="number" min="1" placeholder={t("bank.loan.amount")} value={repayAmount}
                          onChange={(e) => setRepayAmount(e.target.value)} />
                        <button className="farm-modal-btn" disabled={busy || repayN < 1 || repayN > data.coins_balance}
                          onClick={() => run("/api/bank/repay/", { amount: repayN },
                            (d) => (d.loan ? t("bank.loan.paid", { coins: fmt(Math.min(repayN, loan.remaining)) }) : t("bank.loan.closed")))}>
                          {t("bank.loan.repayPart")}
                        </button>
                      </div>
                      <button className="farm-modal-btn bank-action" disabled={busy || data.coins_balance < loan.remaining}
                        onClick={() => run("/api/bank/repay/", {}, () => t("bank.loan.fullyRepaid"))}>
                        {t("bank.loan.repayAll", { coins: fmt(loan.remaining) })}
                      </button>
                      <div className="farm-modal-sub" style={{ marginTop: 8 }}>
                        {t("bank.loan.noDeadline")}
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="farm-modal-name">{t("bank.loan.take")}</div>
                      <div className="farm-modal-sub">
                        {t("bank.loan.terms", { rate: Math.round(data.loan_rate * 100) })}
                      </div>
                      <div className="bank-row">
                        <input className="farm-modal-input" type="number" min="1" max={data.loan_limit} placeholder={t("bank.loan.amount")}
                          value={loanAmount} onChange={(e) => setLoanAmount(e.target.value)} />
                        <button type="button" className="farm-modal-btn ghost" onClick={() => setLoanAmount(String(data.loan_limit))}>
                          {t("bank.max", { value: fmt(data.loan_limit) })}
                        </button>
                      </div>
                      <div className="bank-total">{t("bank.loan.willRepay", { coins: fmt(due(loanN)) })}</div>
                      <button className="farm-modal-btn bank-action" disabled={busy || loanN < 1 || loanN > data.loan_limit}
                        onClick={() => run("/api/bank/loan/", { amount: loanN }, () => t("bank.loan.got", { coins: fmt(loanN) }))}>
                        {t("bank.loan.take")}
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
