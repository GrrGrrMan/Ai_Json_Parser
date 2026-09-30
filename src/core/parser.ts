/**
 * src/core/parser.ts
 * Parses Google AI Studio JSON exports into a normalized Turn AST.
 */

import {
  ConversationDocument,
  ConversationTurn,
  RoleType,
  CodeExecutionData,
  GroundingCitation,
} from "./types";

/**
 * Verify whether an object matches the expected Google AI Studio export structure.
 */
export function isValidAiStudioExport(data: any): boolean {
  if (!data || typeof data !== "object") return false;
  return Array.isArray(data?.chunkedPrompt?.chunks);
}

/**
 * Extract system instructions from the export if available.
 */
export function extractSystemInstruction(data: any): string {
  if (!data || typeof data !== "object") return "";

  // Structure 1: Root systemInstruction.parts
  if (Array.isArray(data?.systemInstruction?.parts)) {
    return data.systemInstruction.parts
      .map((p: any) => (typeof p?.text === "string" ? p.text.trim() : ""))
      .filter(Boolean)
      .join("\n\n");
  }

  // Structure 2: chunkedPrompt.systemInstruction
  const chunkedSys = data?.chunkedPrompt?.systemInstruction;
  if (typeof chunkedSys === "string") return chunkedSys.trim();
  if (Array.isArray(chunkedSys?.parts)) {
    return chunkedSys.parts
      .map((p: any) => (typeof p?.text === "string" ? p.text.trim() : ""))
      .filter(Boolean)
      .join("\n\n");
  }

  return "";
}

/**
 * Parse an AI Studio export payload into a ConversationDocument AST.
 */
export function parseAiStudioJson(
  rawJsonString: string,
  fileName: string
): ConversationDocument {
  const data = JSON.parse(rawJsonString);

  if (!isValidAiStudioExport(data)) {
    throw new Error("Invalid AI Studio file: Missing 'chunkedPrompt.chunks' array.");
  }

  const rawChunks: any[] = data.chunkedPrompt.chunks;
  const turns: ConversationTurn[] = [];
  const systemInstruction = extractSystemInstruction(data);

  let turnIndex = 1;

  for (const chunk of rawChunks) {
    const text: string = typeof chunk?.text === "string" ? chunk.text.trim() : "";
    const isThought: boolean = Boolean(chunk?.isThought);

    let codeExecution: CodeExecutionData | undefined;

    // Check for Python sandbox code execution blocks
    if (chunk?.executableCode || chunk?.codeExecutionResult) {
      codeExecution = {
        language: chunk?.executableCode?.language || "python",
        code: chunk?.executableCode?.code || "",
        output: chunk?.codeExecutionResult?.output || "",
        outcome: chunk?.codeExecutionResult?.outcome || "",
      };
    }

    // Check for search citations
    let citations: GroundingCitation[] | undefined;
    if (Array.isArray(chunk?.groundingMetadata?.groundingChunks)) {
      citations = chunk.groundingMetadata.groundingChunks
        .map((c: any) => ({
          uri: c?.web?.uri,
          title: c?.web?.title,
        }))
        .filter((c: GroundingCitation) => Boolean(c.uri));
    }

    // Skip empty chunks that have neither text nor code execution
    if (!text && !codeExecution?.code && !codeExecution?.output) {
      continue;
    }

    const role: RoleType = (chunk?.role || "model").toLowerCase() as RoleType;

    turns.push({
      id: crypto.randomUUID(),
      turnNumber: turnIndex++,
      role: role === "user" ? "user" : "model",
      rawText: text,
      isThought,
      excluded: false,
      codeExecution,
      citations,
    });
  }

  // Generate document title
  const cleanTitle = fileName
    .replace(/\.[^/.]+$/, "")
    .replace(/[_-]+/g, " ")
    .trim();

  return {
    id: crypto.randomUUID(),
    originalFileName: fileName,
    title: cleanTitle || "Untitled Chat",
    systemInstruction,
    turns,
    rawJsonString,
    status: "ready",
    createdAt: Date.now(),
  };
}