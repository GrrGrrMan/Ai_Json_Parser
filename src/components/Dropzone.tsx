import React, { useRef } from "react";
import { Upload, FileCode, ClipboardList } from "lucide-react";
import { useWorkspaceStore } from "../store/useWorkspaceStore";
import { processInputFiles } from "../core/fileProcessor";

export const Dropzone: React.FC = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { addDocuments, setPasteModalOpen, addIngestionWarnings } = useWorkspaceStore();

  const handleFiles = async (files: FileList | File[]) => {
    const { loaded, skipped } = await processInputFiles(files);
    if (loaded.length > 0) {
      addDocuments(loaded);
    }
    if (skipped.length > 0) {
      addIngestionWarnings(skipped);
    }
  };

  return (
    <div
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        if (e.dataTransfer.files?.length) {
          handleFiles(e.dataTransfer.files);
        }
      }}
      className="relative bg-app-panel border border-dashed border-app-border-medium hover:border-indigo-500 rounded-xl p-6 text-center transition-colors group cursor-pointer"
      onClick={() => fileInputRef.current?.click()}
    >
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.length) {
            handleFiles(e.target.files);
            e.target.value = "";
          }
        }}
      />
      <div className="w-12 h-12 rounded-full bg-zinc-800/80 border border-zinc-700/60 text-zinc-400 group-hover:text-indigo-400 group-hover:border-indigo-500/50 flex items-center justify-center mx-auto mb-3 transition-transform group-hover:-translate-y-0.5">
        <Upload size={22} />
      </div>
      <h2 className="text-sm font-semibold text-zinc-200">Drop AI Studio exports or ZIP archives here</h2>
      <p className="text-xs text-zinc-400 mt-1 mb-4">
        Supports <span className="font-mono text-zinc-300">.json</span>, extensionless AI Studio exports, or bulk <span className="font-mono text-zinc-300">.zip</span> archives
      </p>

      <div className="flex items-center justify-center gap-2" onClick={(e) => e.stopPropagation()}>
        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-indigo-600 hover:bg-indigo-500 text-white transition-colors"
        >
          <FileCode size={14} />
          <span>Browse Files</span>
        </button>
        <button
          onClick={() => setPasteModalOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700/50 transition-colors"
        >
          <ClipboardList size={14} />
          <span>Paste Raw JSON</span>
        </button>
      </div>
    </div>
  );
};