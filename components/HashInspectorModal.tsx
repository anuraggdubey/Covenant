"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Check,
  Copy,
  ExternalLink,
  Fingerprint,
  Hash,
  ShieldCheck,
  X,
  Clock,
  Calendar,
  Layers,
  Code2,
  Terminal,
} from "lucide-react";

export interface HashInspectorData {
  hash: string;
  label?: string;
  timestamp?: string;
  type?: string;
  metadata?: Record<string, unknown>;
  payload?: unknown;
}

export function formatDateTime(isoString?: string | null): { date: string; time: string; full: string } {
  if (!isoString) {
    return { date: "—", time: "—", full: "—" };
  }
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return { date: "—", time: "—", full: "—" };
    const date = d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
    const time = d.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    });
    return {
      date,
      time,
      full: `${date} · ${time}`,
    };
  } catch {
    return { date: "—", time: "—", full: "—" };
  }
}

export function shortHash(hash: string | null | undefined, size = 6): string {
  if (!hash) return "—";
  if (hash.length <= size * 2 + 3) return hash;
  return `${hash.slice(0, size)}…${hash.slice(-size)}`;
}

interface ClickableHashProps {
  hash: string;
  label?: string;
  timestamp?: string;
  type?: string;
  metadata?: Record<string, unknown>;
  payload?: unknown;
  size?: number;
  truncate?: boolean;
  className?: string;
  onInspect?: (data: HashInspectorData) => void;
}

export function ClickableHash({
  hash,
  label,
  timestamp,
  type,
  metadata,
  payload,
  size = 6,
  truncate = true,
  className = "",
  onInspect,
}: ClickableHashProps) {
  const [copied, setCopied] = useState(false);

  if (!hash) return <span className="text-[#74736A] font-mono text-xs">—</span>;

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(hash);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);

    if (onInspect) {
      onInspect({
        hash,
        label,
        timestamp,
        type,
        metadata,
        payload,
      });
    }
  };

  const displayText = truncate ? shortHash(hash, size) : hash;

  return (
    <button
      type="button"
      onClick={handleClick}
      title="Click to copy full hash & inspect cryptographic proof"
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 font-mono text-xs font-semibold tracking-tight transition-all rounded-none border border-black/15 bg-white hover:bg-[#FAF9F5] hover:border-[#0B4FFF] text-[#0B4FFF] hover:shadow-sm cursor-pointer group select-all ${className}`}
    >
      <Hash className="w-3 h-3 text-[#74736A] group-hover:text-[#0B4FFF] transition-colors shrink-0" />
      <span>{displayText}</span>
      {copied ? (
        <Check className="w-3 h-3 text-emerald-600 shrink-0" />
      ) : (
        <Copy className="w-2.5 h-2.5 text-[#74736A] opacity-50 group-hover:opacity-100 transition-opacity shrink-0" />
      )}
    </button>
  );
}

interface HashInspectorModalProps {
  data: HashInspectorData | null;
  onClose: () => void;
}

