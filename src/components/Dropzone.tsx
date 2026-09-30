import React, { useRef } from "react";
import { Upload, FileCode, ClipboardList } from "lucide-react";
import { useWorkspaceStore } from "../store/useWorkspaceStore";
import { parseAiStudioJson } from "../core/parser";
import { unzipSync, strFromU8 } from "fflate";
import { ConversationDocument } from "../core/types";

export const Dropzone: React.FC = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { addDocuments, setPasteModalOpen } = useWorkspaceStore();

  const handleFiles = async (files: FileList | File[]) => {
    const loadedDocs: ConversationDocument[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      if (file.name.toLowerCase().endsWith(".zip")) {
        const buffer = await file.arrayBuffer();
        const unzipped = unzipSync(new Uint8Array(buffer));

        for (const [path, data] of Object.entries(unzipped)) {
          if (!path.endsWith("/") && !path.includes("__MACOSX/") && path.toLowerCase().endsWith(".json")) {
            try {
              const text = strFromU8(data);
              const doc = parseAiStudioJson(text, path.split("/").pop() || path);
              loadedDocs.push(doc);
            } catch (err) {
              console.warn(`Failed to parse zipped item ${path}:`, err);
            }
          }
        }
      } else {
        try {
          const text = await file.text();
          const doc = parseAiStudioJson(text, file.name);
          loadedDocs.push(doc);
        } catch (err) {
          alert(`Error reading ${file.name}: ${err instanceof Error ? err.message : String(err)}`);
        }
      }
    }

    if (loadedDocs.length > 0) {
      addDocuments(loadedDocs);
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
        accept=".json,.zip"
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
        Supports multiple <span className="font-mono text-zinc-300">.json</span> files or bulk <span className="font-mono text-zinc-300">.zip</span> archives
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