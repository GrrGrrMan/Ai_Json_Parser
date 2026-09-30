/**
 * src/core/types.ts
 * Unified Turn AST, Document Model, and Configuration Schema.
 */

export type RoleType = "user" | "model" | "system";

export type OutputFormat = "markdown" | "plaintext" | "xml";

export type ThoughtMode = "collapsible" | "omit" | "inline" | "only";

export type CodeExecMode = "keep-all" | "strip-output" | "strip-all";

export type ExportPreset = "custom" | "obsidian" | "llm-context" | "clean-prose" | "raw";

export interface CodeExecutionData {
  language?: string;
  code?: string;
  output?: string;
  outcome?: string;
}

export interface GroundingCitation {
  startIndex?: number;
  endIndex?: number;
  uri?: string;
  title?: string;
}

export interface ConversationTurn {
  id: string;
  turnNumber: number;
  role: RoleType;
  rawText: string;
  customText?: string;          // User-edited text override
  isThought: boolean;
  excluded: boolean;            // Toggled via eye icon in UI
  codeExecution?: CodeExecutionData;
  citations?: GroundingCitation[];
}

export interface ConversationDocument {
  id: string;
  originalFileName: string;
  title: string;
  systemInstruction?: string;
  turns: ConversationTurn[];
  rawJsonString: string;
  status: "ready" | "error";
  errorMessage?: string;
  createdAt: number;
}

export interface ExportConfig {
  preset: ExportPreset;
  format: OutputFormat;
  thoughtMode: ThoughtMode;
  codeExecMode: CodeExecMode;
  includeRoleHeaders: boolean;
  includeSystemPrompt: boolean;
  includeTurnNumbers: boolean;
  maskSecrets: boolean;
  normalizeBlankLines: boolean;
  sliceLastNTurns: number;      // 0 = keep all
}

export interface TokenMetrics {
  originalChars: number;
  exportedChars: number;
  originalTokensEst: number;
  exportedTokensEst: number;
  tokensSavedPercent: number;
  totalTurnsCount: number;
  activeTurnsCount: number;
  thoughtsCount: number;
}