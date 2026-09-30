/**
 * src/store/useWorkspaceStore.ts
 * Central reactive store managing documents, selections, turn-level edits, and config.
 */

import { create } from "zustand";
import {
  ConversationDocument,
  ExportConfig,
  ExportPreset,
} from "../core/types";
import { PRESET_CONFIGS } from "../core/formatter";
import {
  loadDocumentsFromDb,
  saveDocumentsToDb,
  loadConfigFromDb,
  saveConfigToDb,
} from "../core/storage";

export const DEFAULT_CONFIG: ExportConfig = {
  preset: "obsidian",
  format: "markdown",
  thoughtMode: "collapsible",
  codeExecMode: "keep-all",
  includeRoleHeaders: true,
  includeSystemPrompt: true,
  includeTurnNumbers: false,
  maskSecrets: true,
  normalizeBlankLines: true,
  sliceLastNTurns: 0,
};

export interface IngestionWarning {
  fileName: string;
  reason: string;
}

interface WorkspaceState {
  documents: ConversationDocument[];
  selectedDocIds: string[];
  activeDocId: string | null;
  config: ExportConfig;
  activeTab: "editor" | "preview" | "raw";
  isPasteModalOpen: boolean;

  // Ingestion diagnostics
  ingestionWarnings: IngestionWarning[];
  addIngestionWarnings: (warnings: IngestionWarning[]) => void;
  clearIngestionWarnings: () => void;

  // Lifecycle
  initStore: () => Promise<void>;

  // Document Management
  addDocuments: (docs: ConversationDocument[]) => void;
  removeDocument: (id: string) => void;
  removeSelectedDocuments: () => void;
  clearAll: () => void;
  setActiveDocId: (id: string | null) => void;
  updateDocTitle: (id: string, title: string) => void;

  // Selection
  toggleSelectDoc: (id: string) => void;
  selectAllDocs: (selected: boolean) => void;

  // Turn-level Interactive Editing
  toggleTurnExcluded: (docId: string, turnId: string) => void;
  updateTurnText: (docId: string, turnId: string, text: string) => void;
  deleteTurn: (docId: string, turnId: string) => void;
  deleteTurnThought: (docId: string, turnId: string) => void;
  deleteTurnCodeExec: (docId: string, turnId: string) => void;

  // Config & UI Tabs
  updateConfig: (partial: Partial<ExportConfig>) => void;
  setPreset: (preset: ExportPreset) => void;
  setActiveTab: (tab: "editor" | "preview" | "raw") => void;
  setPasteModalOpen: (open: boolean) => void;
}

