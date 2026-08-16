import { createWorker, OEM, PSM } from "tesseract.js";

type TesseractWorker = Awaited<ReturnType<typeof createWorker>>;

export type DocumentCandidateType = "CPF" | "RG" | "CNH" | "DOCUMENTO";
export type DocumentCandidateQuality = "confirmed" | "review";
export type DocumentOcrHint = "cpf" | "identity" | "generic";

export type DocumentCandidate = {
  type: DocumentCandidateType;
  value: string;
  formatted: string;
  source: string;
  quality: DocumentCandidateQuality;
  note?: string;
};

export type OcrProgress = {
  status: string;
  progress: number;
};

export type DocumentOcrResult = {
  text: string;
  candidates: DocumentCandidate[];
};

type OcrImage = File | Blob | string | HTMLCanvasElement;
type PreparedImage = {
  normal: OcrImage;
  threshold?: HTMLCanvasElement;
};

let workerPromise: Promise<TesseractWorker> | null = null;
let activeProgressListener: ((progress: OcrProgress) => void) | null = null;
let progressOffset = 0;
let progressWeight = 1;

function emitProgress(status: string, progress: number): void {
  const bounded = Math.max(0, Math.min(1, progress));
  activeProgressListener?.({
    status,
    progress: Math.max(0, Math.min(1, progressOffset + bounded * progressWeight)),
  });
}

async function loadImageElement(image: OcrImage): Promise<{ element: HTMLImageElement; revoke?: () => void } | null> {
  if (typeof document === "undefined") return null;
  if (typeof HTMLCanvasElement !== "undefined" && image instanceof HTMLCanvasElement) return null;

  let sourceUrl: string | null = null;
  let revokeSourceUrl = false;

  if (typeof image === "string") {
    sourceUrl = image;
  } else if (image instanceof Blob) {
    sourceUrl = URL.createObjectURL(image);
    revokeSourceUrl = true;
  }

  if (!sourceUrl) return null;

  const element = new Image();
  element.decoding = "async";
  await new Promise<void>((resolve, reject) => {
    element.onload = () => resolve();
    element.onerror = () => reject(new Error("Não foi possível preparar a imagem para leitura."));
    element.src = sourceUrl!;
  });

  return {
    element,
    revoke: revokeSourceUrl ? () => URL.revokeObjectURL(sourceUrl!) : undefined,
  };
}

function thresholdCanvas(source: HTMLCanvasElement): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = source.width;
  canvas.height = source.height;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) return source;

  context.drawImage(source, 0, 0);
  const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;

  // Threshold relativamente alto para documentos antigos, fundos coloridos e fotos de celular.
  // A ideia é preservar os caracteres escuros e clarear o fundo da carteira/documento.
  for (let index = 0; index < data.length; index += 4) {
    const luminance = data[index] * 0.299 + data[index + 1] * 0.587 + data[index + 2] * 0.114;
    const value = luminance < 176 ? 0 : 255;
    data[index] = value;
    data[index + 1] = value;
    data[index + 2] = value;
  }
  context.putImageData(imageData, 0, 0);
  return canvas;
}

async function prepareImageForOcr(image: OcrImage): Promise<PreparedImage> {
  if (typeof document === "undefined") return { normal: image };
  if (typeof HTMLCanvasElement !== "undefined" && image instanceof HTMLCanvasElement) {
    return { normal: image, threshold: thresholdCanvas(image) };
  }

  const loaded = await loadImageElement(image);
  if (!loaded) return { normal: image };

  try {
    const { element } = loaded;
    const originalWidth = element.naturalWidth || element.width;
    const originalHeight = element.naturalHeight || element.height;
    if (!originalWidth || !originalHeight) return { normal: image };

    const longestSide = Math.max(originalWidth, originalHeight);
    // Documentos pequenos/antigos precisam de mais pixels para o Tesseract separar os dígitos.
    const targetLongestSide = Math.min(3000, Math.max(2200, longestSide));
    const scale = targetLongestSide / longestSide;

    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(originalWidth * scale));
    canvas.height = Math.max(1, Math.round(originalHeight * scale));

    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) return { normal: image };

    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";
    context.filter = "grayscale(1) contrast(1.55) brightness(1.05)";
    context.drawImage(element, 0, 0, canvas.width, canvas.height);

    return { normal: canvas, threshold: thresholdCanvas(canvas) };
  } finally {
    loaded.revoke?.();
  }
}

