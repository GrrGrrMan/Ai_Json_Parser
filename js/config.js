/**
 * js/config.js
 * Centralized settings schema, validation, and localStorage persistence.
 */

export const STORAGE_KEY = "aistudio_parser_prefs_v1";

export const DEFAULT_CONFIG = Object.freeze({
  format: "markdown",            // "markdown" | "plaintext"
  thoughtHandling: "collapsible",// "omit" | "inline" | "collapsible" | "only"
  roleHeaders: true,             // boolean
  includeSystemPrompt: true,     // boolean
  mergeConsecutiveChunks: true,  // boolean
  turnNumbering: false,          // boolean
  pruneWhitespace: true,         // boolean
  sliceLastNTurns: 0,            // number (0 = all)
  batchOutput: "zip"             // "zip" | "merged" | "individual"
});

/**
 * Validate and sanitize an incoming configuration object against the default schema.
 * @param {Record<string, any>} raw
 * @returns {typeof DEFAULT_CONFIG}
 */
export function sanitizeConfig(raw) {
  if (!raw || typeof raw !== "object") {
    return { ...DEFAULT_CONFIG };
  }

  const validFormats = ["markdown", "plaintext"];
  const validThoughtModes = ["omit", "inline", "collapsible", "only"];
  const validBatchModes = ["zip", "merged", "individual"];

  return {
    format: validFormats.includes(raw.format) ? raw.format : DEFAULT_CONFIG.format,
    thoughtHandling: validThoughtModes.includes(raw.thoughtHandling)
      ? raw.thoughtHandling
      : DEFAULT_CONFIG.thoughtHandling,
    roleHeaders: typeof raw.roleHeaders === "boolean" ? raw.roleHeaders : DEFAULT_CONFIG.roleHeaders,
    includeSystemPrompt:
      typeof raw.includeSystemPrompt === "boolean"
        ? raw.includeSystemPrompt
        : DEFAULT_CONFIG.includeSystemPrompt,
    mergeConsecutiveChunks:
      typeof raw.mergeConsecutiveChunks === "boolean"
        ? raw.mergeConsecutiveChunks
        : DEFAULT_CONFIG.mergeConsecutiveChunks,
    turnNumbering:
      typeof raw.turnNumbering === "boolean" ? raw.turnNumbering : DEFAULT_CONFIG.turnNumbering,
    pruneWhitespace:
      typeof raw.pruneWhitespace === "boolean" ? raw.pruneWhitespace : DEFAULT_CONFIG.pruneWhitespace,
    sliceLastNTurns:
      typeof raw.sliceLastNTurns === "number" && raw.sliceLastNTurns >= 0
        ? Math.floor(raw.sliceLastNTurns)
        : DEFAULT_CONFIG.sliceLastNTurns,
    batchOutput: validBatchModes.includes(raw.batchOutput) ? raw.batchOutput : DEFAULT_CONFIG.batchOutput
  };
}

/**
 * Retrieve saved config from localStorage, falling back to defaults.
 * @returns {typeof DEFAULT_CONFIG}
 */
export function loadConfig() {
  try {
    const serialized = localStorage.getItem(STORAGE_KEY);
    if (!serialized) {
      return { ...DEFAULT_CONFIG };
    }
    const parsed = JSON.parse(serialized);
    return sanitizeConfig(parsed);
  } catch {
    return { ...DEFAULT_CONFIG };
  }
}

/**
 * Persist config to localStorage.
 * @param {Partial<typeof DEFAULT_CONFIG>} partialConfig
 * @returns {typeof DEFAULT_CONFIG}
 */
export function saveConfig(partialConfig) {
  const current = loadConfig();
  const merged = sanitizeConfig({ ...current, ...partialConfig });
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
  } catch (err) {
    console.warn("Unable to persist configuration to localStorage:", err);
  }
  return merged;
}

/**
 * Reset config to initial defaults and clear localStorage key.
 * @returns {typeof DEFAULT_CONFIG}
 */
export function resetConfig() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (err) {
    console.warn("Unable to clear configuration in localStorage:", err);
  }
  return { ...DEFAULT_CONFIG };
}