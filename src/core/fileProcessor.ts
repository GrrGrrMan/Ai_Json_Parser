// src/core/fileProcessor.ts
import { unzip, strFromU8 } from "fflate";
import { parseAiStudioJson } from "./parser";
import { ConversationDocument } from "./types";

export interface BatchIngestionReport {
  loaded: ConversationDocument[];
  skipped: { fileName: string; reason: string }[];
}

export async function processInputFiles(files: FileList | File[]): Promise<BatchIngestionReport> {
  const report: BatchIngestionReport = { loaded: [], skipped: [] };

  for (const file of Array.from(files)) {
    const isZip = file.name.toLowerCase().endsWith(".zip");

    if (isZip) {
      try {
        const buffer = await file.arrayBuffer();
        const unzipped = await new Promise<Record<string, Uint8Array>>((resolve, reject) => {
          unzip(new Uint8Array(buffer), (err, data) => (err ? reject(err) : resolve(data)));
        });

        for (const [path, data] of Object.entries(unzipped)) {
          const baseName = path.split("/").pop() || path;
          const isKnownBinary = /\.(png|jpe?g|gif|webp|zip|tar|gz|bin|exe|pdf)$/i.test(baseName);

          // Skip directories, OS metadata, and binary assets
          if (path.endsWith("/") || path.includes("__MACOSX/") || isKnownBinary) {
            continue;
          }

          try {
            const text = strFromU8(data).trim();
            // Only process text payloads structured as JSON
            if (!text.startsWith("{")) continue;

            const doc = parseAiStudioJson(text, baseName);
            report.loaded.push(doc);
          } catch (err) {
            report.skipped.push({
              fileName: path,
              reason: err instanceof Error ? err.message : String(err),
            });
          }
        }
      } catch (zipErr) {
        report.skipped.push({
          fileName: file.name,
          reason: `Corrupted ZIP archive: ${zipErr instanceof Error ? zipErr.message : String(zipErr)}`,
        });
      }
    } else {
      // Ingest direct files (supports .json, .txt, or extensionless Google AI Studio exports)
      try {
        const text = (await file.text()).trim();
        if (!text.startsWith("{")) {
          throw new Error("File content is not valid JSON (expected opening '{').");
        }
        const doc = parseAiStudioJson(text, file.name);
        report.loaded.push(doc);
      } catch (err) {
        report.skipped.push({
          fileName: file.name,
          reason: err instanceof Error ? err.message : String(err),
        });
      }
    }
  }

  return report;
}