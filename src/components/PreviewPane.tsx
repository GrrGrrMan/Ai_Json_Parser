import React, { useState } from "react";
import { Copy, Download, Check } from "lucide-react";
import { useWorkspaceStore } from "../store/useWorkspaceStore";
import { compileDocument } from "../core/formatter";

export const PreviewPane: React.FC = () => {
  const { documents, activeDocId, config, activeTab, setActiveTab } = useWorkspaceStore();
  const [copied, setCopied] = useState(false);

  const activeDoc = documents.find((d) => d.id === activeDocId);
  if (!activeDoc) return null;

  const compiled = compileDocument(activeDoc, config);
  const ext = config.format === "markdown" ? ".md" : config.format === "xml" ? ".xml" : ".txt";

  const handleCopy = async () => {
    await navigator.clipboard.writeText(compiled);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleDownload = () => {
    const blob = new Blob([compiled], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${activeDoc.title}${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-app-panel border border-app-border rounded-xl flex flex-col h-full overflow-hidden">
      <div className="px-4 py-2.5 border-b border-app-border flex items-center justify-between bg-zinc-900/50">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab("editor")}
            className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
              activeTab === "editor" ? "bg-zinc-800 text-zinc-100" : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            Turn Pruner
          </button>
          <button
            onClick={() => setActiveTab("preview")}
            className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
              activeTab === "preview" ? "bg-zinc-800 text-zinc-100" : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            Compiled Output ({ext})
          </button>
          <button
            onClick={() => setActiveTab("raw")}
            className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
              activeTab === "raw" ? "bg-zinc-800 text-zinc-100" : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            Raw JSON
          </button>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={handleCopy}
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 transition-colors"
          >
            {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
            <span>{copied ? "Copied" : "Copy"}</span>
          </button>
          <button
            onClick={handleDownload}
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded bg-indigo-600 hover:bg-indigo-500 text-white transition-colors"
          >
            <Download size={12} />
            <span>Download</span>
          </button>
        </div>
      </div>

      <div className="p-4 flex-1 overflow-auto">
        <pre className="text-xs font-mono text-zinc-300 whitespace-pre-wrap leading-relaxed">
          {activeTab === "raw" ? activeDoc.rawJsonString : compiled}
        </pre>
      </div>
    </div>
  );
};