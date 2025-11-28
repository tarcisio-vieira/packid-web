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
  useTheme,
  useMediaQuery,
} from "@mui/material";
import type { SelectChangeEvent } from "@mui/material/Select";

import MenuIcon from "@mui/icons-material/Menu";
import QrCodeScannerIcon from "@mui/icons-material/QrCodeScanner";
import CloseIcon from "@mui/icons-material/Close";

import { Html5QrcodeScanner } from "html5-qrcode";

type ActiveView = "home" | "identifyPackage";

function HomeScreen() {
  const { t } = useTranslation();

  return (
    <Container
      maxWidth="md"
      sx={{ mt: { xs: 2, md: 4 }, mb: { xs: 4, md: 6 } }}
    >
      <Paper elevation={2} sx={{ p: { xs: 2, md: 3 } }}>
        <Typography variant="h4" gutterBottom>
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

function IdentifyPackageScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const [packageCode, setPackageCode] = useState<string>("");
  const [apartment, setApartment] = useState<string>("");

  // Scanner de câmera (QR / código de barras)
  const [scannerOpen, setScannerOpen] = useState(false);
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  // Refs para controle de foco
  const packageCodeRef = useRef<HTMLInputElement | null>(null);
  const apartmentRef = useRef<HTMLInputElement | null>(null);

  // Foca no primeiro campo ao montar
  useEffect(() => {
    packageCodeRef.current?.focus();
  }, []);

  // Inicializa / limpa o scanner quando o Dialog abre/fecha
  useEffect(() => {
    if (!scannerOpen) return;

    const scanner = new Html5QrcodeScanner(
      "packid-scanner-view",
      {
        fps: 10,
        qrbox: { width: 250, height: 250 },
      },
      false
    );

    scanner.render(
      (decodedText) => {
        // Sucesso na leitura
        setPackageCode(decodedText);
        setScannerOpen(false);

        // Depois que fechar o dialog, foca no próximo campo
        setTimeout(() => {
          apartmentRef.current?.focus();
        }, 0);
      },
      (errorMessage) => {
        // Erros de leitura contínuos (ruído normal do scanner)
        console.debug("Scanner error", errorMessage);
      }
    );

    scannerRef.current = scanner;

    return () => {
      scanner
        .clear()
        .catch(() => {
          // ignore
        })
        .finally(() => {
          scannerRef.current = null;
        });
    };
  }, [scannerOpen]);

  const openScanner = () => {
    setScannerOpen(true);
  };

  const closeScanner = () => {
    setScannerOpen(false);
  };

  const openPrintAndReset = () => {
    if (!packageCode.trim() || !apartment.trim()) {
      return;
    }

    // Abre o diálogo de impressão do navegador
    globalThis.print();

    // Depois de imprimir, limpa campos e volta o foco
    setPackageCode("");
    setApartment("");
    setTimeout(() => {
      packageCodeRef.current?.focus();
    }, 0);
  };

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
      openPrintAndReset();
    }
  };

  const handlePrintClick = () => {
    openPrintAndReset();
  };

  return (
    <>
      <Container
        maxWidth="sm"
        sx={{
          mt: { xs: 2, md: 4 },
          mb: { xs: 4, md: 6 },
        }}
      >
        <Paper elevation={2} sx={{ p: { xs: 2, md: 3 } }}>
          <Typography variant={isMobile ? "h5" : "h4"} gutterBottom>
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
              onChange={(e) => setPackageCode(e.target.value)}
              inputRef={packageCodeRef}
              onKeyDown={handlePackageCodeKeyDown}
              fullWidth
              autoComplete="off"
              InputProps={{
                endAdornment: isMobile ? (
                  <InputAdornment position="end">
                    <IconButton
                      edge="end"
                      onClick={openScanner}
                      aria-label={t("identify.scanCode")}
                    >
                      <QrCodeScannerIcon />
                    </IconButton>
                  </InputAdornment>
                ) : undefined,
              }}
            />

            <TextField
              label={t("identify.apartment")}
              variant="outlined"
              value={apartment}
              onChange={(e) => setApartment(e.target.value)}
              inputRef={apartmentRef}
              onKeyDown={handleApartmentKeyDown}
              fullWidth
              autoComplete="off"
            />

            <Box display="flex" justifyContent="flex-end" mt={2}>
              <Button
                variant="contained"
                color="primary"
                onClick={handlePrintClick}
                disabled={!packageCode.trim() || !apartment.trim()}
              >
                {t("identify.printLabel")}
              </Button>
            </Box>
          </Stack>
        </Paper>
      </Container>

      {/* Área de impressão – só aparece no @media print */}
      <div id="print-area">
        <div id="print-package-code">{packageCode}</div>
        <div id="print-apartment">{apartment}</div>
      </div>

      {/* Dialog do scanner (câmera) */}
      <Dialog fullScreen={isMobile} open={scannerOpen} onClose={closeScanner}>
        <DialogTitle
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          {t("identify.scanTitle")}
          <IconButton onClick={closeScanner}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <Box
            id="packid-scanner-view"
            sx={{
              width: "100%",
              maxWidth: 400,
              mx: "auto",
              aspectRatio: "1",
            }}
          />
        </DialogContent>
        {!isMobile && (
          <DialogActions>
            <Button onClick={closeScanner}>Fechar</Button>
          </DialogActions>
        )}
      </Dialog>
    </>
  );
}

function App() {
  const { t, i18n } = useTranslation();

  const [user, setUser] = useState<User | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [now, setNow] = useState<Date>(new Date());
  const [activeView, setActiveView] = useState<ActiveView>("home");

  const [language, setLanguage] = useState<string>(i18n.language || "en");

  // Carrega o usuário autenticado ao montar
  useEffect(() => {
    fetchCurrentUser()
      .then(setUser)
      .catch((err) => {
        console.error(err);
        setError("Authentication check failed.");
        setUser(null);
      });
  }, []);

  // Atualiza relógio a cada segundo
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
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

  const getLocaleForDate = () => {
    if (language === "pt") return "pt-BR";
    if (language === "es") return "es-ES";
    return "en-US";
  };

  const formattedDateTime = now.toLocaleString(getLocaleForDate());

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
            sx={{
              p: 4,
              mt: 8,
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

    // Views autenticadas
    if (activeView === "identifyPackage") {
      return <IdentifyPackageScreen />;
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
      {/* Top bar com menu, idioma e relógio */}
      <AppBar position="static" color="default" elevation={1}>
        <Toolbar>
          <IconButton
            edge="start"
            color="inherit"
            aria-label="open drawer"
            onClick={toggleDrawer(true)}
            sx={{ mr: 2 }}
          >
            <MenuIcon />
          </IconButton>

          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            {t("app.title")}
          </Typography>

          <FormControl
            size="small"
            sx={{ mr: 2, minWidth: 130 }}
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

          <Typography variant="body2">{formattedDateTime}</Typography>

          {user && (
            <Button color="inherit" onClick={handleLogout} sx={{ ml: 2 }}>
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

      {/* Rodapé com info do usuário */}
      {user && (
        <Box
          component="footer"
          sx={{
            p: { xs: 1, sm: 2 },
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
