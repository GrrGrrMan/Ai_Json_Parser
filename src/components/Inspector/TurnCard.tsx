import React, { useState } from "react";
import { Eye, EyeOff, Trash2, Brain, Terminal, Edit3, Copy, Check } from "lucide-react";
import { ConversationTurn } from "../../core/types";
import { useWorkspaceStore } from "../../store/useWorkspaceStore";
import { estimateTokens } from "../../core/tokenizer";

interface TurnCardProps {
  turn: ConversationTurn;
  docId: string;
  isOutsideWindow?: boolean;
}

export const TurnCard: React.FC<TurnCardProps> = ({ turn, docId, isOutsideWindow = false }) => {
  const {
    config,
    toggleTurnExcluded,
    updateTurnText,
    deleteTurn,
    deleteTurnThought,
    deleteTurnCodeExec,
  } = useWorkspaceStore();

  const [isEditing, setIsEditing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [editText, setEditText] = useState(
    turn.customText !== undefined ? turn.customText : turn.rawText
  );

  const displayText = turn.customText !== undefined ? turn.customText : turn.rawText;

  const handleCopyTurn = async () => {
    await navigator.clipboard.writeText(displayText);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  // Evaluate impacts of global settings on this specific card
  const isThoughtOmitted = turn.isThought && config.thoughtMode === "omit";
  const isContentOmitted = !turn.isThought && config.thoughtMode === "only";
  const isCodeStripped = Boolean(turn.codeExecution && config.codeExecMode === "strip-all");
  const isOutputStripped = Boolean(turn.codeExecution && config.codeExecMode === "strip-output");

  const isEffectivelyOmitted =
    turn.excluded || isOutsideWindow || isThoughtOmitted || isContentOmitted;

  // Calculate live effective tokens based on active settings
  let effectiveText = isEffectivelyOmitted ? "" : displayText;
  if (!isEffectivelyOmitted && turn.codeExecution && !isCodeStripped) {
    if (turn.codeExecution.code) effectiveText += turn.codeExecution.code;
    if (turn.codeExecution.output && !isOutputStripped) effectiveText += turn.codeExecution.output;
  }
  const tokenEst = estimateTokens(effectiveText);

  return (
    <div
      className={`border rounded-xl p-3.5 transition-all ${
        isEffectivelyOmitted
          ? "border-zinc-800/80 bg-zinc-900/20 opacity-50"
          : "border-app-border bg-app-card hover:border-zinc-700"
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className={`px-2 py-0.5 rounded text-[11px] font-semibold uppercase tracking-wider ${
              turn.role === "user"
                ? "bg-sky-500/10 text-sky-400 border border-sky-500/20"
                : "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20"
            }`}
          >
            Turn {turn.turnNumber}: {turn.role}
          </span>
          <span className={`text-[11px] font-mono ${isEffectivelyOmitted ? "line-through text-zinc-600" : "text-zinc-400"}`}>
            ~{tokenEst} tokens
          </span>
          {isOutsideWindow && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-500 border border-zinc-700/50">
              Outside Last {config.sliceLastNTurns} Window
            </span>
          )}
          {isThoughtOmitted && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-500/70 border border-amber-500/20">
              Thought Omitted by Preset
            </span>
          )}
          {isContentOmitted && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-500">
              Omitted (Thoughts Only Mode)
            </span>
          )}
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={handleCopyTurn}
            className="p-1 rounded text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
            title="Copy turn content"
          >
            {copied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
          </button>
          <button
            onClick={() => setIsEditing(!isEditing)}
            className="p-1 rounded text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
            title="Inline edit text"
          >
            <Edit3 size={13} />
          </button>
          <button
            onClick={() => toggleTurnExcluded(docId, turn.id)}
            className="p-1 rounded text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
            title={turn.excluded ? "Include in export" : "Exclude from export"}
          >
            {turn.excluded ? <EyeOff size={13} className="text-zinc-500" /> : <Eye size={13} />}
          </button>
          <button
            onClick={() => deleteTurn(docId, turn.id)}
            className="p-1 rounded text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
            title="Delete turn entirely"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      {/* Thought Process Tray */}
      {turn.isThought && (
        <div className="mb-2 bg-amber-500/5 border border-amber-500/20 rounded-md p-2 text-xs flex items-start justify-between gap-2">
          <div className="flex items-center gap-1.5 text-amber-400 font-medium">
            <Brain size={13} />
            <span>Reasoning / Thinking Trace</span>
          </div>
          <button
            onClick={() => deleteTurnThought(docId, turn.id)}
            className="text-zinc-500 hover:text-rose-400"
            title="Strip thought process"
          >
            <Trash2 size={12} />
          </button>
        </div>
      )}

      {/* Python Code Execution Tray */}
      {turn.codeExecution && (
        <div className={`mb-2 rounded-md p-2 text-xs flex items-center justify-between border ${
          isCodeStripped
            ? "bg-zinc-800/20 border-zinc-700/30 text-zinc-500"
            : "bg-emerald-500/5 border-emerald-500/20 text-emerald-400"
        }`}>
          <div className="flex items-center gap-1.5 font-medium">
            <Terminal size={13} />
            <span>
              {isCodeStripped
                ? "Code Execution Stripped by Settings"
                : isOutputStripped
                ? "Python Code Kept (Output Logs Stripped)"
                : "Python Execution & Output Logs Included"}
            </span>
          </div>
          <button
            onClick={() => deleteTurnCodeExec(docId, turn.id)}
            className="text-zinc-500 hover:text-rose-400"
            title="Permanently remove code execution data"
          >
            <Trash2 size={12} />
          </button>
        </div>
      )}

      {/* Message Content Area */}
      {isEditing ? (
        <div className="space-y-2 mt-2">
          <textarea
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            className="w-full bg-app-input border border-app-border rounded-md p-2 text-xs font-mono text-zinc-200 outline-none focus:border-indigo-500 h-28"
          />
          <div className="flex justify-end gap-2">
            <button
              onClick={() => {
                setEditText(displayText);
                setIsEditing(false);
              }}
              className="px-2 py-1 text-[11px] rounded bg-zinc-800 text-zinc-400 hover:text-zinc-200"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                updateTurnText(docId, turn.id, editText);
                setIsEditing(false);
              }}
              className="px-2 py-1 text-[11px] rounded bg-indigo-600 text-white hover:bg-indigo-500"
            >
              Save Edit
            </button>
          </div>
        </div>
      ) : (
        <div className="text-xs text-zinc-300 font-mono whitespace-pre-wrap max-h-48 overflow-y-auto leading-relaxed">
          {displayText}
        </div>
      )}
    </div>
  );
};