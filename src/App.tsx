import { useEffect, useState, useRef, useCallback } from "react";
import type { KeyboardEvent } from "react";
import { useTranslation } from "react-i18next";
import {
  fetchCurrentUser,
  getLoginUrl,
  getLogoutUrl,
  registerPackIdFromLabel,
  fetchRecentPackIds,
} from "./api";
import type { User } from "./api";

import LabelHistoryGrid, {
  type LabelHistoryRow,
} from "./components/LabelHistoryGrid";

import {
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
  Stack,
  TextField,
  FormControl,
  Select,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  InputAdornment,
} from "@mui/material";
import type { SelectChangeEvent } from "@mui/material/Select";

import MenuIcon from "@mui/icons-material/Menu";
import QrCodeScannerIcon from "@mui/icons-material/QrCodeScanner";
import { Scanner } from "@yudiel/react-qr-scanner";

// ----- Tipos -----
type ActiveView = "home" | "identifyPackage";

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

  const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Etiqueta</title>
<style>
  @page {
    size: 100mm 50mm;
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
    height: 50mm;
    background: #fff;
    font-family: Arial, Helvetica, sans-serif;
    color: #000;
    overflow: hidden;
  }

  body {
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
    padding: 5mm 2mm;
  }

  .sheet {
    width: 96mm;
    height: 40mm;
    display: grid;
    grid-template-rows: 14mm 26mm;
  }

  .top {
    display: grid;
    grid-template-columns: 43% 57%;
    height: 14mm;
  }

  .unit-box {
    border: 0.22mm solid #000;
    border-right: 0;
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
    margin-bottom: 0.5mm;
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
    display: grid;
    grid-template-rows: 5.5mm 8.5mm;
    overflow: hidden;
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
  }

  .protocol-row strong {
    margin-right: 0.8mm;
  }

  .package-row {
    display: grid;
    grid-template-rows: auto 1fr;
    padding: 0.45mm 1.1mm 0.35mm;
    overflow: hidden;
    min-height: 0;
  }

  .package-label {
    font-size: 5.4pt;
    font-weight: 700;
    line-height: 1;
    margin-bottom: 0.35mm;
    white-space: nowrap;
  }

  .package-value {
    font-weight: 700;
    line-height: 1;
    white-space: normal;
    overflow-wrap: anywhere;
    word-break: break-word;
    display: block;
    height: 4.8mm;
    max-height: 4.8mm;
    overflow: hidden;
  }

  .bottom {
    border-left: 0.22mm solid #000;
    border-right: 0.22mm solid #000;
    border-bottom: 0.22mm solid #000;
    display: grid;
    grid-template-rows: 10mm 16mm;
    overflow: hidden;
  }

  .recipient-row {
    border-bottom: 0.22mm solid #000;
    padding: 2mm 1.1mm 0.25mm;
    display: grid;
    grid-template-rows: auto 1fr;
    overflow: hidden;
    min-height: 0;
  }

  .recipient-label {
    font-size: 5pt;
    font-weight: 700;
    line-height: 1;
    margin-bottom: 0.45mm;
    white-space: nowrap;
  }

  .recipient-value {
    font-weight: 700;
    line-height: 1;
    white-space: normal;
    overflow-wrap: anywhere;
    word-break: break-word;
    display: block;
    height: 3.9mm;
    max-height: 3.9mm;
    overflow: hidden;
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
    padding: 0.65mm 1mm;
    display: flex;
    align-items: flex-end;
    justify-content: flex-start;
    height: 100%;
    min-height: 0;
    overflow: hidden;
    white-space: nowrap;
  }

  .received-box span {
    font-size: 6.4pt;
    font-weight: 700;
    line-height: 1;
  }

  .signature-box {
    padding: 0.65mm 1mm;
    display: flex;
    align-items: flex-start;
    justify-content: flex-start;
    height: 100%;
    min-height: 0;
    overflow: hidden;
    white-space: nowrap;
  }

  .signature-box span {
    font-size: 6.4pt;
    font-weight: 700;
    line-height: 1;
  }
