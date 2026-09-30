/**
 * js/parser.js
 * Core conversation extraction, formatting, and token estimation engine.
 * Pure ES Module with zero DOM dependencies.
 */

export const ROLE_LABELS = Object.freeze({
  user: "USER",
  model: "MODEL",
  system: "SYSTEM"
});

/**
 * Check if a parsed JSON object has the expected AI Studio chunks structure.
 * @param {any} data
 * @returns {boolean}
 */
export function isValidAiStudioExport(data) {
  if (!data || typeof data !== "object") return false;
  return Array.isArray(data?.chunkedPrompt?.chunks);
}

/**
 * Extract system instructions from the export if present.
 * @param {any} data
 * @returns {string}
 */
export function extractSystemInstruction(data) {
  if (!data || typeof data !== "object") return "";

  // Shape 1: systemInstruction.parts array
  if (Array.isArray(data?.systemInstruction?.parts)) {
    return data.systemInstruction.parts
      .map(part => (typeof part?.text === "string" ? part.text.trim() : ""))
      .filter(Boolean)
      .join("\n\n");
  }

  // Shape 2: chunkedPrompt.systemInstruction string or object
  const chunkedSys = data?.chunkedPrompt?.systemInstruction;
  if (typeof chunkedSys === "string") return chunkedSys.trim();
  if (Array.isArray(chunkedSys?.parts)) {
    return chunkedSys.parts
      .map(part => (typeof part?.text === "string" ? part.text.trim() : ""))
      .filter(Boolean)
      .join("\n\n");
  }

  return "";
}

/**
 * Estimate token count based on common subword tokenization heuristics (~3.85 characters per token).
 * @param {string} text
 * @returns {number}
 */
export function estimateTokens(text) {
  if (!text) return 0;
  return Math.ceil(text.length / 3.85);
}

/**
 * Normalize and clean up whitespace.
 * @param {string} text
 * @returns {string}
 */
export function pruneWhitespace(text) {
  return text
    .replace(/[ \t]+$/gm, "")      // Strip trailing horizontal whitespace
    .replace(/\n{3,}/g, "\n\n")    // Collapse 3+ newlines to standard double newline
    .trim();
}

/**
 * Transform an AI Studio export into formatted conversation text.
 * @param {string | object} input - JSON string or parsed object
 * @param {object} options
 * @returns {{ text: string, stats: object }}
 */
export function parseAiStudio(input, options = {}) {
  const {
    format = "markdown",
    thoughtHandling = "collapsible",
    roleHeaders = true,
    includeSystemPrompt = true,
    mergeConsecutiveChunks = true,
    turnNumbering = false,
    pruneWhitespace: shouldPrune = true,
    sliceLastNTurns = 0
  } = options;

  let data;
  let rawJsonString = "";

  if (typeof input === "string") {
    rawJsonString = input;
    data = JSON.parse(input);
  } else {
    data = input;
    rawJsonString = JSON.stringify(input);
  }

  if (!isValidAiStudioExport(data)) {
    throw new Error("Invalid format: JSON does not contain 'chunkedPrompt.chunks'.");
  }

  const rawChunks = data.chunkedPrompt.chunks;
  const blocks = [];
  let turnCounter = 0;
  let totalThoughtsCount = 0;
  let lastSpeakerKey = null;

  // Process system prompt if present and requested
  const systemText = extractSystemInstruction(data);
  if (includeSystemPrompt && systemText && thoughtHandling !== "only") {
    let header = "";
    if (roleHeaders) {
      header = format === "markdown" ? "### SYSTEM INSTRUCTION\n\n" : "--- SYSTEM INSTRUCTION ---\n";
    }
    blocks.push(header + systemText);
  }

  // Intermediate normalized turns
  const extractedChunks = [];

  for (const chunk of rawChunks) {
    const text = typeof chunk?.text === "string" ? chunk.text.trim() : "";
    if (!text) continue;

    const isThought = Boolean(chunk.isThought);
    if (isThought) totalThoughtsCount++;

    // Filtering by thought preference
    if (thoughtHandling === "only" && !isThought) continue;
    if (thoughtHandling === "omit" && isThought) continue;

    const role = (chunk.role || "unknown").toLowerCase();
    extractedChunks.push({ role, text, isThought });
  }

  // Turn Slicing (Tail windowing)
  let workingChunks = extractedChunks;
  if (sliceLastNTurns > 0 && workingChunks.length > sliceLastNTurns) {
    workingChunks = workingChunks.slice(-sliceLastNTurns);
  }

  for (const chunk of workingChunks) {
    const { role, text, isThought } = chunk;
    const speakerKey = `${role}:${isThought}`;

    if (mergeConsecutiveChunks && speakerKey === lastSpeakerKey && blocks.length > 0) {
      blocks[blocks.length - 1] += "\n\n" + text;
      continue;
    }

    lastSpeakerKey = speakerKey;
    turnCounter++;

    let formattedBlock = "";
    const roleName = ROLE_LABELS[role] || role.toUpperCase();
    const turnPrefix = turnNumbering ? `Turn ${turnCounter}: ` : "";

    if (format === "markdown") {
      if (isThought && thoughtHandling === "collapsible") {
        formattedBlock = `<details>\n<summary>Thinking Process</summary>\n\n${text}\n\n</details>`;
      } else {
        const header = roleHeaders
          ? `### ${turnPrefix}${roleName}${isThought ? " (Thinking)" : ""}\n\n`
          : "";
        formattedBlock = header + text;
      }
    } else {
      // Plain text formatting
      const header = roleHeaders
        ? `--- ${turnPrefix}${roleName}${isThought ? " (thinking)" : ""} ---\n`
        : "";
      formattedBlock = header + text;
    }

    blocks.push(formattedBlock);
  }

  let finalOutput = blocks.join("\n\n");

  if (shouldPrune) {
    finalOutput = pruneWhitespace(finalOutput);
  }

  finalOutput = finalOutput ? finalOutput + "\n" : "";

  // Statistics calculation
  const rawLength = rawJsonString.length;
  const finalLength = finalOutput.length;
  const rawTokens = estimateTokens(rawJsonString);
  const finalTokens = estimateTokens(finalOutput);
  const tokenSavingsPercent = rawTokens > 0
    ? Math.max(0, Math.round(((rawTokens - finalTokens) / rawTokens) * 100))
    : 0;

  return {
    text: finalOutput,
    stats: {
      originalChars: rawLength,
      resultChars: finalLength,
      originalTokensEst: rawTokens,
      resultTokensEst: finalTokens,
      tokenSavingsPercent,
      turnCount: turnCounter,
      thoughtCount: totalThoughtsCount
    }
  };
}