"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CheckCircle2, ChevronRight, CircleAlert, Clock3, FileKey2, Play, RefreshCw, ShieldCheck, XCircle } from "lucide-react";

type Symbol = "SPY" | "QQQ";
type Lifecycle = "SIGNED" | "USED" | "EXPIRED";
type Execution = "HELD" | "SUBMITTED" | "BROKER_ERROR" | "REJECTED" | "UNKNOWN";
interface Leg { symbol: string; side: "buy" | "sell"; ratioQty: number; positionIntent: string }
interface Intent { underlying: Symbol; structure: string; legs: Leg[]; quantity: number; limitPrice: string; limitPriceBand: { min: string; max: string }; standaloneMaxLoss: string; expiry: string; dte: number; thesis: string; policyHash: string; marketSnapshotHash: string; accountSnapshotHash: string }
interface Draft { draftId: string; symbol: Symbol; intent: Intent; createdAt: string; expiresAt: string; policy: { plainEnglishEcho: string; policyHash: string } }
interface Permit { permitId: string; expiresAt: string; signature: string; signingKeyId: string; nonce: string; policyHash: string }
interface Summary { permitId: string; symbol: Symbol; structure: string; quantity: number; maxLoss: string; createdAt: string; expiresAt: string; lifecycle: Lifecycle; execution: Execution; orderId: string | null }
interface Detail extends Summary { permit: Permit; intent: Intent; usedAt: string | null; requestId: string | null; rejectionCode: string | null; rejectionReason: string | null }

interface ActivePolicyInfo {
  policy: {
    id: string;
    version: number;
    plainEnglishEcho: string;
    allowedUnderlyings: string[];
    allowedStructures: string[];
    riskProfile: string;
  };
  caps: {
    perTradeMaxLoss: string;
    portfolioHeat: string;
    dailyHalt: string;
  };
}

interface ToastNotification {
  id: string;
  tone: "success" | "error" | "info";
  title: string;
  message: string;
}

function formatTimer(expiresAt: string | undefined, now: number): string {
  if (!expiresAt) return "00:60";
  const seconds = Math.max(0, Math.ceil((Date.parse(expiresAt) - now) / 1000));
  return `00:${String(seconds).padStart(2, "0")}`;
}
function short(value: string, size = 10): string { return value.length > size * 2 ? `${value.slice(0, size)}...${value.slice(-size)}` : value; }
function statusClass(status: Lifecycle | Execution): string {
  if (status === "SIGNED" || status === "SUBMITTED") return "bg-emerald-50 text-emerald-800 border-emerald-800/25";
  if (status === "EXPIRED" || status === "BROKER_ERROR" || status === "REJECTED") return "bg-rose-50 text-rose-800 border-rose-800/25";
  return "bg-[#F4F3EA] text-[#5F5E56] border-black/15";
}
async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { ...init, headers: { "content-type": "application/json", ...init?.headers } });
  const body = await response.json() as T & { error?: string; message?: string };
  if (!response.ok) throw new Error(body.message ?? body.error ?? "Request failed.");
  return body;
}