function getWorker(): Promise<TesseractWorker> {
  if (!workerPromise) {
    workerPromise = createWorker("por", OEM.LSTM_ONLY, {
      logger: (message) => {
        const progress = typeof message.progress === "number" ? message.progress : 0;
        emitProgress(String(message.status ?? ""), progress);
      },
      errorHandler: (error) => {
        console.error("Falha no worker OCR:", error);
      },
    });
  }
  return workerPromise;
}

async function recognizePass(worker: TesseractWorker, image: OcrImage, psm: PSM): Promise<string> {
  await worker.setParameters({
    tessedit_pageseg_mode: psm,
    preserve_interword_spaces: "1",
  });
  const { data } = await worker.recognize(image, { rotateAuto: true });
  return data.text ?? "";
}

export async function recognizeDocumentText(
  image: OcrImage,
  onProgress?: (progress: OcrProgress) => void,
  hint: DocumentOcrHint = "generic",
): Promise<string> {
  activeProgressListener = onProgress ?? null;
  try {
    const worker = await getWorker();
    onProgress?.({ status: "Preparando imagem...", progress: 0 });
    const prepared = await prepareImageForOcr(image);

    progressOffset = 0;
    progressWeight = prepared.threshold ? 0.58 : 1;
    const firstText = await recognizePass(worker, prepared.normal, PSM.SPARSE_TEXT);
    const firstCandidates = extractDocumentCandidates(firstText, hint);
    const hasConfirmedCandidate = firstCandidates.some((candidate) => candidate.quality === "confirmed");

    // Se a primeira leitura já encontrou um documento confiável, não duplica o tempo da portaria.
    if (!prepared.threshold || hasConfirmedCandidate) {
      onProgress?.({ status: "Leitura concluída.", progress: 1 });
      return firstText;
    }

    // Segunda leitura: imagem preto/branco e segmentação automática. Ela é especialmente útil
    // para CNH/RG antigos, documentos plastificados e imagens com fundo colorido ou grades.
    progressOffset = 0.58;
    progressWeight = 0.42;
    onProgress?.({ status: "Reforçando leitura dos números...", progress: 0.58 });
    const secondText = await recognizePass(worker, prepared.threshold, PSM.AUTO);
    onProgress?.({ status: "Leitura concluída.", progress: 1 });
    return `${firstText}\n${secondText}`;
  } finally {
    progressOffset = 0;
    progressWeight = 1;
    activeProgressListener = null;
  }
}

export async function recognizeDocument(
  image: OcrImage,
  onProgress?: (progress: OcrProgress) => void,
  hint: DocumentOcrHint = "generic",
): Promise<DocumentOcrResult> {
  const text = await recognizeDocumentText(image, onProgress, hint);
  return { text, candidates: extractDocumentCandidates(text, hint) };
}

export async function terminateDocumentOcr(): Promise<void> {
  if (!workerPromise) return;
  try {
    const worker = await workerPromise;
    await worker.terminate();
  } finally {
    workerPromise = null;
    activeProgressListener = null;
    progressOffset = 0;
    progressWeight = 1;
  }
}

export function isValidCpf(value: string): boolean {
  const cpf = value.replace(/\D/g, "");
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;

  const calculateDigit = (base: string, initialWeight: number) => {
    const sum = base
      .split("")
      .reduce((acc, digit, index) => acc + Number(digit) * (initialWeight - index), 0);
    const remainder = (sum * 10) % 11;
    return remainder === 10 ? 0 : remainder;
  };

  const first = calculateDigit(cpf.slice(0, 9), 10);
  const second = calculateDigit(cpf.slice(0, 10), 11);
  return first === Number(cpf[9]) && second === Number(cpf[10]);
}

export function formatCpf(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length !== 11) return value;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
}

function normalizeNumberLike(value: string): string {
  return value
    .toUpperCase()
    .replace(/[OQ]/g, "0")
    .replace(/[IL|]/g, "1")
    .replace(/S/g, "5")
    .replace(/B/g, "8")
    .replace(/Z/g, "2")
    .replace(/[^0-9X]/g, "");
}

function normalizeLabel(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase();
}

function addCandidate(items: DocumentCandidate[], candidate: DocumentCandidate): void {
  const key = `${candidate.type}:${candidate.value}`;
  const existingIndex = items.findIndex((item) => `${item.type}:${item.value}` === key);
  if (existingIndex < 0) {
    items.push(candidate);
    return;
  }

  // Mantém a versão mais confiável do mesmo número caso ele apareça em dois passes do OCR.
  if (items[existingIndex].quality === "review" && candidate.quality === "confirmed") {
    items[existingIndex] = candidate;
  }
}

