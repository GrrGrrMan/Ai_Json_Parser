// src/components/ToastContainer.tsx
import React from "react";
import { AlertTriangle, X } from "lucide-react";
import { useWorkspaceStore } from "../store/useWorkspaceStore";

export const ToastContainer: React.FC = () => {
  const { ingestionWarnings, clearIngestionWarnings } = useWorkspaceStore();

  if (ingestionWarnings.length === 0) return null;

  return (
    <div className="fixed bottom-16 lg:bottom-5 right-3 lg:right-5 z-50 max-w-sm w-full bg-zinc-900 border border-amber-500/40 rounded-xl p-3 shadow-xl">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 text-amber-400 text-xs font-semibold">
          <AlertTriangle size={15} />
          <span>{ingestionWarnings.length} File(s) Skipped</span>
        </div>
        <button 
          onClick={clearIngestionWarnings}
          className="text-zinc-400 hover:text-zinc-200 p-1"
        >
          <X size={14} />
        </button>
      </div>

      <div className="mt-2 max-h-36 overflow-y-auto space-y-1.5 text-[11px] text-zinc-300">
        {ingestionWarnings.map((w, i) => (
          <div key={i} className="border-b border-zinc-800/80 pb-1">
            <span className="font-mono text-zinc-200">{w.fileName}</span>:{" "}
            <span className="text-zinc-400">{w.reason}</span>
          </div>
        ))}
      </div>
    </div>
  );
};