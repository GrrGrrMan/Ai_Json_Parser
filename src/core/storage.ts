/**
 * src/core/storage.ts
 * Asynchronous IndexedDB persistence adapter via idb-keyval.
 * Overcomes the 5MB localStorage threshold for large multi-file chat sessions.
 */

import { get, set, del, clear } from "idb-keyval";
import { ConversationDocument, ExportConfig } from "./types";

const IDB_DOCUMENTS_KEY = "aistudio_docs_store_v2";
const IDB_CONFIG_KEY = "aistudio_config_store_v2";

/**
 * Persist the entire workspace document list to IndexedDB.
 */
export async function saveDocumentsToDb(docs: ConversationDocument[]): Promise<void> {
  try {
    await set(IDB_DOCUMENTS_KEY, docs);
  } catch (err) {
    console.error("Failed to persist documents to IndexedDB:", err);
  }
}

/**
 * Retrieve saved workspace documents from IndexedDB.
 */
export async function loadDocumentsFromDb(): Promise<ConversationDocument[]> {
  try {
    const docs = await get<ConversationDocument[]>(IDB_DOCUMENTS_KEY);
    return Array.isArray(docs) ? docs : [];
  } catch (err) {
    console.warn("Unable to load documents from IndexedDB, starting fresh:", err);
    return [];
  }
}

/**
 * Remove all workspace documents from IndexedDB.
 */
export async function clearDocumentsDb(): Promise<void> {
  try {
    await del(IDB_DOCUMENTS_KEY);
  } catch (err) {
    console.error("Failed to clear documents in IndexedDB:", err);
  }
}

/**
 * Save current export configuration.
 */
export async function saveConfigToDb(config: ExportConfig): Promise<void> {
  try {
    await set(IDB_CONFIG_KEY, config);
  } catch (err) {
    console.error("Failed to save config to IndexedDB:", err);
  }
}

/**
 * Load saved export configuration.
 */
export async function loadConfigFromDb(): Promise<ExportConfig | null> {
  try {
    const config = await get<ExportConfig>(IDB_CONFIG_KEY);
    return config || null;
  } catch {
    return null;
  }
}

/**
 * Complete database reset.
 */
export async function resetDatabase(): Promise<void> {
  await clear();
}