import React from "react";
import { Settings2, ShieldCheck, Scissors, Sparkles, RotateCcw } from "lucide-react";
import { useWorkspaceStore, DEFAULT_CONFIG } from "../store/useWorkspaceStore";
import { ExportPreset, OutputFormat, ThoughtMode, CodeExecMode } from "../core/types";

interface SidebarProps {
  onActionComplete?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ onActionComplete }) => {
  const { config, updateConfig, setPreset } = useWorkspaceStore();

  const handleSelectPreset = (p: ExportPreset) => {
    setPreset(p);
    onActionComplete?.();
  };

  return (
    <aside className="w-80 flex flex-col gap-4 flex-shrink-0">
      {/* Target Presets */}
      <div className="bg-app-panel border border-app-border rounded-xl p-4">
        <div className="flex items-center justify-between mb-3 text-zinc-400 text-xs font-semibold uppercase tracking-wider">
          <span className="flex items-center gap-1.5 text-zinc-300">
            <Sparkles size={14} className="text-indigo-400" />
            Target Preset
          </span>
          <button
            onClick={() => updateConfig(DEFAULT_CONFIG)}
            className="text-zinc-500 hover:text-zinc-300 transition-colors"
            title="Reset settings"
          >
            <RotateCcw size={12} />
          </button>
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          {(["obsidian", "llm-context", "clean-prose", "raw"] as ExportPreset[]).map((p) => (
            <button
              key={p}
              onClick={() => handleSelectPreset(p)}
              className={`px-2.5 py-1.5 text-xs rounded-md font-medium text-left capitalize transition-colors ${
                config.preset === p
                  ? "bg-indigo-600 text-white"
                  : "bg-zinc-800/60 hover:bg-zinc-800 text-zinc-300 border border-zinc-700/40"
              }`}
            >
              {p.replace("-", " ")}
            </button>
          ))}
        </div>
      </div>

      {/* Syntax & Content Controls */}
      <div className="bg-app-panel border border-app-border rounded-xl p-4 space-y-3.5">
        <div className="flex items-center gap-1.5 text-zinc-300 text-xs font-semibold uppercase tracking-wider">
          <Settings2 size={14} className="text-indigo-400" />
          Formatting Controls
        </div>

        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-1">Output Format</label>
          <select
            value={config.format}
            onChange={(e) => updateConfig({ format: e.target.value as OutputFormat })}
            className="w-full bg-app-input border border-app-border rounded-md px-2.5 py-1.5 text-xs text-zinc-200 outline-none focus:border-indigo-500"
          >
            <option value="markdown">Markdown (.md)</option>
            <option value="plaintext">Plain Text (.txt)</option>
            <option value="xml">XML Tags (.xml)</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-1">Thinking Process</label>
          <select
            value={config.thoughtMode}
            onChange={(e) => updateConfig({ thoughtMode: e.target.value as ThoughtMode })}
            className="w-full bg-app-input border border-app-border rounded-md px-2.5 py-1.5 text-xs text-zinc-200 outline-none focus:border-indigo-500"
          >
            <option value="collapsible">Collapsible &lt;details&gt;</option>
            <option value="omit">Omit Thoughts (Clean)</option>
            <option value="inline">Inline Block</option>
            <option value="only">Only Thoughts</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-1">Python Code Execution</label>
          <select
            value={config.codeExecMode}
            onChange={(e) => updateConfig({ codeExecMode: e.target.value as CodeExecMode })}
            className="w-full bg-app-input border border-app-border rounded-md px-2.5 py-1.5 text-xs text-zinc-200 outline-none focus:border-indigo-500"
          >
            <option value="keep-all">Keep Code &amp; Execution Output</option>
            <option value="strip-output">Keep Code (Strip Logs)</option>
            <option value="strip-all">Strip Both Code &amp; Logs</option>
          </select>
        </div>

        <div className="space-y-2 pt-2 border-t border-app-border/60">
          <label className="flex items-center gap-2 text-xs text-zinc-300 cursor-pointer">
            <input
              type="checkbox"
              checked={config.includeRoleHeaders}
              onChange={(e) => updateConfig({ includeRoleHeaders: e.target.checked })}
              className="accent-indigo-500 rounded"
            />
            <span>Include Speaker Headers</span>
          </label>

          <label className="flex items-center gap-2 text-xs text-zinc-300 cursor-pointer">
            <input
              type="checkbox"
              checked={config.includeSystemPrompt}
              onChange={(e) => updateConfig({ includeSystemPrompt: e.target.checked })}
              className="accent-indigo-500 rounded"
            />
            <span>Extract System Prompt</span>
          </label>

          <label className="flex items-center gap-2 text-xs text-zinc-300 cursor-pointer">
            <input
              type="checkbox"
              checked={config.includeTurnNumbers}
              onChange={(e) => updateConfig({ includeTurnNumbers: e.target.checked })}
              className="accent-indigo-500 rounded"
            />
            <span>Add Turn Numbers</span>
          </label>
        </div>
      </div>

      {/* Optimizer & Privacy Filters */}
      <div className="bg-app-panel border border-app-border rounded-xl p-4 space-y-3">
        <div className="flex items-center gap-1.5 text-zinc-300 text-xs font-semibold uppercase tracking-wider">
          <Scissors size={14} className="text-indigo-400" />
          Context Optimizer
        </div>

        <label className="flex items-center gap-2 text-xs text-zinc-300 cursor-pointer">
          <input
            type="checkbox"
            checked={config.normalizeBlankLines}
            onChange={(e) => updateConfig({ normalizeBlankLines: e.target.checked })}
            className="accent-indigo-500 rounded"
          />
          <span>Normalize Blank Lines</span>
        </label>

        <label className="flex items-center gap-2 text-xs text-zinc-300 cursor-pointer">
          <input
            type="checkbox"
            checked={config.maskSecrets}
            onChange={(e) => updateConfig({ maskSecrets: e.target.checked })}
            className="accent-indigo-500 rounded"
          />
          <span className="flex items-center gap-1">
            <ShieldCheck size={13} className="text-emerald-400" />
            Mask API Keys &amp; Secrets
          </span>
        </label>

        <div className="pt-2">
          <label className="block text-xs font-medium text-zinc-400 mb-1">Keep Last N Turns</label>
          <input
            type="number"
            min={0}
            max={500}
            value={config.sliceLastNTurns}
            onChange={(e) => updateConfig({ sliceLastNTurns: parseInt(e.target.value, 10) || 0 })}
            className="w-full bg-app-input border border-app-border rounded-md px-2.5 py-1.5 text-xs text-zinc-200 outline-none focus:border-indigo-500"
          />
          <span className="text-[10px] text-zinc-500 mt-1 block">0 preserves full history</span>
        </div>
      </div>
    </aside>
  );
};