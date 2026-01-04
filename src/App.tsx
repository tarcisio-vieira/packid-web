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

// scanner
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

  historyFromDate: string; // YYYY-MM-DD
  historyToDate: string; // YYYY-MM-DD
  onHistoryFromDateChange: (value: string) => void;
  onHistoryToDateChange: (value: string) => void;
}>;

// ============================
// Dialog do leitor (QR + barras)
// ============================
function CodeScannerDialog({ open, onClose, onScan }: CodeScannerDialogProps) {
  const { t } = useTranslation();

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{t("identify.scanTitle")}</DialogTitle>
      <DialogContent>
        <Box mt={1}>
          <Typography variant="body2" gutterBottom>
            {t("identify.scanHelp")}
          </Typography>

          <Box sx={{ mt: 2, width: "100%", maxWidth: 480, mx: "auto" }}>
            <Scanner
              formats={[
                "qr_code",
                "code_128",
                "code_39",
                "ean_13",
                "ean_8",
                "upc_a",
                "upc_e",
              ]}
              components={{ finder: true, torch: true, zoom: true }}
              onScan={(detectedCodes) => {
                if (!detectedCodes || detectedCodes.length === 0) return;
                const value = detectedCodes[0].rawValue;
                onScan(value);
                onClose();
              }}
              onError={(error) => {
                if (import.meta.env.DEV) console.error("Scanner error:", error);
              }}
            />
          </Box>
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
    <>
      <Container maxWidth="sm" sx={{ mt: 3, mb: 3 }}>
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

        {/* GRID LOGO ABAIXO DO BOX */}
        <Box sx={{ mt: 2 }}>
          <LabelHistoryGrid
            rows={historyRows}
            maxRows={10}
            fromDate={historyFromDate}
            toDate={historyToDate}
            onFromDateChange={onHistoryFromDateChange}
            onToDateChange={onHistoryToDateChange}
          />
        </Box>
      </Container>

      {/* Área de impressão – só aparece no @media print (index.css) */}
      <div id="print-area">
        <div id="print-package-code">{packageCode}</div>
        <div id="print-apartment">{apartment}</div>
      </div>
    </>
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

  // filtros do grid (YYYY-MM-DD)
  const [historyFromDate, setHistoryFromDate] = useState<string>("");
  const [historyToDate, setHistoryToDate] = useState<string>("");

  const seqRef = useRef(0);

  const toInstantStart = (dateStr: string): string | undefined => {
    if (!dateStr) return undefined;
    const d = new Date(`${dateStr}T00:00:00`);
    if (Number.isNaN(d.getTime())) return undefined;
    return d.toISOString();
  };

  // "to" exclusivo: soma 1 dia e usa 00:00
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
        toInstantEndExclusive(toDate)
      );

      // se veio uma resposta antiga (mudou filtro rápido), ignora
      if (mySeq !== seqRef.current) return;

      const sorted = [...items].sort(
        (a, b) =>
          new Date(b.arrivedAt).getTime() - new Date(a.arrivedAt).getTime()
      );

      setHistoryRows(
        sorted.map((it) => ({
          id: it.id,
          createdAt: it.arrivedAt,
          apartment: it.apartment,
          // mostra SEMPRE o que o usuário digitou (label_package_code)
          packageCode: it.labelPackageCode ?? it.packageCode,
          status: "saved",
        }))
      );
    },
    []
  );

  // primeiro carregamento do grid (do banco)
  useEffect(() => {
    refreshHistory(historyFromDate, historyToDate).catch((e) => {
      console.error(e);
      setSaveError(
        e instanceof Error ? e.message : "Erro ao carregar histórico."
      );
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleHistoryFromDateChange = (value: string) => {
    setHistoryFromDate(value);
    refreshHistory(value, historyToDate).catch((e) => {
      console.error(e);
      setSaveError(
        e instanceof Error ? e.message : "Erro ao carregar histórico."
      );
    });
  };

  const handleHistoryToDateChange = (value: string) => {
    setHistoryToDate(value);
    refreshHistory(historyFromDate, value).catch((e) => {
      console.error(e);
      setSaveError(
        e instanceof Error ? e.message : "Erro ao carregar histórico."
      );
    });
  };

  // imprimir + salvar + recarregar do banco (respeitando filtro atual)
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

    globalThis.print();

    savePromise
      .then(() => {
        setPackageCode("");
        setApartment("");
      })
      .catch((e) => {
        const msg =
          e instanceof Error ? e.message : "Falha ao registrar o pacote.";
        setSaveError(msg);
      })
      .finally(() => {
        refreshHistory(historyFromDate, historyToDate).catch(() => {});
        setSaving(false);
      });
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
      .catch((err) => {
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
