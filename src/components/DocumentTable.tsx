import React from "react";
import { CheckSquare, Square, Trash2, Download } from "lucide-react";
import { useWorkspaceStore } from "../store/useWorkspaceStore";
import { compileDocument } from "../core/formatter";
import { estimateTokens } from "../core/tokenizer";

export const DocumentTable: React.FC = () => {
  const {
    documents,
    selectedDocIds,
    activeDocId,
    config,
    toggleSelectDoc,
    selectAllDocs,
    setActiveDocId,
    removeDocument,
    removeSelectedDocuments,
  } = useWorkspaceStore();

  if (documents.length === 0) return null;

  const allSelected = documents.length > 0 && selectedDocIds.length === documents.length;

  return (
    <div className="bg-app-panel border border-app-border rounded-xl overflow-hidden flex flex-col">
      <div className="px-4 py-2.5 border-b border-app-border bg-zinc-900/50 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => selectAllDocs(!allSelected)}
            className="text-zinc-400 hover:text-zinc-200 flex items-center gap-1.5 text-xs font-medium"
          >
            {allSelected ? <CheckSquare size={15} className="text-indigo-400" /> : <Square size={15} />}
            <span>Select All ({documents.length})</span>
          </button>
          {selectedDocIds.length > 0 && (
            <button
              onClick={removeSelectedDocuments}
              className="text-rose-400 hover:text-rose-300 flex items-center gap-1 text-xs font-medium ml-2"
            >
              <Trash2 size={13} />
              <span>Delete Selected ({selectedDocIds.length})</span>
            </button>
          )}
        </div>
      </div>

      <div className="overflow-x-auto max-h-60 overflow-y-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-zinc-900/40 text-zinc-400 text-[11px] uppercase tracking-wider sticky top-0 border-b border-app-border">
            <tr>
              <th className="py-2 px-3 w-8"></th>
              <th className="py-2 px-3">Document Title</th>
              <th className="py-2 px-3">Turns</th>
              <th className="py-2 px-3">Est. Tokens</th>
              <th className="py-2 px-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-app-border">
            {documents.map((doc) => {
              const isSelected = selectedDocIds.includes(doc.id);
              const isActive = activeDocId === doc.id;
              const compiled = compileDocument(doc, config);
              const tokens = estimateTokens(compiled);

              return (
                <tr
                  key={doc.id}
                  onClick={() => setActiveDocId(doc.id)}
                  className={`cursor-pointer transition-colors ${
                    isActive ? "bg-indigo-500/10" : "hover:bg-zinc-800/40"
                  }`}
                >
                  <td className="py-2 px-3" onClick={(e) => e.stopPropagation()}>
                    <button onClick={() => toggleSelectDoc(doc.id)} className="text-zinc-400 hover:text-zinc-200">
                      {isSelected ? <CheckSquare size={14} className="text-indigo-400" /> : <Square size={14} />}
                    </button>
                  </td>
                  <td className="py-2 px-3 font-mono text-zinc-200">
                    {doc.title}
                  </td>
                  <td className="py-2 px-3 text-zinc-400">{doc.turns.filter((t) => !t.excluded).length} / {doc.turns.length}</td>
                  <td className="py-2 px-3 font-mono text-zinc-400">{tokens.toLocaleString()}</td>
                  <td className="py-2 px-3 text-right space-x-1.5" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => {
                        const blob = new Blob([compiled], { type: "text/plain;charset=utf-8" });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement("a");
                        const ext = config.format === "markdown" ? ".md" : config.format === "xml" ? ".xml" : ".txt";
                        a.href = url;
                        a.download = `${doc.title}${ext}`;
                        a.click();
                        URL.revokeObjectURL(url);
                      }}
                      className="p-1 rounded hover:bg-zinc-700 text-zinc-300 transition-colors"
                      title="Download document"
                    >
                      <Download size={13} />
                    </button>
                    <button
                      onClick={() => removeDocument(doc.id)}
                      className="p-1 rounded hover:bg-rose-500/20 text-rose-400 transition-colors"
                      title="Delete document"
                    >
                      <Trash2 size={13} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};