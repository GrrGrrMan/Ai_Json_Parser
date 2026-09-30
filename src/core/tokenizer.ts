/**
 * src/core/tokenizer.ts
 * Subword token count heuristic and context reduction metrics.
 */

import { ConversationDocument, TokenMetrics } from "./types";

/**
 * Common subword token estimation heuristic (~3.85 chars per token for typical mixed code & text).
 */
export function estimateTokens(text: string): number {
  if (!text) return 0;
  return Math.ceil(text.length / 3.85);
}

/**
 * Calculates real-time token metrics comparing raw ingested JSON vs exported output.
 */
export function calculateMetrics(
  doc: ConversationDocument,
  compiledOutput: string
): TokenMetrics {
  const originalChars = doc.rawJsonString.length;
  const exportedChars = compiledOutput.length;

  const originalTokensEst = estimateTokens(doc.rawJsonString);
  const exportedTokensEst = estimateTokens(compiledOutput);

  const tokensSavedPercent =
    originalTokensEst > 0
      ? Math.max(0, Math.round(((originalTokensEst - exportedTokensEst) / originalTokensEst) * 100))
      : 0;

  const totalTurnsCount = doc.turns.length;
  const activeTurnsCount = doc.turns.filter((t) => !t.excluded).length;
  const thoughtsCount = doc.turns.filter((t) => t.isThought).length;

  return {
    originalChars,
    exportedChars,
    originalTokensEst,
    exportedTokensEst,
    tokensSavedPercent,
    totalTurnsCount,
    activeTurnsCount,
    thoughtsCount,
  };
}