function numberLikeChunks(value: string): Array<{ raw: string; normalized: string }> {
  const matches = value.match(/(?<![A-Z])[0-9OQILSBZ|X][0-9OQILSBZ|X.\-\/\s]{5,24}/gi) ?? [];
  const result: Array<{ raw: string; normalized: string }> = [];

  for (const raw of matches) {
    const normalized = normalizeNumberLike(raw);
    if (normalized.length >= 6 && normalized.length <= 14) {
      result.push({ raw: raw.trim(), normalized });
      continue;
    }

    // Quando o OCR juntou campos vizinhos, preserva janelas de 11 dígitos para CPF/CNH.
    const digitsOnly = normalized.replace(/X/g, "");
    if (digitsOnly.length > 14) {
      for (let index = 0; index <= digitsOnly.length - 11; index += 1) {
        result.push({ raw: raw.trim(), normalized: digitsOnly.slice(index, index + 11) });
      }
    }
  }
  return result;
}

function addCpfCandidate(items: DocumentCandidate[], digits: string, source: string, labeled: boolean): void {
  if (!/^\d{11}$/.test(digits)) return;
  const valid = isValidCpf(digits);
  if (!valid && !labeled) return;

  addCandidate(items, {
    type: "CPF",
    value: digits,
    formatted: formatCpf(digits),
    source,
    quality: valid ? "confirmed" : "review",
    note: valid ? undefined : "Possível CPF lido próximo ao campo CPF, mas os dígitos verificadores não conferem. Confira na imagem antes de usar.",
  });
}

function extractCpfCandidates(text: string, items: DocumentCandidate[]): void {
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);

  // Primeiro encontra CPFs formatados ou bem separados em qualquer ponto da leitura.
  const formattedMatches = text.match(/[0-9OQILSBZ]{3}\s*[.\-]?\s*[0-9OQILSBZ]{3}\s*[.\-]?\s*[0-9OQILSBZ]{3}\s*[-]?\s*[0-9OQILSBZ]{2}/gi) ?? [];
  for (const match of formattedMatches) {
    const digits = normalizeNumberLike(match).replace(/X/g, "");
    addCpfCandidate(items, digits, match, isValidCpf(digits));
  }

  for (let index = 0; index < lines.length; index += 1) {
    const label = normalizeLabel(lines[index]);
    const compactLabel = label.replace(/[^A-Z]/g, "");
    const hasCpfLabel = compactLabel.includes("CPF") || /\bC[PFR][FPR]\b/.test(label);
    if (!hasCpfLabel) continue;

    const context = [lines[index], lines[index + 1] ?? "", lines[index + 2] ?? ""].join(" ").trim();
    for (const chunk of numberLikeChunks(context)) {
      const digits = chunk.normalized.replace(/X/g, "");
      if (digits.length === 11) addCpfCandidate(items, digits, context, true);
    }
  }

  // CPF válido é seguro mesmo quando o OCR não conseguiu ler a palavra CPF.
  for (const chunk of numberLikeChunks(text)) {
    const digits = chunk.normalized.replace(/X/g, "");
    if (digits.length === 11 && isValidCpf(digits)) addCpfCandidate(items, digits, chunk.raw, false);
  }
}

function extractRgCandidates(text: string, items: DocumentCandidate[]): void {
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);

  for (let index = 0; index < lines.length; index += 1) {
    const label = normalizeLabel(lines[index]);
    const hasRgLabel = /\bRG\b/.test(label)
      || label.includes("REGISTRO GERAL")
      || label.includes("IDENTIDADE")
      || label.includes("DOC IDENT")
      || label.includes("DOCUMENTO DE IDENTIDADE");
    if (!hasRgLabel) continue;

    const context = [lines[index], lines[index + 1] ?? "", lines[index + 2] ?? ""].join(" ").trim();
    for (const chunk of numberLikeChunks(context)) {
      const value = chunk.normalized;
      if (value.length < 6 || value.length > 12) continue;
      if (/^\d{11}$/.test(value) && isValidCpf(value)) continue;
      addCandidate(items, {
        type: "RG",
        value,
        formatted: value,
        source: context,
        quality: "review",
        note: "Número identificado próximo ao campo de identidade/RG. Confira na imagem antes de usar.",
      });
    }
  }
}

