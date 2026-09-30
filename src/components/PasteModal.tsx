import React, { useState } from "react";
import { X } from "lucide-react";
import { useWorkspaceStore } from "../store/useWorkspaceStore";
import { parseAiStudioJson } from "../core/parser";

export const PasteModal: React.FC = () => {
  const { isPasteModalOpen, setPasteModalOpen, addDocuments } = useWorkspaceStore();
  const [text, setText] = useState("");

  if (!isPasteModalOpen) return null;

  const handleParse = () => {
    if (!text.trim()) return;
    try {
      const filename = `pasted_chat_${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")}.json`;
      const doc = parseAiStudioJson(text, filename);
      addDocuments([doc]);
      setText("");
      setPasteModalOpen(false);
    } catch (err) {
      alert(`Invalid JSON: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-app-panel border border-app-border-medium rounded-xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl">
        <div className="px-4 py-3 border-b border-app-border flex items-center justify-between">
          <h3 className="text-sm font-semibold text-zinc-200">Paste AI Studio Export JSON</h3>
          <button
            onClick={() => setPasteModalOpen(false)}
            className="text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            <X size={16} />
          </button>
        </div>
        <div className="p-4 flex-1 overflow-hidden flex flex-col">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder='Paste Google AI Studio JSON payload here (must include "chunkedPrompt.chunks")...'
            spellCheck={false}
            className="w-full flex-1 min-h-[300px] bg-app-input border border-app-border rounded-lg p-3 text-xs font-mono text-zinc-200 outline-none focus:border-indigo-500 resize-none"
          />
        </div>
        <div className="px-4 py-3 border-t border-app-border flex justify-end gap-2">
          <button
            onClick={() => setPasteModalOpen(false)}
            className="px-3 py-1.5 text-xs font-medium rounded-md bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleParse}
            disabled={!text.trim()}
            className="px-3 py-1.5 text-xs font-medium rounded-md bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white transition-colors"
          >
            Parse Payload
          </button>
        </div>
      </div>
    </div>
  );
};