export const useWorkspaceStore = create<WorkspaceState>((set) => ({
  documents: [],
  selectedDocIds: [],
  activeDocId: null,
  config: DEFAULT_CONFIG,
  activeTab: "editor",
  isPasteModalOpen: false,

  ingestionWarnings: [],
  addIngestionWarnings: (warnings) =>
    set((state) => ({ ingestionWarnings: [...state.ingestionWarnings, ...warnings] })),
  clearIngestionWarnings: () => set({ ingestionWarnings: [] }),

  initStore: async () => {
    const [savedDocs, savedConfig] = await Promise.all([
      loadDocumentsFromDb(),
      loadConfigFromDb(),
    ]);

    set({
      documents: savedDocs,
      config: savedConfig || DEFAULT_CONFIG,
      activeDocId: savedDocs.length > 0 ? savedDocs[0].id : null,
      selectedDocIds: savedDocs.map((d) => d.id),
    });
  },

  addDocuments: (newDocs) => {
    set((state) => {
      const merged = [...state.documents, ...newDocs];
      saveDocumentsToDb(merged);
      const newIds = newDocs.map((d) => d.id);
      return {
        documents: merged,
        selectedDocIds: [...state.selectedDocIds, ...newIds],
        activeDocId: state.activeDocId || (newDocs[0] ? newDocs[0].id : null),
      };
    });
  },

  removeDocument: (id) => {
    set((state) => {
      const updated = state.documents.filter((d) => d.id !== id);
      saveDocumentsToDb(updated);
      return {
        documents: updated,
        selectedDocIds: state.selectedDocIds.filter((docId) => docId !== id),
        activeDocId: state.activeDocId === id ? (updated[0]?.id || null) : state.activeDocId,
      };
    });
  },

  removeSelectedDocuments: () => {
    set((state) => {
      const updated = state.documents.filter((d) => !state.selectedDocIds.includes(d.id));
      saveDocumentsToDb(updated);
      return {
        documents: updated,
        selectedDocIds: [],
        activeDocId: updated[0]?.id || null,
      };
    });
  },

  clearAll: () => {
    saveDocumentsToDb([]);
    set({
      documents: [],
      selectedDocIds: [],
      activeDocId: null,
    });
  },

  setActiveDocId: (id) => set({ activeDocId: id }),

  updateDocTitle: (id, title) => {
    set((state) => {
      const updated = state.documents.map((d) => (d.id === id ? { ...d, title } : d));
      saveDocumentsToDb(updated);
      return { documents: updated };
    });
  },

  toggleSelectDoc: (id) => {
    set((state) => ({
      selectedDocIds: state.selectedDocIds.includes(id)
        ? state.selectedDocIds.filter((item) => item !== id)
        : [...state.selectedDocIds, id],
    }));
  },

  selectAllDocs: (selected) => {
    set((state) => ({
      selectedDocIds: selected ? state.documents.map((d) => d.id) : [],
    }));
  },

  toggleTurnExcluded: (docId, turnId) => {
    set((state) => {
      const updated = state.documents.map((doc) => {
        if (doc.id !== docId) return doc;
        return {
          ...doc,
          turns: doc.turns.map((t) => (t.id === turnId ? { ...t, excluded: !t.excluded } : t)),
        };
      });
      saveDocumentsToDb(updated);
      return { documents: updated };
    });
  },

  updateTurnText: (docId, turnId, newText) => {
    set((state) => {
      const updated = state.documents.map((doc) => {
        if (doc.id !== docId) return doc;
        return {
          ...doc,
          turns: doc.turns.map((t) => (t.id === turnId ? { ...t, customText: newText } : t)),
        };
      });
      saveDocumentsToDb(updated);
      return { documents: updated };
    });
  },

  deleteTurn: (docId, turnId) => {
    set((state) => {
      const updated = state.documents.map((doc) => {
        if (doc.id !== docId) return doc;
        return {
          ...doc,
          turns: doc.turns.filter((t) => t.id !== turnId),
        };
      });
      saveDocumentsToDb(updated);
      return { documents: updated };
    });
  },

  deleteTurnThought: (docId, turnId) => {
    set((state) => {
      const updated = state.documents.map((doc) => {
        if (doc.id !== docId) return doc;
        return {
          ...doc,
          turns: doc.turns.map((t) => {
            if (t.id !== turnId) return t;
            return { ...t, isThought: false, rawText: t.isThought ? "" : t.rawText };
          }),
        };
      });
      saveDocumentsToDb(updated);
      return { documents: updated };
    });
  },

  deleteTurnCodeExec: (docId, turnId) => {
    set((state) => {
      const updated = state.documents.map((doc) => {
        if (doc.id !== docId) return doc;
        return {
          ...doc,
          turns: doc.turns.map((t) => (t.id === turnId ? { ...t, codeExecution: undefined } : t)),
        };
      });
      saveDocumentsToDb(updated);
      return { documents: updated };
    });
  },

  updateConfig: (partial) => {
    set((state) => {
      const merged = { ...state.config, ...partial, preset: "custom" as ExportPreset };
      saveConfigToDb(merged);
      return { config: merged };
    });
  },

  setPreset: (preset) => {
    set((state) => {
      const overrides = PRESET_CONFIGS[preset] || {};
      const merged: ExportConfig = {
        ...state.config,
        ...overrides,
        preset,
      };
      saveConfigToDb(merged);
      return { config: merged };
    });
  },

  setActiveTab: (tab) => set({ activeTab: tab }),
  setPasteModalOpen: (open) => set({ isPasteModalOpen: open }),
}));