function extractCnhCandidates(text: string, items: DocumentCandidate[], allowGenericFallback = true): void {
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);

  for (let index = 0; index < lines.length; index += 1) {
    const label = normalizeLabel(lines[index]);
    const hasCnhContext = label.includes("CNH")
      || /\bREGISTRO\b/.test(label)
      || label.includes("N REGISTRO")
      || label.includes("Nº REGISTRO")
      || label.includes("CARTEIRA NACIONAL DE HABILITACAO");
    if (!hasCnhContext) continue;

    const context = [lines[index], lines[index + 1] ?? "", lines[index + 2] ?? ""].join(" ").trim();
    for (const chunk of numberLikeChunks(context)) {
      const value = chunk.normalized.replace(/X/g, "");
      if (value.length < 9 || value.length > 12) continue;
      if (value.length === 11 && isValidCpf(value)) continue;
      addCandidate(items, {
        type: "CNH",
        value,
        formatted: value,
        source: context,
        quality: "review",
        note: "Possível número de registro da CNH. Confira na imagem antes de usar.",
      });
    }
  }

  // CNHs antigas frequentemente deixam o número de registro destacado sem a palavra REGISTRO
  // na mesma linha. Se ainda não achamos CNH, oferece sequências de 11 dígitos como sugestão.
  if (allowGenericFallback && !items.some((candidate) => candidate.type === "CNH")) {
    for (const chunk of numberLikeChunks(text)) {
      const value = chunk.normalized.replace(/X/g, "");
      if (!/^\d{11}$/.test(value) || isValidCpf(value)) continue;
      addCandidate(items, {
        type: "CNH",
        value,
        formatted: value,
        source: chunk.raw,
        quality: "review",
        note: "Possível número de documento/registro encontrado. Confira se corresponde à CNH antes de usar.",
      });
    }
  }
}

export function extractDocumentCandidates(
  text: string,
  hint: DocumentOcrHint = "generic",
): DocumentCandidate[] {
  const items: DocumentCandidate[] = [];
  extractCpfCandidates(text, items);
  extractRgCandidates(text, items);
  extractCnhCandidates(text, items, hint !== "cpf");

  // Quando a foto já tem um propósito conhecido, usa esse contexto como fallback. Isso é
  // importante quando o OCR consegue ler os dígitos, mas perde palavras pequenas como CPF/RG.
  if (hint === "cpf" && !items.some((candidate) => candidate.type === "CPF")) {
    for (const chunk of numberLikeChunks(text)) {
      const digits = chunk.normalized.replace(/X/g, "");
      if (!/^\d{11}$/.test(digits)) continue;
      addCandidate(items, {
        type: "CPF",
        value: digits,
        formatted: formatCpf(digits),
        source: chunk.raw,
        quality: isValidCpf(digits) ? "confirmed" : "review",
        note: isValidCpf(digits)
          ? undefined
          : "Possível CPF encontrado na foto do CPF. Os dígitos verificadores não conferem; confirme visualmente antes de usar.",
      });
    }
  }

  if (hint === "identity" && !items.some((candidate) => candidate.type === "RG" || candidate.type === "CNH")) {
    for (const chunk of numberLikeChunks(text)) {
      const value = chunk.normalized;
      if (value.length < 7 || value.length > 12) continue;
      if (/^\d{11}$/.test(value) && isValidCpf(value)) continue;
      addCandidate(items, {
        type: value.length >= 9 ? "CNH" : "RG",
        value,
        formatted: value,
        source: chunk.raw,
        quality: "review",
        note: "Possível número encontrado na foto de identidade/CNH. Confira visualmente antes de usar.",
      });
    }
  }

  // Para documentos diferentes de CPF/RG/CNH, ainda oferece números encontrados
  // para seleção manual. Não preenche automaticamente porque o tipo não pode ser validado.
  if (hint === "generic" && items.length === 0) {
    for (const chunk of numberLikeChunks(text).slice(0, 5)) {
      addCandidate(items, {
        type: "DOCUMENTO",
        value: chunk.normalized,
        formatted: chunk.normalized,
        source: chunk.raw,
        quality: "review",
        note: "Possível número de documento. Confira visualmente antes de usar.",
      });
    }
  }

  const priority: Record<DocumentCandidateType, number> = { CPF: 0, RG: 1, CNH: 2, DOCUMENTO: 3 };
  const qualityPriority: Record<DocumentCandidateQuality, number> = { confirmed: 0, review: 1 };
  return items.sort((a, b) => {
    const qualityDiff = qualityPriority[a.quality] - qualityPriority[b.quality];
    return qualityDiff !== 0 ? qualityDiff : priority[a.type] - priority[b.type];
  });
}
