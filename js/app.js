/**
 * js/app.js
 * Application controller with reactive live-reparsing, state persistence,
 * Web Worker batch handling, and memory-safe downloads.
 */

import { loadConfig, saveConfig, resetConfig } from "./config.js";
import { parseAiStudio } from "./parser.js";

// Application State
let currentConfig = loadConfig();
let processedFiles = [];
let activePreviewItem = null;

// Initialize Worker
const worker = new Worker("./js/worker.js", { type: "module" });

// DOM Elements
const dropzone = document.getElementById("dropzone");
const fileInput = document.getElementById("fileInput");
const btnBrowse = document.getElementById("btnBrowse");
const btnOpenPaste = document.getElementById("btnOpenPaste");
const pasteModal = document.getElementById("pasteModal");
const pasteTextarea = document.getElementById("pasteTextarea");
const btnClosePaste = document.getElementById("btnClosePaste");
const btnCancelPaste = document.getElementById("btnCancelPaste");
const btnProcessPaste = document.getElementById("btnProcessPaste");

const previewModal = document.getElementById("previewModal");
const previewTitle = document.getElementById("previewTitle");
const previewContainer = document.getElementById("previewContainer");
const btnClosePreview = document.getElementById("btnClosePreview");
const btnCopyPreview = document.getElementById("btnCopyPreview");
const btnCopyPreviewText = document.getElementById("btnCopyPreviewText");
const btnDownloadPreview = document.getElementById("btnDownloadPreview");

const btnResetConfig = document.getElementById("btnResetConfig");
const queueTableBody = document.getElementById("queueTableBody");
const tableContainer = document.getElementById("tableContainer");
const queueToolbar = document.getElementById("queueToolbar");
const metricsBar = document.getElementById("metricsBar");
const emptyStateFeatures = document.getElementById("emptyStateFeatures");

const btnDownloadZip = document.getElementById("btnDownloadZip");
const btnDownloadMerged = document.getElementById("btnDownloadMerged");
const btnClearQueue = document.getElementById("btnClearQueue");

// Metric Displays
const valFilesCount = document.getElementById("valFilesCount");
const valOriginalTokens = document.getElementById("valOriginalTokens");
const valCleanedTokens = document.getElementById("valCleanedTokens");
const valTokenSavings = document.getElementById("valTokenSavings");

// Config Input Elements
const cfgFormat = document.getElementById("cfgFormat");
const cfgThoughts = document.getElementById("cfgThoughts");
const cfgRoleHeaders = document.getElementById("cfgRoleHeaders");
const cfgIncludeSys = document.getElementById("cfgIncludeSys");
const cfgMergeChunks = document.getElementById("cfgMergeChunks");
const cfgTurnNumbering = document.getElementById("cfgTurnNumbering");
const cfgPruneWhitespace = document.getElementById("cfgPruneWhitespace");
const cfgSliceTurns = document.getElementById("cfgSliceTurns");

/**
 * Hydrate sidebar inputs with stored config values.
 */
function syncConfigToUi(cfg) {
  cfgFormat.value = cfg.format;
  cfgThoughts.value = cfg.thoughtHandling;
  cfgRoleHeaders.checked = cfg.roleHeaders;
  cfgIncludeSys.checked = cfg.includeSystemPrompt;
  cfgMergeChunks.checked = cfg.mergeConsecutiveChunks;
  cfgTurnNumbering.checked = cfg.turnNumbering;
  cfgPruneWhitespace.checked = cfg.pruneWhitespace;
  cfgSliceTurns.value = cfg.sliceLastNTurns;
}

/**
 * Extract active sidebar options.
 */
function readConfigFromUi() {
  return {
    format: cfgFormat.value,
    thoughtHandling: cfgThoughts.value,
    roleHeaders: cfgRoleHeaders.checked,
    includeSystemPrompt: cfgIncludeSys.checked,
    mergeConsecutiveChunks: cfgMergeChunks.checked,
    turnNumbering: cfgTurnNumbering.checked,
    pruneWhitespace: cfgPruneWhitespace.checked,
    sliceLastNTurns: parseInt(cfgSliceTurns.value, 10) || 0
  };
}

/**
 * Reactively re-parse all existing items in memory when any option changes.
 */
function reprocessAllFiles() {
  if (processedFiles.length === 0) return;

  const extension = currentConfig.format === "markdown" ? ".md" : ".txt";

  processedFiles.forEach((item) => {
    if (!item.rawText) return;

    const baseName = item.originalName.replace(/\.[^/.]+$/, "");
    item.outputName = `${baseName}${extension}`;

    try {
      const parsed = parseAiStudio(item.rawText, currentConfig);
      item.text = parsed.text;
      item.stats = parsed.stats;
      item.status = "success";
      item.error = null;
    } catch (err) {
      item.text = "";
      item.stats = null;
      item.status = "error";
      item.error = err.message || "Parse failed";
    }
  });

  renderQueueTable();

  // If preview modal is open, live update its preview view
  if (activePreviewItem && previewModal.classList.contains("active")) {
    const freshItem = processedFiles.find((f) => f.id === activePreviewItem.id);
    if (freshItem) {
      activePreviewItem = freshItem;
      previewTitle.textContent = freshItem.outputName;
      previewContainer.textContent = freshItem.text;
    }
  }
}

