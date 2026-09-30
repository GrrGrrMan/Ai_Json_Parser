/**
 * js/worker.js
 * Dedicated Web Worker for batch parsing and ZIP compression/decompression.
 */

import * as fflate from "./fflate.js";
import { parseAiStudio } from "./parser.js";

const textDecoder = new TextDecoder("utf-8");

self.onmessage = async function (e) {
  const { action, payload } = e.data;

  try {
    switch (action) {
      case "PROCESS_FILES":
        await handleProcessFiles(payload);
        break;

      case "BUILD_ZIP":
        handleBuildZip(payload);
        break;

      default:
        self.postMessage({ type: "ERROR", error: `Unknown action: ${action}` });
    }
  } catch (err) {
    self.postMessage({ type: "ERROR", error: err.message || String(err) });
  }
};

/**
 * Recursively inspect and decompress zip entries or plain json files.
 */
async function handleProcessFiles({ files, options }) {
  const results = [];
  const total = files.length;

  for (let i = 0; i < total; i++) {
    const file = files[i];
    self.postMessage({
      type: "PROGRESS",
      current: i + 1,
      total,
      filename: file.name
    });

    if (file.name.toLowerCase().endsWith(".zip")) {
      await processZipBuffer(file.buffer, file.name, options, results);
    } else {
      processSingleJson(file.text, file.name, options, results);
    }
  }

  self.postMessage({ type: "PROCESS_COMPLETE", results });
}

function processSingleJson(rawText, originalName, options, results) {
  const baseName = originalName.replace(/\.[^/.]+$/, "");
  const extension = options.format === "markdown" ? ".md" : ".txt";
  const outputName = `${baseName}${extension}`;

  try {
    const parsed = parseAiStudio(rawText, options);
    results.push({
      id: crypto.randomUUID(),
      originalName,
      rawText,
      outputName,
      text: parsed.text,
      stats: parsed.stats,
      status: "success",
      error: null
    });
  } catch (err) {
    results.push({
      id: crypto.randomUUID(),
      originalName,
      rawText,
      outputName,
      text: "",
      stats: null,
      status: "error",
      error: err.message || "Failed to parse JSON"
    });
  }
}

async function processZipBuffer(arrayBuffer, zipName, options, results) {
  return new Promise((resolve) => {
    const uint8 = new Uint8Array(arrayBuffer);
    fflate.unzip(uint8, (err, unzipped) => {
      if (err) {
        results.push({
          id: crypto.randomUUID(),
          originalName: zipName,
          outputName: zipName,
          text: "",
          stats: null,
          status: "error",
          error: `Corrupt ZIP file: ${err.message}`
        });
        return resolve();
      }

      for (const [relativePath, fileData] of Object.entries(unzipped)) {
        // Skip directory entries, OS metadata, and non-JSON files
        if (
          relativePath.endsWith("/") ||
          relativePath.includes("__MACOSX/") ||
          !relativePath.toLowerCase().endsWith(".json")
        ) {
          continue;
        }

        const fileName = relativePath.split("/").pop();
        const rawText = textDecoder.decode(fileData);
        processSingleJson(rawText, `${zipName} / ${fileName}`, options, results);
      }
      resolve();
    });
  });
}

function handleBuildZip({ files }) {
  const zipTree = {};

  for (const file of files) {
    if (file.status === "success" && file.text) {
      zipTree[file.outputName] = fflate.strToU8(file.text);
    }
  }

  fflate.zip(zipTree, { level: 6 }, (err, zippedData) => {
    if (err) {
      self.postMessage({ type: "ZIP_ERROR", error: err.message });
      return;
    }

    self.postMessage(
      {
        type: "ZIP_COMPLETE",
        buffer: zippedData.buffer
      },
      [zippedData.buffer]
    );
  });
}