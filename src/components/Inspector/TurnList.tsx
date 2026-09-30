import React from "react";
import { useWorkspaceStore } from "../../store/useWorkspaceStore";
import { TurnCard } from "./TurnCard";
import { compileDocument } from "../../core/formatter";
import { calculateMetrics } from "../../core/tokenizer";

export const TurnList: React.FC = () => {
  const { documents, activeDocId, config, updateDocTitle } = useWorkspaceStore();

  const activeDoc = documents.find((d) => d.id === activeDocId);
  if (!activeDoc) return null;

  const compiled = compileDocument(activeDoc, config);
  const metrics = calculateMetrics(activeDoc, compiled);

  return (
    <div className="flex flex-col h-full space-y-4">
      {/* Title & Metrics Bar */}
      <div className="bg-app-panel border border-app-border rounded-xl p-4 flex items-center justify-between flex-wrap gap-3">
        <div className="flex-1 min-w-[200px]">
          <input
            type="text"
            value={activeDoc.title}
            onChange={(e) => updateDocTitle(activeDoc.id, e.target.value)}
            className="text-base font-semibold text-zinc-100 bg-transparent border-b border-transparent hover:border-zinc-700 focus:border-indigo-500 outline-none w-full pb-0.5"
            placeholder="Document title..."
          />
          <div className="text-xs text-zinc-500 font-mono mt-0.5">
            Original: {activeDoc.originalFileName}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-xs text-zinc-400 uppercase font-semibold">Active Tokens</div>
            <div className="text-sm font-mono font-bold text-zinc-200">
              {metrics.exportedTokensEst.toLocaleString()}
            </div>
          </div>
          <div className="text-right pl-3 border-l border-app-border">
            <div className="text-xs text-zinc-400 uppercase font-semibold">Context Savings</div>
            <div className="text-sm font-mono font-bold text-emerald-400">
              {metrics.tokensSavedPercent}%
            </div>
          </div>
        </div>
      </div>

      {/* Virtualized/Scrollable Turn List */}
      <div className="space-y-3 overflow-y-auto flex-1 pr-1">
        {activeDoc.turns.map((turn) => (
          <TurnCard key={turn.id} turn={turn} docId={activeDoc.id} />
        ))}
      </div>
    </div>
  );
};