</style>
</head>
<body>
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
        <div class="recipient-label">Destinatário:</div>
        <div class="recipient-value" style="${
          printedName ? `font-size:${recipientFontSize}px;` : ""
        }">
          ${printedName ? escapeHtml(printedName) : "&nbsp;"}
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

  const cleanup = () => {
    setTimeout(() => {
      try {
        document.body.removeChild(iframe);
      } catch {
        // ignore
      }
    }, 1200);
  };

  const runPrint = () => {
    if (printed) return;
    printed = true;

    setTimeout(() => {
      try {
        win.focus();
        win.print();
      } finally {
        cleanup();
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

  useEffect(() => {
    if (!open) {
      setPaused(false);
    }
  }, [open]);

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
        <Button
          onClick={() => {
            setPaused(false);
            onClose();
          }}
        >
          {t("common.close")}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ============
// Tela inicial
// ============
function HomeScreen() {
  const { t } = useTranslation();

  return (
    <Container maxWidth="md" sx={{ mt: 3, mb: 3 }}>
      <Paper elevation={2} sx={{ p: { xs: 2, sm: 3 } }}>
        <Typography variant="h5" gutterBottom>
          {t("home.title")}
        </Typography>
        <Typography variant="body1" gutterBottom>
          {t("home.welcome")}
        </Typography>
        <Typography variant="body2">{t("home.useMenu")}</Typography>
      </Paper>
    </Container>
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
}: IdentifyPackageScreenProps) {
  const { t } = useTranslation();
  const packageCodeRef = useRef<HTMLInputElement | null>(null);
  const apartmentRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    packageCodeRef.current?.focus();
  }, []);

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
    <Container maxWidth="lg" sx={{ mt: 3, mb: 3 }}>
      <Paper elevation={2} sx={{ p: { xs: 2, sm: 3 } }}>
        <Typography variant="h5" gutterBottom>
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
            inputRef={packageCodeRef}
            onKeyDown={handlePackageCodeKeyDown}
            fullWidth
            autoComplete="off"
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
            onChange={(e) => onApartmentChange(e.target.value)}
            inputRef={apartmentRef}
            onKeyDown={handleApartmentKeyDown}
            fullWidth
            autoComplete="off"
          />

          {saveError && (
            <Typography variant="body2" color="error">
              {saveError}
            </Typography>
          )}

          <Box display="flex" justifyContent="flex-end" mt={1}>
            <Button
              variant="contained"
              color="primary"
              onClick={onRequestPrint}
              disabled={!canPrint || saving}
            >
              {t("identify.printLabel")}
            </Button>
          </Box>
        </Stack>
      </Paper>

      <Box sx={{ mt: 2 }}>
        <LabelHistoryGrid
          rows={historyRows}
          maxRows={10}
          fromDate={historyFromDate}
          toDate={historyToDate}
          onFromDateChange={onHistoryFromDateChange}
          onToDateChange={onHistoryToDateChange}
          onPrintRow={onPrintHistoryRow}
        />
      </Box>
    </Container>
  );
}

// =========================================
// Container da tela de etiquetas + scanner
// =========================================
function IdentifyPackageContainer() {
  const [packageCode, setPackageCode] = useState<string>("");
  const [apartment, setApartment] = useState<string>("");
  const [scannerOpen, setScannerOpen] = useState<boolean>(false);

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [historyRows, setHistoryRows] = useState<LabelHistoryRow[]>([]);

  const [historyFromDate, setHistoryFromDate] = useState<string>("");
  const [historyToDate, setHistoryToDate] = useState<string>("");

  const seqRef = useRef(0);

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
        e instanceof Error ? e.message : "Erro ao carregar histórico.",
      );
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleHistoryFromDateChange = (value: string) => {
    setHistoryFromDate(value);
    refreshHistory(value, historyToDate).catch((e) => {
      console.error(e);
      setSaveError(
        e instanceof Error ? e.message : "Erro ao carregar histórico.",
      );
    });
  };

  const handleHistoryToDateChange = (value: string) => {
    setHistoryToDate(value);
    refreshHistory(historyFromDate, value).catch((e) => {
      console.error(e);
      setSaveError(
        e instanceof Error ? e.message : "Erro ao carregar histórico.",
      );
    });
  };

  const handlePrint = () => {
    const pc = packageCode.trim();
    const ap = apartment.trim();

    if (!pc || !ap || saving) return;

    setSaving(true);
    setSaveError(null);

    try {
      printSingleLabel(pc, ap);
    } catch (e: unknown) {
      console.error(e);
      setSaveError(
        e instanceof Error ? e.message : "Falha ao gerar a impressão.",
      );
      setSaving(false);
      return;
    }

    registerPackIdFromLabel({
      packageCode: pc,
      apartment: ap,
    })
      .then(() => {
        setPackageCode("");
        setApartment("");
      })
      .catch((e: unknown) => {
        const msg =
          e instanceof Error ? e.message : "Falha ao registrar o pacote.";
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

    if (!pc || !ap) return;

    try {
      printSingleLabel(pc, ap, row.residentFullName);
    } catch (e) {
      console.error(e);
      setSaveError(
        e instanceof Error ? e.message : "Falha ao reimprimir a etiqueta.",
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
      />

      <CodeScannerDialog
        open={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onScan={handleScan}
      />
    </>
  );
}

// ===============
// App principal
// ===============
function App() {
  const { t, i18n } = useTranslation();

  const [user, setUser] = useState<User | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [activeView, setActiveView] = useState<ActiveView>("home");
  const [language, setLanguage] = useState<string>(i18n.language || "en");

  useEffect(() => {
    fetchCurrentUser()
      .then(setUser)
      .catch((err: unknown) => {
        console.error(err);
        setError("Authentication check failed.");
        setUser(null);
      });
  }, []);

  const handleLogin = () => {
    globalThis.location.href = getLoginUrl();
  };

  const handleLogout = () => {
    globalThis.location.href = getLogoutUrl();
  };

  const toggleDrawer = (open: boolean) => () => {
    setDrawerOpen(open);
  };

  const handleChangeLanguage = (event: SelectChangeEvent<string>) => {
    const lang = event.target.value;
    setLanguage(lang);
    i18n.changeLanguage(lang);
    localStorage.setItem("lang", lang);
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
                PackID
              </Typography>
              <Typography variant="body1" align="center">
                {t("auth.description")}
              </Typography>
              {error && (
                <Typography variant="body2" color="error">
                  {error}
                </Typography>
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
            aria-label="open drawer"
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

          <FormControl size="small" sx={{ mr: 2, minWidth: 110 }}>
            <Select
              value={language}
              onChange={handleChangeLanguage}
              displayEmpty
            >
              <MenuItem value="en">English</MenuItem>
              <MenuItem value="pt">Português</MenuItem>
              <MenuItem value="es">Español</MenuItem>
            </Select>
          </FormControl>

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
          aria-label="Main navigation"
          onClick={toggleDrawer(false)}
          onKeyDown={toggleDrawer(false)}
        >
          <Box sx={{ p: 2 }}>
            <Typography variant="h6">{t("menu.main")}</Typography>
          </Box>

          <List component="nav" aria-label="Main menu options">
            <ListItemButton onClick={() => setActiveView("home")}>
              <ListItemText primary={t("menu.home")} />
            </ListItemButton>

            <ListItemButton onClick={() => setActiveView("identifyPackage")}>
              <ListItemText primary={t("menu.identifyPackage")} />
            </ListItemButton>
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
