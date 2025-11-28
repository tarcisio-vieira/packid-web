import { useEffect, useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import { fetchCurrentUser, getLoginUrl, getLogoutUrl } from "./api";
import type { User } from "./api";

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

// >>> NOVO: scanner React
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

          <Box
            sx={{
              mt: 2,
              width: "100%",
              maxWidth: 480,
              mx: "auto",
            }}
          >
            <Scanner
              // limita os formatos mais comuns (QR + códigos de barras)
              formats={[
                "qr_code",
                "code_128",
                "code_39",
                "ean_13",
                "ean_8",
                "upc_a",
                "upc_e",
              ]}
              components={{
                finder: true,
                torch: true,
                zoom: true,
              }}
              onScan={(detectedCodes) => {
                if (!detectedCodes || detectedCodes.length === 0) return;

                const value = detectedCodes[0].rawValue;
                onScan(value);
                onClose(); // fecha o diálogo ao ler
              }}
              onError={(error) => {
                if (import.meta.env.DEV) {
                  console.error("Scanner error:", error);
                }
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
}: IdentifyPackageScreenProps) {
  const { t } = useTranslation();
  const packageCodeRef = useRef<HTMLInputElement | null>(null);
  const apartmentRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    packageCodeRef.current?.focus();
  }, []);

  const canPrint = packageCode.trim().length > 0 && apartment.trim().length > 0;

  const handlePackageCodeKeyDown = (
    event: React.KeyboardEvent<HTMLInputElement>
  ) => {
    if (event.key === "Enter") {
      event.preventDefault();
      apartmentRef.current?.focus();
    }
  };

  const handleApartmentKeyDown = (
    event: React.KeyboardEvent<HTMLInputElement>
  ) => {
    if (event.key === "Enter") {
      event.preventDefault();
      if (canPrint) onRequestPrint();
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

            <Box display="flex" justifyContent="flex-end" mt={1}>
              <Button
                variant="contained"
                color="primary"
                onClick={onRequestPrint}
                disabled={!canPrint}
              >
                {t("identify.printLabel")}
              </Button>
            </Box>
          </Stack>
        </Paper>
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

  const handlePrint = () => {
    if (!packageCode.trim() || !apartment.trim()) return;

    globalThis.print();

    setPackageCode("");
    setApartment("");
    // foco volta pelo useEffect da tela de identificação
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
    // ainda carregando /me
    if (user === undefined) {
      return (
        <Typography variant="body1" align="center" sx={{ mt: 4 }}>
          {t("auth.loading")}
        </Typography>
      );
    }

    // não autenticado
    if (user === null) {
      return (
        <Container maxWidth="sm">
          <Paper
            elevation={3}
            sx={{
              p: { xs: 3, sm: 4 },
              mt: { xs: 6, sm: 8 },
            }}
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

    // autenticado
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
      {/* Barra superior */}
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

          <FormControl
            size="small"
            sx={{ mr: 2, minWidth: 110 }}
            aria-label="Language selection"
          >
            <Select
              value={language}
              onChange={handleChangeLanguage}
              displayEmpty
              inputProps={{ "aria-label": "Language selection" }}
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

      {/* Menu lateral */}
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

      {/* Conteúdo principal */}
      <Box sx={{ p: { xs: 1, sm: 2 }, flex: 1 }}>{renderContent()}</Box>

      {/* Rodapé */}
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
