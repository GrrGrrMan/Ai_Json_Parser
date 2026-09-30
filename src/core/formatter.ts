/**
 * src/core/formatter.ts
 * Compiles Conversation AST into Markdown, Plain Text, or XML
 * with target presets and automated secret redaction.
 */

import {
  ConversationDocument,
  ConversationTurn,
  ExportConfig,
  ExportPreset,
} from "./types";
import { estimateTokens } from "./tokenizer";

/**
 * Standard Presets configurations.
 */
export const PRESET_CONFIGS: Record<ExportPreset, Partial<ExportConfig>> = {
  custom: {},
  obsidian: {
    format: "markdown",
    thoughtMode: "collapsible",
    codeExecMode: "keep-all",
    includeRoleHeaders: true,
    includeSystemPrompt: true,
    includeTurnNumbers: false,
    normalizeBlankLines: true,
    maskSecrets: true,
  },
  "llm-context": {
    format: "xml",
    thoughtMode: "omit",
    codeExecMode: "strip-output",
    includeRoleHeaders: false,
    includeSystemPrompt: true,
    includeTurnNumbers: false,
    normalizeBlankLines: true,
    maskSecrets: true,
  },
  "clean-prose": {
    format: "markdown",
    thoughtMode: "omit",
    codeExecMode: "strip-output",
    includeRoleHeaders: true,
    includeSystemPrompt: false,
    includeTurnNumbers: false,
    normalizeBlankLines: true,
    maskSecrets: false,
  },
  raw: {
    format: "plaintext",
    thoughtMode: "inline",
    codeExecMode: "keep-all",
    includeRoleHeaders: true,
    includeSystemPrompt: true,
    includeTurnNumbers: true,
    normalizeBlankLines: false,
    maskSecrets: false,
  },
};

/**
 * Masks common secrets (API keys, JWTs, Bearer tokens, emails) with redaction placeholders.
 */
export function redactSecrets(text: string): string {
  if (!text) return "";
  return text
    // Google Gemini / AI Studio API Keys
    .replace(/\bAIzaSy[A-Za-z0-9_-]{33}\b/g, "[REDACTED_GOOGLE_API_KEY]")
    // OpenAI API Keys
    .replace(/\bsk-(?:proj-)?[A-Za-z0-9_-]{20,}\b/g, "[REDACTED_OPENAI_API_KEY]")
    // GitHub Personal Access Tokens
    .replace(/\b(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9]{36}\b/g, "[REDACTED_GITHUB_TOKEN]")
    // Generic Bearer Tokens
    .replace(/Bearer\s+[A-Za-z0-9_\-\.]{20,}/gi, "Bearer [REDACTED_TOKEN]")
    // Email addresses
    .replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,7}\b/g, "[REDACTED_EMAIL]");
}

/**
 * Normalizes repeated blank lines and strips trailing whitespace.
 */
export function normalizeSpacing(text: string): string {
  return text
    .replace(/[ \t]+$/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Format an individual turn according to the target configuration.
 */
function formatTurn(
  turn: ConversationTurn,
  config: ExportConfig,
  effectiveTurnNumber: number
): string {
  if (turn.excluded) return "";

  // Thought handling filters
  if (turn.isThought && config.thoughtMode === "omit") return "";
  if (!turn.isThought && config.thoughtMode === "only") return "";

  let content = turn.customText !== undefined ? turn.customText : turn.rawText;

  // Append Code Execution blocks if present
  if (turn.codeExecution) {
    const { code, output, language } = turn.codeExecution;
    const blocks: string[] = [];

    if (code && config.codeExecMode !== "strip-all") {
      blocks.push(`\`\`\`${language || "python"}\n${code.trim()}\n\`\`\``);
    }

    if (output && config.codeExecMode === "keep-all") {
      blocks.push(`\`\`\`text\n[Execution Output]\n${output.trim()}\n\`\`\``);
    }

    if (blocks.length > 0) {
      content = content ? `${content}\n\n${blocks.join("\n\n")}` : blocks.join("\n\n");
    }
  }

  // Redact secrets if requested
  if (config.maskSecrets) {
    content = redactSecrets(content);
  }

  if (!content.trim()) return "";

  const roleName = turn.role.toUpperCase();
  const turnPrefix = config.includeTurnNumbers ? `Turn ${effectiveTurnNumber}: ` : "";

  // XML Format (Optimized for LLM context injection)
  if (config.format === "xml") {
    const tag = turn.role === "user" ? "user" : "model";
    return `<turn role="${tag}" index="${effectiveTurnNumber}">\n${content}\n</turn>`;
  }

  // Markdown Format
  if (config.format === "markdown") {
    if (turn.isThought && config.thoughtMode === "collapsible") {
      return `<details>\n<summary>Thinking Process</summary>\n\n${content}\n\n</details>`;
    }

    const header = config.includeRoleHeaders
      ? `### ${turnPrefix}${roleName}${turn.isThought ? " (Thinking)" : ""}\n\n`
      : "";
    return header + content;
  }

  // Plain Text Format
  const header = config.includeRoleHeaders
    ? `--- ${turnPrefix}${roleName}${turn.isThought ? " (thinking)" : ""} ---\n`
    : "";
  return header + content;
}

/**
 * Compiles a full ConversationDocument AST into the output document string.
 */
export function compileDocument(
  doc: ConversationDocument,
  config: ExportConfig
): string {
  const sections: string[] = [];

  // 1. Obsidian Frontmatter Header
  if (config.preset === "obsidian" && config.format === "markdown") {
    const estTokens = estimateTokens(doc.rawJsonString);
    const frontmatter = [
      "---",
      `title: "${doc.title.replace(/"/g, '\\"')}"`,
      `date: ${new Date(doc.createdAt).toISOString().slice(0, 10)}`,
      `original_file: "${doc.originalFileName}"`,
      `estimated_tokens: ${estTokens}`,
      `tags:`,
      `  - ai-chat-export`,
      `  - gemini`,
      "---",
      "",
    ].join("\n");
    sections.push(frontmatter);
  }

  // 2. System Instruction
  if (config.includeSystemPrompt && doc.systemInstruction && config.thoughtMode !== "only") {
    const sysContent = config.maskSecrets
      ? redactSecrets(doc.systemInstruction)
      : doc.systemInstruction;

    if (config.format === "xml") {
      sections.push(`<system_instruction>\n${sysContent}\n</system_instruction>`);
    } else if (config.format === "markdown") {
      const header = config.includeRoleHeaders ? "### SYSTEM INSTRUCTION\n\n" : "";
      sections.push(header + sysContent);
    } else {
      const header = config.includeRoleHeaders ? "--- SYSTEM INSTRUCTION ---\n" : "";
      sections.push(header + sysContent);
    }
  }

  // 3. Turns Windowing (Keep last N turns if requested)
  let activeTurns = doc.turns;
  if (config.sliceLastNTurns > 0 && activeTurns.length > config.sliceLastNTurns) {
    activeTurns = activeTurns.slice(-config.sliceLastNTurns);
  }

  let counter = 1;
  for (const turn of activeTurns) {
    const formatted = formatTurn(turn, config, counter);
    if (formatted) {
      sections.push(formatted);
      counter++;
    }
  }

  let finalOutput = sections.join("\n\n");

  if (config.normalizeBlankLines) {
    finalOutput = normalizeSpacing(finalOutput);
  }

  return finalOutput ? finalOutput + "\n" : "";
}