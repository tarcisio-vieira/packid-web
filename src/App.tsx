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

  historyFromDate: string; // YYYY-MM-DD
  historyToDate: string; // YYYY-MM-DD
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

function printSingleLabel(packageCode: string, apartment: string) {
  const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>PackID</title>
  <style>
    body {
      margin: 0;
      background: #fff;
    }

    #print-area {
      width: 100%;
      margin: 1mm;
      padding: 0;
      font-family: Arial, sans-serif;
      font-size: 20pt;
      text-align: center;
      line-height: 1.0;
    }

    #print-package-code {
      font-weight: normal;
      margin-bottom: 1mm;
    }

    #print-apartment {
      font-weight: bold;
      font-size: 30pt;
      margin-top: 0;
    }
  </style>
</head>
<body>
  <div id="print-area">
    <div id="print-package-code">${escapeHtml(packageCode)}</div>
    <div id="print-apartment">${escapeHtml(apartment)}</div>
  </div>
</body>
</html>`;

  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";
  document.body.appendChild(iframe);

  const doc = iframe.contentDocument || iframe.contentWindow?.document;
  const win = iframe.contentWindow;

  if (!doc || !win) {
    document.body.removeChild(iframe);
    return;
  }

  doc.open();
  doc.write(html);
  doc.close();

  setTimeout(() => {
    win.focus();
    win.print();

    setTimeout(() => {
      try {
        document.body.removeChild(iframe);
      } catch {
        // ignore
      }
    }, 800);
  }, 200);
}

// ============================
// Dialog do leitor (QR + barras)
// ============================
function CodeScannerDialog({ open, onClose, onScan }: CodeScannerDialogProps) {
  const { t } = useTranslation();
  const scannerRegionId = "packid-scanner-region";
  const scannerRef = useRef<{
    stop: () => Promise<void>;
    clear: () => void;
  } | null>(null);

  useEffect(() => {
    if (!open) {
      if (scannerRef.current) {
        scannerRef.current
          .stop()
          .catch(() => {})
          .finally(() => {
            try {
              scannerRef.current?.clear();
            } catch {
              // ignore
            }
            scannerRef.current = null;
          });
      }
      return;
    }

    let cancelled = false;
    let localScanner: { stop: () => Promise<void>; clear: () => void } | null =
      null;

    const startScanner = async () => {
      try {
        const { Html5Qrcode } = await import("html5-qrcode");

        if (cancelled) return;

        const scanner = new Html5Qrcode(scannerRegionId);
        localScanner = scanner;
        scannerRef.current = scanner;

        await scanner.start(
          { facingMode: "environment" },
          {
            fps: 10,
            qrbox: { width: 250, height: 120 },
            aspectRatio: 1.7778,
          },
          (decodedText: string) => {
            if (cancelled) return;

            onScan(decodedText);
            onClose();

            scanner
              .stop()
              .catch(() => {})
              .finally(() => {
                try {
                  scanner.clear();
                } catch {
                  // ignore
                }
                if (scannerRef.current === scanner) {
                  scannerRef.current = null;
                }
              });
          },
          () => {},
        );
      } catch (error) {
        console.error("Erro ao iniciar scanner:", error);
      }
    };

    const timer = window.setTimeout(() => {
      startScanner();
    }, 150);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);

      if (localScanner) {
        localScanner
          .stop()
          .catch(() => {})
          .finally(() => {
            try {
              localScanner?.clear();
            } catch {
              // ignore
            }
            if (scannerRef.current === localScanner) {
              scannerRef.current = null;
            }
          });
      }
    };
  }, [open, onClose, onScan]);

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{t("identify.scanTitle")}</DialogTitle>
      <DialogContent>
        <Box mt={1}>
          <Typography variant="body2" gutterBottom>
            {t("identify.scanHelp")}
          </Typography>

          <Box
            id={scannerRegionId}
            sx={{
              mt: 2,
              width: "100%",
              maxWidth: 480,
              mx: "auto",
              minHeight: 260,
            }}
          />
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
      if (canPrint && !saving) onRequestPrint();
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

    const savePromise = registerPackIdFromLabel({
      packageCode: pc,
      apartment: ap,
    });

    printSingleLabel(pc, ap);

    savePromise
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

    printSingleLabel(pc, ap);
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

    if (activeView === "identifyPackage") return <IdentifyPackageContainer />;

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