// Config mutation listeners with instant reactive updates
[
  cfgFormat,
  cfgThoughts,
  cfgRoleHeaders,
  cfgIncludeSys,
  cfgMergeChunks,
  cfgTurnNumbering,
  cfgPruneWhitespace
].forEach((elem) => {
  elem.addEventListener("change", () => {
    currentConfig = saveConfig(readConfigFromUi());
    reprocessAllFiles();
  });
});

// Numeric input debounced handler
cfgSliceTurns.addEventListener("input", () => {
  currentConfig = saveConfig(readConfigFromUi());
  reprocessAllFiles();
});

btnResetConfig.addEventListener("click", () => {
  currentConfig = resetConfig();
  syncConfigToUi(currentConfig);
  reprocessAllFiles();
});

// Worker Message Routing
worker.onmessage = function (e) {
  const { type, results, buffer, error } = e.data;

  if (type === "PROCESS_COMPLETE") {
    processedFiles.push(...results);
    renderQueueTable();
  } else if (type === "ZIP_COMPLETE") {
    triggerBlobDownload(
      new Blob([buffer], { type: "application/zip" }),
      "aistudio_chats_export.zip"
    );
  } else if (type === "ERROR") {
    alert(`Worker Error: ${error}`);
  }
};

// Ingestion Handlers
btnBrowse.addEventListener("click", () => fileInput.click());
fileInput.addEventListener("change", (e) => {
  if (e.target.files?.length) {
    handleIncomingFiles(Array.from(e.target.files));
    fileInput.value = "";
  }
});

dropzone.addEventListener("dragover", (e) => {
  e.preventDefault();
  dropzone.classList.add("drag-active");
});

dropzone.addEventListener("dragleave", () => {
  dropzone.classList.remove("drag-active");
});

dropzone.addEventListener("drop", (e) => {
  e.preventDefault();
  dropzone.classList.remove("drag-active");
  if (e.dataTransfer.files?.length) {
    handleIncomingFiles(Array.from(e.dataTransfer.files));
  }
});

async function handleIncomingFiles(fileList) {
  const payloadFiles = [];

  for (const file of fileList) {
    const isZip = file.name.toLowerCase().endsWith(".zip");
    if (isZip) {
      const buffer = await file.arrayBuffer();
      payloadFiles.push({ name: file.name, buffer });
    } else {
      const text = await file.text();
      payloadFiles.push({ name: file.name, text });
    }
  }

  worker.postMessage({
    action: "PROCESS_FILES",
    payload: { files: payloadFiles, options: currentConfig }
  });
}

// Paste Modal Controls
btnOpenPaste.addEventListener("click", () => {
  pasteTextarea.value = "";
  pasteModal.classList.add("active");
});

btnClosePaste.addEventListener("click", () => pasteModal.classList.remove("active"));
btnCancelPaste.addEventListener("click", () => pasteModal.classList.remove("active"));

btnProcessPaste.addEventListener("click", () => {
  const text = pasteTextarea.value.trim();
  if (!text) return;

  const virtualFileName = `pasted_chat_${new Date()
    .toISOString()
    .slice(0, 19)
    .replace(/[:T]/g, "-")}.json`;

  worker.postMessage({
    action: "PROCESS_FILES",
    payload: {
      files: [{ name: virtualFileName, text }],
      options: currentConfig
    }
  });

  pasteModal.classList.remove("active");
});