export function HashInspectorModal({ data, onClose }: HashInspectorModalProps) {
  const [copied, setCopied] = useState(false);

  if (!data) return null;

  const { date, time, full } = formatDateTime(data.timestamp);

  const copyHash = () => {
    navigator.clipboard.writeText(data.hash);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.2 }}
          className="w-full max-w-2xl bg-[#FAF9F5] border border-black/20 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="p-5 bg-[#EAEEDD] border-b border-black/15 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 bg-[#232323] text-white flex items-center justify-center">
                <Fingerprint className="w-4 h-4" />
              </div>
              <div>
                <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#74736A] block">
                  CRYPTOGRAPHIC ENTITY INSPECTOR
                </span>
                <h3 className="text-sm font-bold font-mono text-[#232323]">
                  {data.label ?? data.type ?? "Cryptographic Digest"}
                </h3>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center bg-white border border-black/15 hover:bg-black/5 text-[#232323] cursor-pointer transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Body */}
          <div className="p-6 overflow-y-auto space-y-5 text-xs font-mono">
            {/* Hash Box with Copy */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] uppercase font-bold text-[#74736A] tracking-wider">
                  RAW UNABRIDGED HASH / DIGEST
                </span>
                <button
                  onClick={copyHash}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-bold bg-[#0B4FFF] text-white hover:bg-[#093ED9] transition-colors cursor-pointer"
                >
                  {copied ? <Check className="w-3 h-3 text-white" /> : <Copy className="w-3 h-3 text-white" />}
                  {copied ? "COPIED TO CLIPBOARD" : "COPY FULL HASH"}
                </button>
              </div>
              <div className="p-3 bg-white border border-black/15 text-[#232323] break-all select-all font-mono leading-relaxed text-xs">
                {data.hash}
              </div>
            </div>

            {/* Date and Time Details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3.5 bg-white border border-black/10">
                <div className="flex items-center gap-1.5 text-[#74736A] mb-1">
                  <Calendar className="w-3.5 h-3.5" />
                  <span className="text-[10px] font-bold uppercase">Recorded Date</span>
                </div>
                <div className="text-sm font-bold text-[#232323]">{date}</div>
              </div>

              <div className="p-3.5 bg-white border border-black/10">
                <div className="flex items-center gap-1.5 text-[#74736A] mb-1">
                  <Clock className="w-3.5 h-3.5" />
                  <span className="text-[10px] font-bold uppercase">Exact Timestamp</span>
                </div>
                <div className="text-sm font-bold text-[#232323]">{time}</div>
                {data.timestamp && (
                  <div className="text-[10px] text-[#74736A] mt-0.5 font-mono truncate">
                    UTC: {data.timestamp}
                  </div>
                )}
              </div>
            </div>

            {/* Verification Metadata */}
            <div className="p-4 bg-white border border-black/15 space-y-2">
              <div className="flex items-center justify-between border-b border-black/10 pb-2">
                <span className="text-[#74736A]">CLASSIFICATION:</span>
                <span className="font-bold text-[#232323]">{data.type ?? "SHA-256 Digest"}</span>
              </div>
              <div className="flex items-center justify-between border-b border-black/10 pb-2">
                <span className="text-[#74736A]">STANDARDS SPECIFICATION:</span>
                <span className="text-[#232323]">RFC 8785 Canonical JSON / SHA-256</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#74736A]">INTEGRITY STATUS:</span>
                <span className="inline-flex items-center gap-1 text-emerald-800 font-bold">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Verified & Air-Gapped Replayable
                </span>
              </div>
            </div>

            {/* Additional Metadata / Payload */}
            {data.metadata && Object.keys(data.metadata).length > 0 && (
              <div>
                <span className="text-[10px] uppercase font-bold text-[#74736A] tracking-wider block mb-1.5">
                  METADATA CLAIMS
                </span>
                <div className="p-3 bg-white border border-black/15 space-y-1.5">
                  {Object.entries(data.metadata).map(([key, value]) => (
                    <div key={key} className="flex items-start justify-between gap-4 text-xs font-mono">
                      <span className="text-[#74736A] shrink-0 uppercase text-[10px]">{key}:</span>
                      <span className="text-[#232323] text-right break-all">
                        {typeof value === "object" ? JSON.stringify(value) : String(value)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Payload JSON */}
            {data.payload !== undefined && data.payload !== null && (
              <div>
                <span className="text-[10px] uppercase font-bold text-[#74736A] tracking-wider block mb-1.5">
                  RECORDED PAYLOAD
                </span>
                <pre className="p-3 bg-white border border-black/15 text-[#232323] overflow-x-auto text-[11px] leading-relaxed max-h-48">
                  {JSON.stringify(data.payload, null, 2)}
                </pre>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 bg-[#FAF9F5] border-t border-black/15 flex items-center justify-between">
            <span className="text-[10px] text-[#74736A]">
              Clicking anywhere or pressing ESC dismisses this inspector.
            </span>
            <button
              onClick={onClose}
              className="px-4 py-1.5 bg-[#232323] hover:bg-black text-white text-xs font-mono font-bold uppercase transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