export default function PermitsPage() {
  const [symbol, setSymbol] = useState<Symbol>("SPY");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [active, setActive] = useState<{ permit: Permit; intent: Intent } | null>(null);
  const [history, setHistory] = useState<Summary[]>([]);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [filter, setFilter] = useState<"ALL" | Lifecycle>("ALL");
  const [now, setNow] = useState(Date.now());
  const [busy, setBusy] = useState<"prepare" | "sign" | "execute" | null>(null);
  const [notice, setNotice] = useState<{ tone: "error" | "success"; text: string } | null>(null);
  const [storageMessage, setStorageMessage] = useState<string | null>(null);
  const [activePolicy, setActivePolicy] = useState<ActivePolicyInfo | null>(null);
  const [toasts, setToasts] = useState<ToastNotification[]>([]);

  const pushToast = useCallback((tone: "success" | "error" | "info", title: string, message: string) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev, { id, tone, title, message }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 6000);
  }, []);

  const loadActivePolicy = useCallback(async () => {
    try {
      const res = await fetch("/api/mandates/active");
      if (res.ok) {
        const body = (await res.json()) as ActivePolicyInfo;
        setActivePolicy(body);
        if (body?.policy?.allowedUnderlyings?.length) {
          const allowed = body.policy.allowedUnderlyings as Symbol[];
          setSymbol((curr) => (allowed.includes(curr) ? curr : (allowed[0] ?? "SPY")));
        }
      }
    } catch {
      // Ignore
    }
  }, []);

  const loadHistory = useCallback(async () => {
    try {
      const body = await request<{ permits: Summary[]; serverTime: string }>("/api/permits");
      setHistory(body.permits);
      setNow(Date.parse(body.serverTime));
      setStorageMessage(null);
    } catch (error) {
      setStorageMessage(error instanceof Error ? error.message : "Permit history is unavailable.");
    }
  }, []);

  useEffect(() => {
    void loadHistory();
    void loadActivePolicy();
  }, [loadHistory, loadActivePolicy]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 250);
    const refresh = window.setInterval(() => void loadHistory(), 5000);
    const onFocus = () => {
      setNow(Date.now());
      void loadHistory();
      void loadActivePolicy();
    };
    window.addEventListener("focus", onFocus);
    return () => {
      window.clearInterval(timer);
      window.clearInterval(refresh);
      window.removeEventListener("focus", onFocus);
    };
  }, [loadHistory, loadActivePolicy]);

  const countdown = formatTimer(active?.permit.expiresAt, now);
  const activeExpired = active ? Date.parse(active.permit.expiresAt) <= now : false;
  const filtered = useMemo(() => filter === "ALL" ? history : history.filter((permit) => permit.lifecycle === filter), [filter, history]);

  const isSpyAllowed = !activePolicy || activePolicy.policy.allowedUnderlyings.includes("SPY");
  const isQqqAllowed = !activePolicy || activePolicy.policy.allowedUnderlyings.includes("QQQ");

  const prepare = async () => {
    setBusy("prepare");
    setNotice(null);
    setDraft(null);
    setActive(null);
    try {
      const body = await request<{ draft: Draft }>("/api/permits/prepare", { method: "POST", body: JSON.stringify({ symbol }) });
      setDraft(body.draft);
      const msg = `Trade prepared for ${symbol} (${body.draft.intent.structure.replaceAll("_", " ")}). Review exact legs before signing.`;
      setNotice({ tone: "success", text: msg });
      pushToast("success", "Trade Prepared", msg);
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Preparation failed.";
      setNotice({ tone: "error", text: msg });
      pushToast("error", "Trade Preparation Failed", msg);
    } finally {
      setBusy(null);
    }
  };

  const sign = async () => {
    if (!draft) return;
    setBusy("sign");
    setNotice(null);
    try {
      const body = await request<{ permit: Permit; intent: Intent }>("/api/permits/sign", {
        method: "POST",
        body: JSON.stringify({ draftId: draft.draftId })
      });
      setActive({ permit: body.permit, intent: body.intent });
      setDraft(null);
      setNow(Date.now());
      const msg = "Permit signed cryptographically. 60-second execution authority window is now open.";
      setNotice({ tone: "success", text: msg });
      pushToast("success", "Permit Signed", msg);
      await loadHistory();
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Signing failed.";
      setNotice({ tone: "error", text: msg });
      pushToast("error", "Signing Failed", msg);
    } finally {
      setBusy(null);
    }
  };

  const execute = async () => {
    if (!active) return;
    setBusy("execute");
    setNotice(null);
    try {
      const body = await request<{ permit: Detail }>(`/api/permits/${active.permit.permitId}/execute`, {
        method: "POST",
        body: "{}"
      });
      setDetail(body.permit);
      const msg = body.permit.orderId
        ? `Paper order ${body.permit.orderId} submitted to Alpaca Paper.`
        : "Permit consumed; broker result recorded.";
      setNotice({ tone: "success", text: msg });
      pushToast("success", "Execution Submitted", msg);
      await loadHistory();
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Execution failed.";
      setNotice({ tone: "error", text: msg });
      pushToast("error", "Execution Failed", msg);
      await loadHistory();
    } finally {
      setBusy(null);
    }
  };

  const openDetail = async (permitId: string) => {
    try {
      const body = await request<{ permit: Detail }>(`/api/permits/${permitId}`);
      setDetail(body.permit);
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Could not load permit.";
      setNotice({ tone: "error", text: msg });
      pushToast("error", "Permit Load Error", msg);
    }
  };

  return (
    <div className="min-h-screen bg-[#F0EFE3] text-[#232323] relative">
      <div className="mx-auto max-w-[1400px] px-5 py-10 md:px-8 md:py-14">
        <header className="flex flex-col gap-6 border-b border-black/15 pb-8 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <div className="mb-4 flex flex-wrap items-center gap-2 text-[10px] font-mono font-bold tracking-[0.12em] text-[#5F5E56]">
              <span className="border border-black/15 bg-white px-2.5 py-1">PERMIT CONSOLE</span>
              <span className="border border-black/15 bg-[#EAEEDD] px-2.5 py-1">PAPER ONLY</span>
            </div>
            <h1 className="max-w-2xl text-4xl font-semibold leading-[1.02] tracking-tight md:text-6xl">
              Authority with an expiry.
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-[#67665F]">
              Review one exact spread, issue a signed capability, and submit it only while its 60-second authority window is still valid.
            </p>
          </div>
          <div className="border border-black/15 bg-white p-4 font-mono text-xs leading-relaxed text-[#5F5E56] lg:w-[310px]">
            <div className="flex items-center justify-between text-[#232323]">
              <span>CRYPTOGRAPHY</span>
              <ShieldCheck className="h-4 w-4 text-emerald-700" />
            </div>
            <p className="mt-3">
              Ed25519 signatures, server time, persistent nonce consumption, and Alpaca Paper submission.
            </p>
          </div>
        </header>

        {/* Active Policy Status Bar */}
        {activePolicy && (
          <div className="mt-6 bg-[#EAEEDD] border border-black/15 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 font-mono text-xs">
            <div>
              <span className="text-[10px] font-bold text-[#0B4FFF] uppercase tracking-widest flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
                Active Operational Policy In Effect
              </span>
              <div className="mt-1 font-bold text-sm text-[#232323]">
                {activePolicy.policy.id} <span className="font-normal text-xs text-[#74736A]">(v{activePolicy.policy.version} · {activePolicy.policy.riskProfile})</span>
              </div>
              <div className="text-[11px] text-[#74736A] mt-0.5">
                Cap per trade: {activePolicy.caps.perTradeMaxLoss} · Heat: {activePolicy.caps.portfolioHeat}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[10px] text-[#74736A] uppercase font-bold">Allowed Underlyings:</span>
              {activePolicy.policy.allowedUnderlyings.map((u) => (
                <span key={u} className="px-2 py-0.5 bg-white border border-black/15 font-bold text-emerald-900 text-xs">
                  {u}
                </span>
              ))}
            </div>
          </div>
        )}

        {notice && (
          <div className={`mt-6 flex items-start gap-3 border p-4 text-sm ${
            notice.tone === "error" ? "border-rose-800/30 bg-rose-50 text-rose-900" : "border-emerald-800/25 bg-emerald-50 text-emerald-900"
          }`}>
            <span>{notice.tone === "error" ? <CircleAlert className="h-5 w-5" /> : <CheckCircle2 className="h-5 w-5" />}</span>
            <p>{notice.text}</p>
          </div>
        )}

        <section className="mt-8 grid gap-6 lg:grid-cols-[0.82fr_1.18fr]">
          <div className="border border-black/15 bg-white p-6 md:p-7 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-mono text-[10px] font-bold tracking-[0.12em] text-[#74736A]">OPERATOR GATE</p>
                  <h2 className="mt-2 text-xl font-semibold">Console Ready</h2>
                </div>
                <ShieldCheck className="h-5 w-5 text-emerald-700" />
              </div>
              <div className="mt-5 border-t border-black/10 pt-4 text-xs text-[#5F5E56] leading-relaxed space-y-2">
                <p>
                  Interactive sandbox environment active. Any operator can inspect live candidate spreads, review exact OCC contract legs, and cryptographically sign 60-second Ed25519 permits directly.
                </p>
                <p className="font-mono text-[11px] text-[#74736A]">
                  Protected: Private signing keys and Alpaca broker write credentials remain strictly isolated on the server.
                </p>
              </div>
            </div>
            <div className="mt-5 pt-3 border-t border-black/10 flex items-center justify-between text-xs font-mono text-[#5F5E56]">
              <span className="flex items-center gap-1.5 text-emerald-800 font-bold">
                <span className="inline-block w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
                Session Active
              </span>
              <span className="border border-black/15 bg-[#F0EFE3] px-2 py-0.5 text-[10px]">
                PAPER TRADING
              </span>
            </div>
          </div>

          <div className="border border-black/15 bg-[#EAEEDD] p-6 md:p-7">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="font-mono text-[10px] font-bold tracking-[0.12em] text-[#74736A]">01 / PREPARE A SINGLE ORDER</p>
                <h2 className="mt-2 text-xl font-semibold">Select an ETF market</h2>
              </div>
              <button onClick={() => void loadHistory()} className="inline-flex h-9 w-9 items-center justify-center border border-black/15 bg-white text-[#232323] hover:bg-[#F7F6EF]" aria-label="Refresh permit history">
                <RefreshCw className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-7 grid grid-cols-2 gap-3">
              <button
                onClick={() => setSymbol("SPY")}
                disabled={!isSpyAllowed}
                className={`h-20 border text-left px-4 transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                  symbol === "SPY"
                    ? "border-[#0B4FFF] bg-[#0B4FFF] text-white"
                    : "border-black/15 bg-white text-[#232323] hover:border-black/40"
                }`}
              >
                <span className="block font-mono text-[10px] opacity-70">
                  {isSpyAllowed ? "S&P 500 ETF" : "Not allowed by policy"}
                </span>
                <strong className="mt-1 block text-2xl">SPY</strong>
              </button>

              <button
                onClick={() => setSymbol("QQQ")}
                disabled={!isQqqAllowed}
                className={`h-20 border text-left px-4 transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                  symbol === "QQQ"
                    ? "border-[#0B4FFF] bg-[#0B4FFF] text-white"
                    : "border-black/15 bg-white text-[#232323] hover:border-black/40"
                }`}
              >
                <span className="block font-mono text-[10px] opacity-70">
                  {isQqqAllowed ? "NASDAQ-100 ETF" : "Not allowed by policy"}
                </span>
                <strong className="mt-1 block text-2xl">QQQ</strong>
              </button>
            </div>

            <button
              onClick={() => void prepare()}
              disabled={busy !== null}
              className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 border border-[#0B4FFF] bg-[#0B4FFF] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#093ED9] disabled:cursor-not-allowed disabled:opacity-45 cursor-pointer"
            >
              <RefreshCw className={`h-4 w-4 ${busy === "prepare" ? "animate-spin" : ""}`} />
              {busy === "prepare" ? "Reading market state..." : `Prepare ${symbol} trade`}
            </button>
          </div>
        </section>

        <section className="mt-6 grid gap-6 lg:grid-cols-[1.25fr_0.75fr]">
          <div className="border border-black/15 bg-white">
            <div className="flex items-center justify-between border-b border-black/15 bg-[#FAF9F5] px-6 py-4">
              <div>
                <p className="font-mono text-[10px] font-bold tracking-[0.12em] text-[#74736A]">02 / REVIEW AND SIGN</p>
                <h2 className="mt-1 text-lg font-semibold">Exact trade binding</h2>
              </div>
              {draft && <span className="border border-amber-800/25 bg-amber-50 px-2 py-1 font-mono text-[10px] font-bold text-amber-900">REVIEW REQUIRED</span>}
            </div>
            {draft ? (
              <TradeReview
                intent={draft.intent}
                policy={draft.policy.plainEnglishEcho}
                action={
                  <button
                    onClick={() => void sign()}
                    disabled={busy !== null}
                    className="inline-flex h-11 items-center justify-center gap-2 bg-[#0B4FFF] px-5 text-sm font-semibold text-white hover:bg-[#093ED9] disabled:opacity-50 cursor-pointer"
                  >
                    <FileKey2 className="h-4 w-4" />
                    {busy === "sign" ? "Signing..." : "Sign 60-second permit"}
                  </button>
                }
              />
            ) : active ? (
              <TradeReview intent={active.intent} policy="Signed permit binds the exact order shown here." action={null} />
            ) : (
              <div className="p-7 text-sm leading-relaxed text-[#74736A]">
                Prepare a trade to review its exact legs, limit-price band, maximum loss, and active policy before authority is issued.
              </div>
            )}
          </div>

          <div className={`border p-6 ${active ? (activeExpired ? "border-rose-800/35 bg-rose-50" : "border-[#0B4FFF] bg-[#0B4FFF] text-white") : "border-black/15 bg-[#232323] text-white"}`}>
            <p className="font-mono text-[10px] font-bold tracking-[0.12em] opacity-70">03 / EXECUTION WINDOW</p>
            {active ? (
              <>
                <div className="mt-5 flex items-end justify-between">
                  <div>
                    <p className="text-sm opacity-75">{activeExpired ? "Authority expired" : "Permit authority remains"}</p>
                    <div className="mt-1 font-mono text-6xl font-semibold tracking-tight">{countdown}</div>
                  </div>
                  <Clock3 className="mb-2 h-8 w-8 opacity-80" />
                </div>
                <p className="mt-6 border-t border-white/25 pt-5 font-mono text-xs leading-relaxed">
                  {short(active.permit.permitId)}<br />Expires {new Date(active.permit.expiresAt).toLocaleTimeString()}
                </p>
                <button
                  onClick={() => void execute()}
                  disabled={activeExpired || busy !== null}
                  className="mt-6 inline-flex h-11 w-full items-center justify-center gap-2 border border-white/70 bg-white px-4 text-sm font-semibold text-[#0B4FFF] transition-colors hover:bg-[#F0EFE3] disabled:cursor-not-allowed disabled:opacity-45 cursor-pointer"
                >
                  <Play className="h-4 w-4 fill-current" />
                  {busy === "execute" ? "Submitting to paper..." : activeExpired ? "Permit expired" : "Execute exact paper order"}
                </button>
              </>
            ) : (
              <div className="mt-10">
                <div className="font-mono text-6xl font-semibold tracking-tight opacity-25">00:60</div>
                <p className="mt-7 max-w-xs text-sm leading-relaxed text-white/65">
                  The countdown begins only after the server signs a permit and persists its nonce.
                </p>
              </div>
            )}
          </div>
        </section>

        <section className="mt-10 border border-black/15 bg-white">
          <div className="flex flex-col gap-4 border-b border-black/15 px-6 py-5 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="font-mono text-[10px] font-bold tracking-[0.12em] text-[#74736A]">PERMIT HISTORY</p>
              <h2 className="mt-1 text-xl font-semibold">Every authority issued</h2>
            </div>
            <div className="flex flex-wrap gap-2">
              {(["ALL", "SIGNED", "USED", "EXPIRED"] as const).map((value) => (
                <button
                  key={value}
                  onClick={() => setFilter(value)}
                  className={`h-8 border px-3 font-mono text-[10px] font-bold ${
                    filter === value ? "border-[#0B4FFF] bg-[#0B4FFF] text-white" : "border-black/15 bg-white text-[#5F5E56] hover:border-black/40"
                  }`}
                >
                  {value}
                </button>
              ))}
            </div>
          </div>
          {storageMessage ? (
            <div className="m-6 border border-amber-800/30 bg-amber-50 p-4 text-sm text-amber-900">
              <strong>Persistent history is not ready.</strong>
              <p className="mt-1">{storageMessage}</p>
              <p className="mt-2 font-mono text-xs">Run `npx drizzle-kit migrate` after setting DATABASE_URL.</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="px-6 py-12 text-sm text-[#74736A]">
              No permits match this view. A signed permit will appear here immediately and remains visible after its 60-second window closes.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[780px] text-left">
                <thead className="bg-[#FAF9F5] font-mono text-[10px] font-bold tracking-[0.1em] text-[#74736A]">
                  <tr>
                    <th className="px-6 py-3">STATUS</th>
                    <th className="px-4 py-3">TRADE</th>
                    <th className="px-4 py-3">MAX LOSS</th>
                    <th className="px-4 py-3">ISSUED</th>
                    <th className="px-4 py-3">EXECUTION</th>
                    <th className="px-6 py-3 text-right">DETAIL</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((permit) => (
                    <tr key={permit.permitId} className="border-t border-black/10 text-sm hover:bg-[#FAF9F5]">
                      <td className="px-6 py-4">
                        <span className={`border px-2 py-1 font-mono text-[10px] font-bold ${statusClass(permit.lifecycle)}`}>
                          {permit.lifecycle}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <strong>{permit.symbol} {permit.structure.replaceAll("_", " ")}</strong>
                        <span className="ml-2 font-mono text-xs text-[#74736A]">{permit.quantity}x</span>
                      </td>
                      <td className="px-4 py-4 font-mono">${permit.maxLoss}</td>
                      <td className="px-4 py-4 text-[#67665F]">{new Date(permit.createdAt).toLocaleTimeString()}</td>
                      <td className="px-4 py-4">
                        <span className={`border px-2 py-1 font-mono text-[10px] font-bold ${statusClass(permit.execution)}`}>
                          {permit.execution}
                        </span>
                        {permit.orderId && <div className="mt-1 font-mono text-[10px] text-[#74736A]">{short(permit.orderId, 7)}</div>}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => void openDetail(permit.permitId)}
                          className="inline-flex h-8 w-8 items-center justify-center border border-black/15 hover:border-[#0B4FFF] hover:text-[#0B4FFF]"
                          aria-label={`Open permit ${permit.permitId}`}
                        >
                          <ChevronRight className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="mt-10 grid gap-6 md:grid-cols-3">
          <Info icon={<FileKey2 className="h-5 w-5" />} title="Bound" text="The permit signs exact legs, quantity, price band, snapshots, and policy version." />
          <Info icon={<Clock3 className="h-5 w-5" />} title="Short-lived" text="The server rejects a permit at the 60-second expiry boundary, regardless of browser state." />
          <Info icon={<ShieldCheck className="h-5 w-5" />} title="Single-use" text="Nonce consumption occurs immediately before the only broker write path." />
        </section>
      </div>

      {detail && (
        <div className="fixed inset-0 z-[60] flex justify-end bg-black/35" role="dialog" aria-modal="true" aria-label="Permit details">
          <div className="h-full w-full max-w-xl overflow-y-auto bg-[#F0EFE3] p-6 shadow-2xl md:p-8">
            <div className="flex items-start justify-between gap-6 border-b border-black/15 pb-5">
              <div>
                <p className="font-mono text-[10px] font-bold tracking-[0.12em] text-[#74736A]">PERMIT DETAIL</p>
                <h2 className="mt-1 text-2xl font-semibold">{detail.symbol} {detail.structure.replaceAll("_", " ")}</h2>
              </div>
              <button className="inline-flex h-9 w-9 items-center justify-center border border-black/15 bg-white" onClick={() => setDetail(null)} aria-label="Close details">
                <XCircle className="h-5 w-5" />
              </button>
            </div>
            <div className="mt-6 grid gap-4 text-sm">
              <DetailRow label="Lifecycle" value={detail.lifecycle} />
              <DetailRow label="Execution" value={detail.execution} />
              <DetailRow label="Permit ID" value={detail.permitId} mono />
              <DetailRow label="Order ID" value={detail.orderId ?? "Not submitted"} mono />
              <DetailRow label="Policy hash" value={detail.permit.policyHash} mono />
              <DetailRow label="Market hash" value={detail.intent.marketSnapshotHash} mono />
              <DetailRow label="Account hash" value={detail.intent.accountSnapshotHash} mono />
              <DetailRow label="Signing key" value={detail.permit.signingKeyId} mono />
              <DetailRow label="Signature" value={detail.permit.signature} mono />
              <DetailRow label="Broker result" value={detail.rejectionReason ?? "No rejection recorded"} />
            </div>
          </div>
        </div>
      )}

      {/* Floating Small Toast Stack in Top-Left Corner */}
      <div className="fixed top-5 left-5 z-[100] flex flex-col gap-2 max-w-xs w-full pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto shadow-xl border p-2.5 flex items-start justify-between gap-2.5 transition-all duration-300 font-mono text-[11px] ${
              t.tone === "success"
                ? "bg-[#142A20] text-emerald-100 border-emerald-500/40"
                : t.tone === "error"
                ? "bg-[#331111] text-rose-100 border-rose-500/40"
                : "bg-[#232323] text-white border-black/20"
            }`}
          >
            <div className="flex items-start gap-2">
              {t.tone === "success" && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />}
              {t.tone === "error" && <CircleAlert className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />}
              <div>
                <div className="font-bold text-[11px] uppercase tracking-wider">{t.title}</div>
                <div className="mt-0.5 text-[10px] opacity-90 leading-tight break-words">{t.message}</div>
              </div>
            </div>
            <button
              onClick={() => setToasts((prev) => prev.filter((item) => item.id !== t.id))}
              className="text-white/60 hover:text-white shrink-0 ml-1.5"
              aria-label="Dismiss toast"
            >
              <XCircle className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function TradeReview({ intent, policy, action }: { intent: Intent; policy: string; action: React.ReactNode }) {
  return (
    <div className="p-6">
      <div className="grid gap-5 border-b border-black/10 pb-6 md:grid-cols-3">
        <div>
          <p className="font-mono text-[10px] font-bold text-[#74736A]">STRUCTURE</p>
          <p className="mt-1 text-lg font-semibold">{intent.structure.replaceAll("_", " ")}</p>
        </div>
        <div>
          <p className="font-mono text-[10px] font-bold text-[#74736A]">LIMIT BAND</p>
          <p className="mt-1 font-mono text-lg font-semibold">${intent.limitPriceBand.min} - ${intent.limitPriceBand.max}</p>
        </div>
        <div>
          <p className="font-mono text-[10px] font-bold text-[#74736A]">MAX LOSS</p>
          <p className="mt-1 font-mono text-lg font-semibold">${intent.standaloneMaxLoss}</p>
        </div>
      </div>
      <div className="mt-5 grid gap-2">
        {intent.legs.map((leg) => (
          <div key={`${leg.symbol}-${leg.side}`} className="grid grid-cols-[70px_1fr] gap-4 border border-black/10 bg-[#FAF9F5] p-3 font-mono text-xs">
            <span className={leg.side === "buy" ? "font-bold text-emerald-800" : "font-bold text-rose-800"}>
              {leg.side.toUpperCase()} {leg.ratioQty}x
            </span>
            <span className="overflow-hidden text-ellipsis whitespace-nowrap text-[#4F4E48]">{leg.symbol}</span>
          </div>
        ))}
      </div>
      <div className="mt-5 border-l-2 border-[#0B4FFF] bg-[#F5F7FF] px-4 py-3 text-sm leading-relaxed text-[#51515A]">
        {intent.thesis}
      </div>
      <p className="mt-4 text-xs leading-relaxed text-[#74736A]">{policy}</p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

function Info({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return (
    <div className="border border-black/15 bg-[#EAEEDD] p-5">
      <div className="text-[#0B4FFF]">{icon}</div>
      <h3 className="mt-4 text-base font-semibold">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-[#67665F]">{text}</p>
    </div>
  );
}

function DetailRow({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="border-b border-black/10 pb-3">
      <p className="font-mono text-[10px] font-bold tracking-[0.1em] text-[#74736A]">{label}</p>
      <p className={`mt-1 break-all text-[#232323] ${mono ? "font-mono text-xs" : ""}`}>{value}</p>
    </div>
  );
}
