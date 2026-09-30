import React from "react";
import { MessageSquareText, Download, SlidersHorizontal } from "lucide-react";
import { useWorkspaceStore } from "../store/useWorkspaceStore";
import { zipSync, strToU8 } from "fflate";
import { compileDocument } from "../core/formatter";

interface HeaderProps {
  onOpenSettings?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenSettings }) => {
  const { documents, selectedDocIds, config } = useWorkspaceStore();

  const handleDownloadSelectedZip = () => {
    const selectedDocs = documents.filter((d) => selectedDocIds.includes(d.id));
    if (selectedDocs.length === 0) return;

    const files: Record<string, Uint8Array> = {};
    const ext = config.format === "markdown" ? ".md" : config.format === "xml" ? ".xml" : ".txt";

    selectedDocs.forEach((doc) => {
      const compiled = compileDocument(doc, config);
      const filename = `${doc.title}${ext}`;
      files[filename] = strToU8(compiled);
    });

    const zipped = zipSync(files, { level: 6 });
    const blob = new Blob([zipped], { type: "application/zip" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ai_studio_export_${new Date().toISOString().slice(0, 10)}.zip`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <header className="border-b border-app-border bg-app-panel/90 backdrop-blur sticky top-0 z-30 px-5 py-3 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-md bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center">
          <MessageSquareText size={18} />
        </div>
        <div>
          <h1 className="text-sm font-semibold tracking-tight text-zinc-100">
            AI Studio Chat Exporter
          </h1>
          <p className="text-xs text-zinc-400 hidden sm:block">
            Turn raw JSON logs into Obsidian vaults, LLM context, or clean prose
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {onOpenSettings && (
          <button
            onClick={onOpenSettings}
            className="lg:hidden flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-md bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700/50 transition-colors"
            title="Open export settings"
          >
            <SlidersHorizontal size={14} />
            <span className="hidden sm:inline">Settings</span>
          </button>
        )}
        {selectedDocIds.length > 0 && (
          <button
            onClick={handleDownloadSelectedZip}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-indigo-600 hover:bg-indigo-500 text-white transition-colors"
          >
            <Download size={14} />
            <span>Export Selected ({selectedDocIds.length})</span>
          </button>
        )}
        <a
          href="https://github.com/GrrGrrMan/Ai_Json_Parser"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700/50 transition-colors"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
          </svg>
          <span>GitHub</span>
        </a>
      </div>
    </header>
  );
};