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
          // Ignore directories, system files, and non-JSON files
          if (path.endsWith("/") || path.includes("__MACOSX/") || !path.toLowerCase().endsWith(".json")) {
            continue;
          }

          const baseName = path.split("/").pop() || path;
          try {
            const text = strFromU8(data);
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
    } else if (file.name.toLowerCase().endsWith(".json")) {
      try {
        const text = await file.text();
        const doc = parseAiStudioJson(text, file.name);
        report.loaded.push(doc);
      } catch (err) {
        report.skipped.push({
          fileName: file.name,
          reason: err instanceof Error ? err.message : String(err),
        });
      }
    } else {
      report.skipped.push({
        fileName: file.name,
        reason: "Unsupported file type. Please provide .json or .zip exports.",
      });
    }
  }

  return report;
}