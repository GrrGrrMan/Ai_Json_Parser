// src/core/parser.ts
import { ConversationDocument, ConversationTurn, RoleType } from "./types";

export interface ParseResult {
  document?: ConversationDocument;
  error?: {
    fileName: string;
    reason: string;
    rawSnippet?: string;
  };
}

/**
 * Sanitizes JSON strings by removing single/multi-line comments and trailing commas.
 */
export function sanitizeJsonString(raw: string): string {
  return raw
    .replace(/\/\*[\s\S]*?\*\/|([^\\:]|^)\/\/.*$/gm, "$1") // Remove comments
    .replace(/,\s*([\]}])/g, "$1")                         // Remove trailing commas
    .trim();
}

/**
 * Extract system instructions from AI Studio and Gemini exports if present.
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
 * Normalizes different Google AI Studio and Gemini API export schemas.
 */
export function parseAiStudioJson(rawText: string, fileName: string): ConversationDocument {
  let data: any;

  try {
    data = JSON.parse(rawText);
  } catch {
    // Attempt fallback to sanitized JSON
    data = JSON.parse(sanitizeJsonString(rawText));
  }

  if (!data || typeof data !== "object") {
    throw new Error("File content is not a valid JSON object.");
  }

  // Schema Strategy 1: Standard AI Studio Chunked Prompt
  let rawChunks: any[] = [];
  let systemInstruction = "";

  if (Array.isArray(data?.chunkedPrompt?.chunks)) {
    rawChunks = data.chunkedPrompt.chunks;
    systemInstruction = extractSystemInstruction(data);
  } 
  // Schema Strategy 2: Gemini API / Vertex AI `contents` structure
  else if (Array.isArray(data?.contents)) {
    rawChunks = data.contents.flatMap((content: any) => 
      (content.parts || []).map((part: any) => ({
        role: content.role || "user",
        text: part.text || "",
        executableCode: part.executableCode,
        codeExecutionResult: part.codeExecutionResult,
        isThought: Boolean(part.thought),
      }))
    );
    if (data?.systemInstruction?.parts) {
      systemInstruction = data.systemInstruction.parts.map((p: any) => p.text).join("\n\n");
    }
  } else {
    throw new Error(
      "Unrecognized schema: Expected 'chunkedPrompt.chunks' or 'contents' array."
    );
  }

  const turns: ConversationTurn[] = [];
  let turnIndex = 1;

  for (const chunk of rawChunks) {
    const text: string = typeof chunk?.text === "string" ? chunk.text.trim() : "";
    const isThought: boolean = Boolean(chunk?.isThought || chunk?.thought);

    let codeExecution;
    if (chunk?.executableCode || chunk?.codeExecutionResult) {
      codeExecution = {
        language: chunk?.executableCode?.language || "python",
        code: chunk?.executableCode?.code || "",
        output: chunk?.codeExecutionResult?.output || "",
        outcome: chunk?.codeExecutionResult?.outcome || "",
      };
    }

    if (!text && !codeExecution?.code && !codeExecution?.output) continue;

    const role: RoleType = (chunk?.role || "model").toLowerCase() === "user" ? "user" : "model";

    turns.push({
      id: crypto.randomUUID(),
      turnNumber: turnIndex++,
      role,
      rawText: text,
      isThought,
      excluded: false,
      codeExecution,
    });
  }

  if (turns.length === 0 && !systemInstruction) {
    throw new Error("The conversation file contains no readable turns or prompt data.");
  }

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
    rawJsonString: rawText,
    status: "ready",
    createdAt: Date.now(),
  };
}