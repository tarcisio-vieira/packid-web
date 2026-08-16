import { useEffect, useState, useRef, useCallback } from "react";
import type { KeyboardEvent, RefObject } from "react";
import { useTranslation } from "react-i18next";
import {
  fetchCurrentUser,
  getLoginUrl,
  getLogoutUrl,
  registerPackIdFromLabel,
  fetchRecentPackIds,
  fetchPackIdLabelPrintSettings,
  userFriendlyError,
} from "./api";
import type { User } from "./api";

import LabelHistoryGrid, {
  type LabelHistoryRow,
} from "./components/LabelHistoryGrid";
import RegistryScreen from "./components/RegistryScreen";
import SettingsScreen from "./components/SettingsScreen";

import {
  Alert,
  AppBar,
  Box,
  Toolbar,
  IconButton,
  Typography,
  Button,
  Drawer,
  List,
  ListItemButton,
  ListItemText,
  Container,
  Paper,
  Snackbar,
  Stack,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  InputAdornment,
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import QrCodeScannerIcon from "@mui/icons-material/QrCodeScanner";
import { Scanner } from "@yudiel/react-qr-scanner";

// ----- Tipos -----
type ActiveView = "home" | "identifyPackage" | "registry" | "settings";

type CodeScannerDialogProps = Readonly<{
  open: boolean;
  onClose: () => void;
  onScan: (text: string) => void;
}>;

type IdentifyPackageScreenProps = Readonly<{
  packageCode: string;
  apartment: string;
  onPackageCodeChange: (value: string) => void;
  onApartmentChange: (value: string) => void;
  onRequestPrint: () => void;
  onOpenScanner: () => void;

  saving: boolean;
  saveError: string | null;

  historyRows: LabelHistoryRow[];

  historyFromDate: string;
  historyToDate: string;
  onHistoryFromDateChange: (value: string) => void;
  onHistoryToDateChange: (value: string) => void;

  onPrintHistoryRow: (row: LabelHistoryRow) => void;

  packageCodeInputRef: RefObject<HTMLInputElement | null>;
  embedded?: boolean;
}>;

function escapeHtml(str: string): string {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function splitUnit(raw: string): {
  block: string;
  apartment: string;
  unitLine: string;
} {
  const cleaned = raw.trim().replace(/\s+/g, " ");
  const parts = cleaned.split(/[\s/\-]+/).filter(Boolean);

  if (parts.length >= 2) {
    return {
      block: parts[0],
      apartment: parts.slice(1).join(" "),
      unitLine: `Bloco ${parts[0]} / Apto ${parts.slice(1).join(" ")}`,
    };
  }

  return {
    block: "",
    apartment: cleaned,
    unitLine: cleaned,
  };
}

function fitTextFontSize(
  text: string,
  options: {
    maxWidthPx: number;
    maxFontPx: number;
    minFontPx: number;
    fontWeight?: string;
    fontFamily?: string;
  },
): number {
  const value = (text || "").trim();

  if (!value) {
    return options.maxFontPx;
  }

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  if (!ctx) {
    return options.minFontPx;
  }

  const fontWeight = options.fontWeight ?? "700";
  const fontFamily = options.fontFamily ?? "Arial, Helvetica, sans-serif";

  for (let size = options.maxFontPx; size >= options.minFontPx; size -= 1) {
    ctx.font = `${fontWeight} ${size}px ${fontFamily}`;
    const width = ctx.measureText(value).width;

    if (width <= options.maxWidthPx) {
      return size;
    }
  }

  return options.minFontPx;
}

function extractPageBlockAndApartment(raw: string): {
  page: string;
  block: string;
  apartment: string;
  valid: boolean;
} {
  const compact = raw.trim().replace(/\s+/g, "");

  if (!/^\d{7,8}$/.test(compact)) {
    return { page: "", block: "", apartment: "", valid: false };
  }

  const page = compact.slice(0, 3);
  const block = compact.slice(3, 4);
  const apartment = compact.slice(4);
  const pageNumber = Number(page);
  const floor = Number(apartment.slice(0, -2));

  const valid =
    pageNumber >= 1 &&
    pageNumber <= 999 &&
    /^[1-4]$/.test(block) &&
    /^\d{3,4}$/.test(apartment) &&
    floor >= 1 &&
    floor <= 12;

  return { page, block, apartment, valid };
}

function fitWrappedTextFontSize(
  text: string,
  options: {
    maxWidthPx: number;
    maxHeightPx: number;
    maxFontPx: number;
    minFontPx: number;
    fontWeight?: string;
    fontFamily?: string;
    lineHeight?: number;
  },
): number {
  const value = (text || "").trim();

  if (!value) {
    return options.maxFontPx;
  }

  const probe = document.createElement("div");
  probe.style.position = "fixed";
  probe.style.left = "-10000px";
  probe.style.top = "-10000px";
  probe.style.visibility = "hidden";
  probe.style.pointerEvents = "none";
  probe.style.boxSizing = "border-box";
  probe.style.padding = "0";
  probe.style.margin = "0";
  probe.style.border = "0";
  probe.style.whiteSpace = "normal";
  probe.style.overflowWrap = "anywhere";
  probe.style.wordBreak = "break-word";
  probe.style.width = `${options.maxWidthPx}px`;

  document.body.appendChild(probe);

  try {
    const fontWeight = options.fontWeight ?? "700";
    const fontFamily = options.fontFamily ?? "Arial, Helvetica, sans-serif";
    const lineHeight = options.lineHeight ?? 1.02;

    for (let size = options.maxFontPx; size >= options.minFontPx; size -= 1) {
      probe.style.font = `${fontWeight} ${size}px ${fontFamily}`;
      probe.style.lineHeight = String(lineHeight);
      probe.textContent = value;

      if (
        probe.scrollWidth <= options.maxWidthPx + 2 &&
        probe.scrollHeight <= options.maxHeightPx
      ) {
        return size;
      }
    }

    return options.minFontPx;
  } finally {
    document.body.removeChild(probe);
  }
}

function printSingleLabel(
  packageCode: string,
  apartment: string,
  residentName?: string,
  onAfterPrint?: () => void,
  pageNumber?: string,
  copies = 2,
) {
  const now = new Date();

  const printedAt = new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(now);

  const unit = splitUnit(apartment);

  const unitHighlight = (() => {
    if (unit.block && unit.apartment) {
      return `${unit.block}${unit.apartment}`.replace(/[^0-9A-Za-z]/g, "");
    }

    return apartment.replace(/[\s/\-]+/g, "").trim();
  })();

  const printedName = (residentName || "").trim();
  const printedPage = (pageNumber || "").trim();
  const printCopies = Math.min(2, Math.max(1, Math.floor(copies)));
  const pageHeightMm = printCopies === 1 ? 50 : 100;
  const stripGapMm = printCopies === 1 ? 0 : 12;

  const unitFontSize = fitTextFontSize(unitHighlight, {
    maxWidthPx: 220,
    maxFontPx: 42,
    minFontPx: 20,
    fontWeight: "800",
  });

  const packageFontSize = fitWrappedTextFontSize(packageCode, {
    maxWidthPx: 230,
    maxHeightPx: 18,
    maxFontPx: 12,
    minFontPx: 7,
    fontWeight: "700",
    lineHeight: 1.0,
  });

  const recipientFontSize = fitWrappedTextFontSize(printedName, {
    maxWidthPx: 340,
    maxHeightPx: 16,
    maxFontPx: 10,
    minFontPx: 6,
    fontWeight: "700",
    lineHeight: 1.0,
  });

  const labelHtml = Array.from({ length: printCopies })
    .map(
      () => `
  <div class="sheet">
    <div class="top">
      <div class="unit-box">
        <div class="unit-label">UNIDADE</div>
        <div class="unit-value" style="font-size:${unitFontSize}px;">
          ${escapeHtml(unitHighlight)}
        </div>
      </div>

      <div class="right-top">
        <div class="protocol-row">
          <strong>Protocolado em:&nbsp;&nbsp;&nbsp;</strong> ${escapeHtml(printedAt)}
        </div>

        <div class="package-row">
          <div class="package-label">Código do pacote:</div>
          <div class="package-value" style="font-size:${packageFontSize}px;">
            ${escapeHtml(packageCode)}
          </div>
        </div>
      </div>
    </div>

    <div class="bottom">
    <div class="recipient-row">
        <div class="recipient-main">
          <div class="recipient-label">Destinatário:</div>
          <div class="recipient-value" style="${
            printedName ? `font-size:${recipientFontSize}px;` : ""
          }">
            ${printedName ? escapeHtml(printedName) : "&nbsp;"}
          </div>
        </div>

      <div class="recipient-page">
        ${
          printedPage
            ? `
              <span class="recipient-page-label">Página:</span>
              <span class="recipient-page-value">${escapeHtml(printedPage)}</span>
            `
            : "&nbsp;"
        }
      </div>
      </div>

      <div class="bottom-last-row">
        <div class="received-box">
          <span>Recebido em: ____/____/______</span>
        </div>

        <div class="signature-box">
          <span>Assinatura:</span>
        </div>
      </div>
    </div>
  </div>
`,
    )
    .join("");

  const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Etiqueta</title>
<style>
  @page {
    size: 100mm ${pageHeightMm}mm;
    margin: 0;
  }

  * {
    box-sizing: border-box;
  }

  html,
  body {
    margin: 0;
    padding: 0;
    width: 100mm;
    min-height: ${pageHeightMm}mm;
    background: #fff;
    font-family: Arial, Helvetica, sans-serif;
    color: #000;
    overflow: visible;
  }

  body {
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  .label-strip {
    width: 100mm;
    height: ${pageHeightMm}mm;
    padding: 4mm 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: flex-start;
    gap: ${stripGapMm}mm;
    overflow: hidden;
  }

  .sheet {
    width: 94mm;
    height: 40mm;
    display: grid;
    grid-template-rows: 13mm 27mm;
    margin: 0 auto;
    overflow: hidden;
    break-after: auto;
    page-break-after: auto;
  }

  .top {
    display: grid;
    grid-template-columns: 43% 57%;
    height: 13mm;
    min-height: 0;
    overflow: hidden;
  }

  .unit-box {
    border: 0.22mm solid #000;
    border-right: 0;
    border-bottom: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 0.8mm 1mm;
    overflow: hidden;
  }

  .unit-label {
    font-size: 6.2pt;
    font-weight: 700;
    letter-spacing: 0.45mm;
    line-height: 1;
    margin: 0 0 0.5mm 0;
    white-space: nowrap;
  }

  .unit-value {
    width: 100%;
    text-align: center;
    font-weight: 800;
    line-height: 1;
    white-space: nowrap;
    overflow: hidden;
  }

  .right-top {
    border: 0.22mm solid #000;
    border-bottom: 0;
    display: grid;
    grid-template-rows: 5mm 8mm;
    overflow: hidden;
    min-height: 0;
  }

  .protocol-row {
    border-bottom: 0.22mm solid #000;
    display: flex;
    align-items: center;
    padding: 0 1.1mm;
    font-size: 6.8pt;
    line-height: 1;
    white-space: nowrap;
    overflow: hidden;
    text-align: left;
  }

  .protocol-row strong {
    margin-right: 0.8mm;
  }

  .package-row {
    display: flex;
    flex-direction: column;
    justify-content: flex-start;
    padding: 0.55mm 1.1mm 0.35mm;
    overflow: hidden;
    min-height: 0;
    text-align: left;
  }

  .package-label {
    font-size: 5.4pt;
    font-weight: 700;
    line-height: 1;
    margin: 0 0 0.35mm 0;
    white-space: nowrap;
  }

  .package-value {
    font-weight: 300;
    line-height: 1;
    white-space: normal;
    overflow-wrap: anywhere;
    word-break: break-word;
    display: block;
    height: 4.8mm;
    max-height: 4.8mm;
    overflow: hidden;
    text-align: left;
  }

  .bottom {
    border-left: 0.22mm solid #000;
    border-right: 0.22mm solid #000;
    border-top: 0.22mm solid #000;
    border-bottom: 0.22mm solid #000;
    display: grid;
    grid-template-rows: 10mm 17mm;
    overflow: hidden;
    min-height: 0;
  }

    .recipient-row {
    border-bottom: 0.22mm solid #000;
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: flex-start;
    padding: 1.2mm 1.2mm 0.6mm;
    column-gap: 2mm;
    overflow: hidden;
    min-height: 0;
    text-align: left;
  }

  .recipient-main {
    min-width: 0;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    justify-content: flex-start;
    gap: 0.45mm;
    overflow: hidden;
  }

  .recipient-label {
    font-size: 5.2pt;
    font-weight: 700;
    line-height: 1;
    margin: 0;
    white-space: nowrap;
    display: block;
  }

  .recipient-value {
    width: 100%;
    font-weight: 700;
    line-height: 1;
    white-space: normal;
    overflow-wrap: anywhere;
    word-break: break-word;
    display: block;
    min-height: 0;
    overflow: hidden;
    text-align: left;
  }

    .recipient-page {
    display: flex;
    align-items: baseline;
    justify-content: flex-end;
    gap: 0.8mm;
    white-space: nowrap;
    text-align: right;
    align-self: flex-start;
    padding-top: 0.2mm;
    max-width: 28mm;
    overflow: hidden;
  }

  .recipient-page-label {
    font-size: 5pt;
    font-weight: 400;
    line-height: 1;
    white-space: nowrap;
  }

  .recipient-page-value {
    font-size: 16pt;
    font-weight: 800;
    line-height: 1;
    white-space: nowrap;
  }
    
  .bottom-last-row {
    display: grid;
    grid-template-columns: 42% 58%;
    height: 100%;
    min-height: 0;
    overflow: hidden;
  }

  .received-box {
    border-right: 0.22mm solid #000;
    padding: 0.8mm 1mm;
    display: flex;
    align-items: flex-end;
    justify-content: flex-start;
    height: 100%;
    min-height: 0;
    overflow: hidden;
    white-space: nowrap;
    text-align: left;
  }

  .received-box span {
    font-size: 6.4pt;
    font-weight: 700;
    line-height: 1;
  }

  .signature-box {
    padding: 0.8mm 1mm;
    display: flex;
    align-items: flex-start;
    justify-content: flex-start;
    height: 100%;
    min-height: 0;
    overflow: hidden;
    white-space: nowrap;
    text-align: left;
  }

  .signature-box span {
    font-size: 6.4pt;
    font-weight: 700;
    line-height: 1;
  }
</style>
</head>
<body>
  <div class="label-strip">
    ${labelHtml}
  </div>
</body>
</html>`;

  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "1px";
  iframe.style.height = "1px";
  iframe.style.opacity = "0";
  iframe.style.border = "0";

  document.body.appendChild(iframe);

  const doc = iframe.contentDocument || iframe.contentWindow?.document;
  const win = iframe.contentWindow;

  if (!doc || !win) {
    document.body.removeChild(iframe);
    return;
  }

  let printed = false;
  let finished = false;
  let canFinish = false;
  let focusPollInterval: number | null = null;
  let safetyTimeout: number | null = null;
  let minWaitTimeout: number | null = null;

  const finishAfterPrint = () => {
    if (finished || !canFinish) return;
    finished = true;

    removeListeners();

    setTimeout(() => {
      onAfterPrint?.();
      cleanup();
    }, 120);
  };

  const handleWindowFocus = () => {
    finishAfterPrint();
  };

  const handleVisibilityChange = () => {
    if (!document.hidden) {
      finishAfterPrint();
    }
  };

  const removeListeners = () => {
    window.removeEventListener("focus", handleWindowFocus);
    document.removeEventListener("visibilitychange", handleVisibilityChange);
  };

  const cleanup = () => {
    if (focusPollInterval !== null) {
      window.clearInterval(focusPollInterval);
      focusPollInterval = null;
    }

    if (safetyTimeout !== null) {
      window.clearTimeout(safetyTimeout);
      safetyTimeout = null;
    }

    if (minWaitTimeout !== null) {
      window.clearTimeout(minWaitTimeout);
      minWaitTimeout = null;
    }

    removeListeners();

    setTimeout(() => {
      try {
        document.body.removeChild(iframe);
      } catch {
        // ignore
      }
    }, 300);
  };

  const startWatchingFocusReturn = () => {
    window.addEventListener("focus", handleWindowFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    minWaitTimeout = window.setTimeout(() => {
      canFinish = true;

      if (document.hasFocus() && !document.hidden) {
        finishAfterPrint();
      }
    }, 800);

    focusPollInterval = window.setInterval(() => {
      if (canFinish && document.hasFocus() && !document.hidden) {
        finishAfterPrint();
      }
    }, 150);

    safetyTimeout = window.setTimeout(() => {
      canFinish = true;
      finishAfterPrint();
    }, 12000);
  };

  const runPrint = () => {
    if (printed) return;
    printed = true;

    setTimeout(() => {
      try {
        startWatchingFocusReturn();
        win.focus();
        win.print();
      } catch {
        canFinish = true;
        finishAfterPrint();
      }
    }, 350);
  };

  iframe.onload = runPrint;

  doc.open();
  doc.write(html);
  doc.close();

  setTimeout(runPrint, 700);
}

// ============================
// Dialog do leitor (QR + barras)
// ============================
function CodeScannerDialog({ open, onClose, onScan }: CodeScannerDialogProps) {
  const { t } = useTranslation();
  const [paused, setPaused] = useState(false);
  const [scannerError, setScannerError] = useState<string | null>(null);

  const handleDetected = (
    detectedCodes: Array<{ rawValue?: string | null }>,
  ) => {
    const value = detectedCodes?.[0]?.rawValue?.trim();

    if (!value || paused) return;

    setPaused(true);
    onScan(value);
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{t("identify.scanTitle")}</DialogTitle>

      <DialogContent>
        <Box mt={1}>
          <Typography variant="body2" gutterBottom>
            {t("identify.scanHelp")}
          </Typography>

          {scannerError && (
            <Alert severity="warning" sx={{ mt: 1 }} onClose={() => setScannerError(null)}>
              {scannerError}
            </Alert>
          )}

          {open && (
            <Box
              sx={{
                mt: 2,
                width: "100%",
                maxWidth: 480,
                mx: "auto",
                overflow: "hidden",
                borderRadius: 2,
              }}
            >
              <Scanner
                onScan={handleDetected}
                onError={(error) => {
                  console.error("Erro ao iniciar scanner:", error);
                  setScannerError("Não foi possível acessar a câmera. Verifique a permissão do navegador ou digite o código manualmente.");
                }}
                paused={paused}
                scanDelay={800}
                allowMultiple={false}
                constraints={{
                  facingMode: "environment",
                }}
                formats={[
                  "qr_code",
                  "code_128",
                  "code_39",
                  "code_93",
                  "codabar",
                  "ean_13",
                  "ean_8",
                  "upc_a",
                  "upc_e",
                  "itf",
                ]}
                components={{
                  finder: true,
                  torch: true,
                  zoom: true,
                  onOff: true,
                }}
                styles={{
                  container: {
                    width: "100%",
                  },
                  video: {
                    width: "100%",
                    height: "auto",
                    objectFit: "cover",
                  },
                }}
              />
            </Box>
          )}
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>{t("common.close")}</Button>
      </DialogActions>
    </Dialog>
  );
}

// ============
// Tela inicial
// ============
function HomeScreen() {
  useEffect(() => {
    const focusInputById = (id: string) => {
      const input = document.getElementById(id) as HTMLInputElement | null;
      if (!input) return;

      input.focus();
      input.select();
    };

    const handleShortcut = (event: globalThis.KeyboardEvent) => {
      if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) {
        return;
      }

      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;

      // Enquanto houver um modal aberto, as setas pertencem ao próprio modal.
      if (document.querySelector('[role="dialog"]')) return;

      // Não interfere com campos normais, textarea ou editores.
      // A exceção são os dois campos que participam diretamente do atalho.
      const target = event.target as HTMLElement | null;
      const tagName = target?.tagName?.toLowerCase();
      const isEditable =
        tagName === "input" ||
        tagName === "textarea" ||
        tagName === "select" ||
        Boolean(target?.isContentEditable);
      const isShortcutField =
        target?.id === "registry-search-input" || target?.id === "package-code-input";

      if (isEditable && !isShortcutField) return;

      if (event.key === "ArrowLeft") {
        event.preventDefault();
        focusInputById("registry-search-input");
        return;
      }

      event.preventDefault();
      focusInputById("package-code-input");
    };

    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, []);

  return (
    <Box
      sx={{
        width: "100%",
        maxWidth: 1900,
        mx: "auto",
        display: "grid",
        gridTemplateColumns: { xs: "1fr", lg: "minmax(0, 7fr) minmax(340px, 3fr)" },
        gap: 2,
        alignItems: "start",
      }}
    >
      <Box
        sx={{
          gridColumn: "1 / -1",
          display: { xs: "none", md: "flex" },
          justifyContent: "flex-end",
          px: 0.5,
          mb: -1,
        }}
      >
        <Typography variant="caption" sx={{ opacity: 0.7 }}>
          Atalhos: ← pesquisa da gestão · → recebimento de encomendas
        </Typography>
      </Box>

      <Box sx={{ minWidth: 0 }}>
        <RegistryScreen embedded />
      </Box>

      <Box
        sx={{
          minWidth: 0,
          position: { lg: "sticky" },
          top: { lg: 16 },
          alignSelf: "start",
        }}
      >
        <IdentifyPackageContainer embedded />
      </Box>
    </Box>
  );
}

// =====================================
// Tela de identificação (controlada)
// =====================================
function IdentifyPackageScreen({
  packageCode,
  apartment,
  onPackageCodeChange,
  onApartmentChange,
  onRequestPrint,
  onOpenScanner,
  saving,
  saveError,
  historyRows,
  historyFromDate,
  historyToDate,
  onHistoryFromDateChange,
  onHistoryToDateChange,
  onPrintHistoryRow,
  packageCodeInputRef,
  embedded = false,
}: IdentifyPackageScreenProps) {
  const { t } = useTranslation();
  const apartmentRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    packageCodeInputRef.current?.focus();
    packageCodeInputRef.current?.select();
  }, [packageCodeInputRef]);

  const canPrint = packageCode.trim().length > 0 && apartment.trim().length > 0;

  const handlePackageCodeKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      apartmentRef.current?.focus();
    }
  };

  const handleApartmentKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();

      if (canPrint && !saving) {
        onRequestPrint();
      }
    }
  };

  return (
    <Container
      maxWidth={embedded ? false : "lg"}
      disableGutters={embedded}
      sx={{ mt: embedded ? 0 : 3, mb: embedded ? 0 : 3, minWidth: 0 }}
    >
      <Paper elevation={2} sx={{ p: embedded ? 1.5 : { xs: 2, sm: 3 } }}>
        <Typography variant={embedded ? "h6" : "h5"} gutterBottom>
          {t("identify.title")}
        </Typography>

        <Typography variant="body2" gutterBottom>
          {t("identify.description")}
        </Typography>

        <Stack spacing={2} sx={{ mt: 2 }}>
          <TextField
            label={t("identify.packageCode")}
            variant="outlined"
            value={packageCode}
            onChange={(e) => onPackageCodeChange(e.target.value)}
            inputRef={packageCodeInputRef}
            onKeyDown={handlePackageCodeKeyDown}
            fullWidth
            autoComplete="off"
            inputProps={{ id: "package-code-input", "aria-keyshortcuts": "ArrowRight" }}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    aria-label={t("identify.scanButton")}
                    onClick={onOpenScanner}
                    edge="end"
                  >
                    <QrCodeScannerIcon />
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />

          <TextField
            label={t("identify.apartment")}
            variant="outlined"
            value={apartment}
            onChange={(e) =>
              onApartmentChange(e.target.value.replace(/\D/g, "").slice(0, 8))
            }
            inputRef={apartmentRef}
            onKeyDown={handleApartmentKeyDown}
            fullWidth
            autoComplete="off"
            helperText={t("identify.unitCodeHelp")}
            inputProps={{ inputMode: "numeric", maxLength: 8 }}
          />

          {saveError && (
            <Alert severity="error">
              {saveError}
            </Alert>
          )}

          <Box display="flex" justifyContent="flex-end" mt={1}>
            <Button
              variant="contained"
              color="primary"
              onClick={onRequestPrint}
              disabled={!canPrint || saving}
            >
              {saving ? "PROCESSANDO..." : t("identify.printLabel")}
            </Button>
          </Box>
        </Stack>
      </Paper>

      <Box sx={{ mt: 2 }}>
        <LabelHistoryGrid
          rows={historyRows}
          maxRows={embedded ? 5 : 10}
          fromDate={historyFromDate}
          toDate={historyToDate}
          onFromDateChange={onHistoryFromDateChange}
          onToDateChange={onHistoryToDateChange}
          onPrintRow={onPrintHistoryRow}
          compact={embedded}
        />
      </Box>
    </Container>
  );
}

// =========================================
// Container da tela de etiquetas + scanner
// =========================================
function IdentifyPackageContainer({ embedded = false }: Readonly<{ embedded?: boolean }> = {}) {
  const [packageCode, setPackageCode] = useState<string>("");
  const [apartment, setApartment] = useState<string>("");
  const [scannerOpen, setScannerOpen] = useState<boolean>(false);
  const [labelCopies, setLabelCopies] = useState<1 | 2>(2);

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [historyRows, setHistoryRows] = useState<LabelHistoryRow[]>([]);

  const [historyFromDate, setHistoryFromDate] = useState<string>("");
  const [historyToDate, setHistoryToDate] = useState<string>("");

  const packageCodeInputRef = useRef<HTMLInputElement | null>(null);
  const seqRef = useRef(0);

  useEffect(() => {
    let cancelled = false;

    fetchPackIdLabelPrintSettings()
      .then((settings) => {
        if (!cancelled) setLabelCopies(settings.copies === 1 ? 1 : 2);
      })
      .catch((error) => {
        console.error("Não foi possível carregar a configuração de impressão do PackID:", error);
        if (!cancelled) setLabelCopies(2);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const focusPackageCodeInput = useCallback(() => {
    const tryFocus = () => {
      const input = packageCodeInputRef.current;

      if (!input) return false;

      input.focus();
      input.select();

      return document.activeElement === input;
    };

    if (tryFocus()) return;

    setTimeout(tryFocus, 50);
    setTimeout(tryFocus, 150);
    setTimeout(tryFocus, 300);
    setTimeout(tryFocus, 500);
  }, []);

  const toInstantStart = (dateStr: string): string | undefined => {
    if (!dateStr) return undefined;

    const d = new Date(`${dateStr}T00:00:00`);

    if (Number.isNaN(d.getTime())) return undefined;

    return d.toISOString();
  };

  const toInstantEndExclusive = (dateStr: string): string | undefined => {
    if (!dateStr) return undefined;

    const d = new Date(`${dateStr}T00:00:00`);

    if (Number.isNaN(d.getTime())) return undefined;

    d.setDate(d.getDate() + 1);
    return d.toISOString();
  };

  const refreshHistory = useCallback(
    async (fromDate: string, toDate: string) => {
      const mySeq = ++seqRef.current;

      const items = await fetchRecentPackIds(
        200,
        toInstantStart(fromDate),
        toInstantEndExclusive(toDate),
      );

      if (mySeq !== seqRef.current) return;

      const sorted = [...items].sort(
        (a, b) =>
          new Date(b.arrivedAt).getTime() - new Date(a.arrivedAt).getTime(),
      );

      setHistoryRows(
        sorted.map((it) => ({
          id: it.id,
          createdAt: it.arrivedAt,
          bookPage: it.bookPage ?? "",
          block: it.block ?? "",
          apartment: it.apartment,
          residentFullName: it.residentFullName ?? "",
          packageCode: it.labelPackageCode ?? it.packageCode,
          observations: it.observations ?? "",
          status: "saved",
        })),
      );
    },
    [],
  );

  useEffect(() => {
    refreshHistory(historyFromDate, historyToDate).catch((e) => {
      console.error(e);
      setSaveError(
        userFriendlyError(e, "Erro ao carregar histórico."),
      );
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleHistoryFromDateChange = (value: string) => {
    setHistoryFromDate(value);

    refreshHistory(value, historyToDate).catch((e) => {
      console.error(e);
      setSaveError(
        userFriendlyError(e, "Erro ao carregar histórico."),
      );
    });
  };

  const handleHistoryToDateChange = (value: string) => {
    setHistoryToDate(value);

    refreshHistory(historyFromDate, value).catch((e) => {
      console.error(e);
      setSaveError(
        userFriendlyError(e, "Erro ao carregar histórico."),
      );
    });
  };

  const handlePrint = () => {
    const pc = packageCode.trim();
    const rawApartment = apartment.trim();

    if (!pc || !rawApartment || saving) return;

    const { page, block, apartment: apartmentToSave, valid } =
      extractPageBlockAndApartment(rawApartment);

    if (!valid) {
      setSaveError(
        "Informe: página (001-999) + bloco (1-4) + apartamento (1º ao 12º andar). Ex.: 0992608 ou 10141203.",
      );
      return;
    }

    setSaving(true);
    setSaveError(null);
    setSaveSuccess(null);

    try {
      printSingleLabel(
        pc,
        `${block}${apartmentToSave}`,
        undefined,
        focusPackageCodeInput,
        page,
        labelCopies,
      );
    } catch (e: unknown) {
      console.error(e);
      setSaveError(
        userFriendlyError(e, "Falha ao gerar a impressão."),
      );
      setSaving(false);
      return;
    }

    registerPackIdFromLabel({
      packageCode: pc,
      apartment: apartmentToSave,
      block,
      bookPage: page,
    })
      .then(() => {
        setPackageCode("");
        setApartment("");
        setSaveSuccess("Encomenda registrada com sucesso e etiqueta enviada para impressão.");
      })
      .catch((e: unknown) => {
        const msg =
          userFriendlyError(e, "Falha ao registrar o pacote.");
        setSaveError(msg);
      })
      .finally(() => {
        refreshHistory(historyFromDate, historyToDate).catch(() => {});
        setSaving(false);
      });
  };

  const handlePrintHistoryRow = (row: LabelHistoryRow) => {
    const pc = row.packageCode.trim();
    const ap = row.apartment.trim();
    const block = (row.block || "").trim();

    if (!pc || !ap) return;

    try {
      printSingleLabel(
        pc,
        `${block}${ap}`,
        row.residentFullName,
        focusPackageCodeInput,
        row.bookPage,
        labelCopies,
      );
    } catch (e) {
      console.error(e);
      setSaveError(
        userFriendlyError(e, "Falha ao reimprimir a etiqueta."),
      );
    }
  };

  const handleScan = (text: string) => {
    setPackageCode(text);
    setScannerOpen(false);
  };

  return (
    <>
      <IdentifyPackageScreen
        packageCode={packageCode}
        apartment={apartment}
        onPackageCodeChange={setPackageCode}
        onApartmentChange={setApartment}
        onRequestPrint={handlePrint}
        onOpenScanner={() => setScannerOpen(true)}
        saving={saving}
        saveError={saveError}
        historyRows={historyRows}
        historyFromDate={historyFromDate}
        historyToDate={historyToDate}
        onHistoryFromDateChange={handleHistoryFromDateChange}
        onHistoryToDateChange={handleHistoryToDateChange}
        onPrintHistoryRow={handlePrintHistoryRow}
        packageCodeInputRef={packageCodeInputRef}
        embedded={embedded}
      />

      <CodeScannerDialog
        key={scannerOpen ? "scanner-open" : "scanner-closed"}
        open={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onScan={handleScan}
      />

      <Snackbar
        open={Boolean(saveError)}
        autoHideDuration={9000}
        onClose={() => setSaveError(null)}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert severity="error" variant="filled" onClose={() => setSaveError(null)} sx={{ width: "100%" }}>
          {saveError}
        </Alert>
      </Snackbar>

      <Snackbar
        open={Boolean(saveSuccess)}
        autoHideDuration={4500}
        onClose={() => setSaveSuccess(null)}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert severity="success" variant="filled" onClose={() => setSaveSuccess(null)} sx={{ width: "100%" }}>
          {saveSuccess}
        </Alert>
      </Snackbar>
    </>
  );
}

// ===============
// App principal
// ===============
function App() {
  const { t } = useTranslation();

  const [user, setUser] = useState<User | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const initialQueryParams = new URLSearchParams(globalThis.location.search);
  const initialView: ActiveView = initialQueryParams.get("view") === "settings" ? "settings" : "home";
  const [activeView, setActiveView] = useState<ActiveView>(initialView);
  const initialGoogleConnectionStatus: "success" | "error" | null =
    initialQueryParams.get("googleConnected") === "1"
      ? "success"
      : initialQueryParams.get("googleError") === "1"
        ? "error"
        : null;
  const [googleConnectionStatus, setGoogleConnectionStatus] = useState<
    "success" | "error" | null
  >(initialGoogleConnectionStatus);

  useEffect(() => {
    fetchCurrentUser()
      .then(setUser)
      .catch((err: unknown) => {
        console.error(err);
        setError(userFriendlyError(err, "Falha ao verificar a autenticação."));
        setUser(null);
      });
  }, []);

  const handleLogin = () => {
    globalThis.location.href = getLoginUrl();
  };

  const handleLogout = () => {
    globalThis.location.href = getLogoutUrl();
  };

  const handleGoogleConnectionHandled = useCallback(() => {
    setGoogleConnectionStatus(null);
    const cleanUrl = `${globalThis.location.pathname}${globalThis.location.hash || ""}`;
    globalThis.history.replaceState({}, document.title, cleanUrl);
  }, []);

  const toggleDrawer = (open: boolean) => () => {
    setDrawerOpen(open);
  };

  const renderContent = () => {
    if (user === undefined) {
      return (
        <Typography variant="body1" align="center" sx={{ mt: 4 }}>
          {t("auth.loading")}
        </Typography>
      );
    }

    if (user === null) {
      return (
        <Container maxWidth="sm">
          <Paper
            elevation={3}
            sx={{ p: { xs: 3, sm: 4 }, mt: { xs: 6, sm: 8 } }}
          >
            <Stack spacing={2} alignItems="center">
              <Typography variant="h3" component="h1" gutterBottom>
                VSGI
              </Typography>

              <Typography variant="body1" align="center">
                {t("auth.description")}
              </Typography>

              {error && (
                <Alert severity="error" sx={{ width: "100%" }}>
                  {error}
                </Alert>
              )}

              <Button variant="contained" color="primary" onClick={handleLogin}>
                {t("auth.signInButton")}
              </Button>
            </Stack>
          </Paper>
        </Container>
      );
    }

    if (activeView === "identifyPackage") {
      return <IdentifyPackageContainer />;
    }

    if (activeView === "registry") {
      return <RegistryScreen />;
    }

    if (activeView === "settings") {
      return (
        <SettingsScreen
          googleConnectionStatus={googleConnectionStatus}
          onGoogleConnectionHandled={handleGoogleConnectionHandled}
        />
      );
    }

    return <HomeScreen />;
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        bgcolor: "background.default",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <AppBar position="static" color="default" elevation={1}>
        <Toolbar>
          <IconButton
            edge="start"
            color="inherit"
            aria-label="Abrir menu"
            onClick={toggleDrawer(true)}
            sx={{ mr: 1 }}
          >
            <MenuIcon />
          </IconButton>

          <Typography
            variant="h6"
            component="div"
            sx={{ flexGrow: 1, fontSize: { xs: "1rem", sm: "1.25rem" } }}
          >
            {t("app.title")}
          </Typography>

          {user && (
            <Button color="inherit" onClick={handleLogout} sx={{ ml: 1 }}>
              {t("header.signOut")}
            </Button>
          )}
        </Toolbar>
      </AppBar>

      <Drawer anchor="left" open={drawerOpen} onClose={toggleDrawer(false)}>
        <Box
          sx={{ width: 260 }}
          component="nav"
          aria-label="Navegação principal"
          onClick={toggleDrawer(false)}
          onKeyDown={toggleDrawer(false)}
        >
          <Box sx={{ p: 2 }}>
            <Typography variant="h6">{t("menu.main")}</Typography>
          </Box>

          <List component="nav" aria-label="Opções do menu principal">
            <ListItemButton onClick={() => setActiveView("home")}>
              <ListItemText primary={t("menu.home")} />
            </ListItemButton>

            <ListItemButton onClick={() => setActiveView("identifyPackage")}>
              <ListItemText primary={t("menu.identifyPackage")} />
            </ListItemButton>

            <ListItemButton onClick={() => setActiveView("registry")}>
              <ListItemText primary={t("menu.registry")} />
            </ListItemButton>

            {user?.role?.toUpperCase() === "ADMIN" && (
              <ListItemButton onClick={() => setActiveView("settings")}>
                <ListItemText primary={t("menu.settings")} />
              </ListItemButton>
            )}
          </List>
        </Box>
      </Drawer>

      <Box sx={{ p: { xs: 1, sm: 2 }, flex: 1 }}>{renderContent()}</Box>

      {user && (
        <Box
          component="footer"
          sx={{
            p: 2,
            textAlign: "right",
            fontSize: "0.875rem",
            opacity: 0.8,
          }}
        >
          {user.email}
        </Box>
      )}
    </Box>
  );
}

export default App;