// UI Rendering & Table Actions
function renderQueueTable() {
  queueTableBody.innerHTML = "";

  if (processedFiles.length === 0) {
    tableContainer.style.display = "none";
    queueToolbar.style.display = "none";
    metricsBar.style.display = "none";
    emptyStateFeatures.style.display = "grid";
    return;
  }

  tableContainer.style.display = "block";
  queueToolbar.style.display = "flex";
  metricsBar.style.display = "grid";
  emptyStateFeatures.style.display = "none";

  let sumOrigTokens = 0;
  let sumCleanTokens = 0;

  processedFiles.forEach((item) => {
    if (item.stats) {
      sumOrigTokens += item.stats.originalTokensEst;
      sumCleanTokens += item.stats.resultTokensEst;
    }

    const tr = document.createElement("tr");

    const tdName = document.createElement("td");
    tdName.style.fontFamily = "var(--font-mono)";
    tdName.textContent = item.outputName;

    const tdStatus = document.createElement("td");
    const badge = document.createElement("span");
    badge.className = `status-badge status-${item.status}`;
    badge.textContent = item.status === "success" ? "Ready" : "Error";
    if (item.error) badge.title = item.error;
    tdStatus.appendChild(badge);

    const tdTurns = document.createElement("td");
    tdTurns.textContent = item.stats ? item.stats.turnCount : "-";

    const tdTokens = document.createElement("td");
    tdTokens.style.fontFamily = "var(--font-mono)";
    tdTokens.textContent = item.stats
      ? item.stats.resultTokensEst.toLocaleString()
      : "-";

    const tdActions = document.createElement("td");
    tdActions.style.textAlign = "right";

    if (item.status === "success") {
      const btnPreview = document.createElement("button");
      btnPreview.className = "btn btn-secondary btn-xs";
      btnPreview.textContent = "Preview";
      btnPreview.onclick = () => openPreviewModal(item);

      const btnCopy = document.createElement("button");
      btnCopy.className = "btn btn-secondary btn-xs";
      btnCopy.textContent = "Copy";
      btnCopy.onclick = () => copyTextToClipboard(item.text, btnCopy);

      const btnDl = document.createElement("button");
      btnDl.className = "btn btn-primary btn-xs";
      btnDl.textContent = "Download";
      btnDl.onclick = () => triggerTextDownload(item.outputName, item.text);

      tdActions.append(btnPreview, " ", btnCopy, " ", btnDl);
    } else {
      tdActions.textContent = item.error || "Failed";
    }

    tr.append(tdName, tdStatus, tdTurns, tdTokens, tdActions);
    queueTableBody.appendChild(tr);
  });

  // Update Metrics
  valFilesCount.textContent = processedFiles.length;
  valOriginalTokens.textContent = sumOrigTokens.toLocaleString();
  valCleanedTokens.textContent = sumCleanTokens.toLocaleString();
  const overallSavings =
    sumOrigTokens > 0
      ? Math.max(0, Math.round(((sumOrigTokens - sumCleanTokens) / sumOrigTokens) * 100))
      : 0;
  valTokenSavings.textContent = `${overallSavings}%`;
}

// Preview Modal Logic
function openPreviewModal(item) {
  activePreviewItem = item;
  previewTitle.textContent = item.outputName;
  previewContainer.textContent = item.text;
  previewModal.classList.add("active");
}

btnClosePreview.addEventListener("click", () => {
  previewModal.classList.remove("active");
  activePreviewItem = null;
});

btnCopyPreview.addEventListener("click", () => {
  if (activePreviewItem) {
    copyTextToClipboard(activePreviewItem.text, null, btnCopyPreviewText);
  }
});

btnDownloadPreview.addEventListener("click", () => {
  if (activePreviewItem) {
    triggerTextDownload(activePreviewItem.outputName, activePreviewItem.text);
  }
});

// Batch Actions
btnClearQueue.addEventListener("click", () => {
  processedFiles = [];
  renderQueueTable();
});

btnDownloadZip.addEventListener("click", () => {
  const successFiles = processedFiles.filter((f) => f.status === "success");
  if (!successFiles.length) return;

  worker.postMessage({
    action: "BUILD_ZIP",
    payload: { files: successFiles }
  });
});

btnDownloadMerged.addEventListener("click", () => {
  const successFiles = processedFiles.filter((f) => f.status === "success");
  if (!successFiles.length) return;

  const ext = currentConfig.format === "markdown" ? ".md" : ".txt";
  const separator =
    currentConfig.format === "markdown"
      ? "\n\n---\n\n"
      : "\n\n========================================\n\n";

  const mergedText = successFiles
    .map((f) => {
      const header =
        currentConfig.format === "markdown"
          ? `# File: ${f.outputName}\n\n`
          : `=== FILE: ${f.outputName} ===\n\n`;
      return header + f.text;
    })
    .join(separator);

  triggerTextDownload(`merged_chats_export${ext}`, mergedText);
});

// Download & Clipboard Helpers
function triggerTextDownload(filename, text) {
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  triggerBlobDownload(blob, filename);
}

function triggerBlobDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function copyTextToClipboard(text, triggerBtn, targetTextSpan) {
  try {
    await navigator.clipboard.writeText(text);
    if (triggerBtn) {
      const orig = triggerBtn.textContent;
      triggerBtn.textContent = "Copied!";
      setTimeout(() => (triggerBtn.textContent = orig), 1500);
    }
    if (targetTextSpan) {
      const orig = targetTextSpan.textContent;
      targetTextSpan.textContent = "Copied!";
      setTimeout(() => (targetTextSpan.textContent = orig), 1500);
    }
  } catch (err) {
    alert("Clipboard copy failed: " + err);
  }
}

// Initial hydration
syncConfigToUi(currentConfig);
renderQueueTable();