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
} from "@mui/material";
import type { SelectChangeEvent } from "@mui/material/Select";
import MenuIcon from "@mui/icons-material/Menu";

type ActiveView = "home" | "identifyPackage";

function HomeScreen() {
  const { t } = useTranslation();

  return (
    <Container maxWidth="md" sx={{ mt: 4 }}>
      <Paper elevation={2} sx={{ p: 3 }}>
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

  const [packageCode, setPackageCode] = useState<string>("");
  const [apartment, setApartment] = useState<string>("");

  // Refs used to control focus between fields
  const packageCodeRef = useRef<HTMLInputElement | null>(null);
  const apartmentRef = useRef<HTMLInputElement | null>(null);

  // Focus the first field when this screen is mounted
  useEffect(() => {
    packageCodeRef.current?.focus();
  }, []);

  const openPrintAndReset = () => {
    if (!packageCode.trim() || !apartment.trim()) {
      return;
    }

    // Open browser print dialog
    globalThis.print();

    // After printing, clear fields and focus on the first one again
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
      <Container maxWidth="sm" sx={{ mt: 4 }}>
        <Paper elevation={2} sx={{ p: 3 }}>
          <Typography variant="h4" gutterBottom>
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

      {/* Print area – only visible when printing */}
      <div id="print-area">
        <div id="print-package-code">{packageCode}</div>
        <div id="print-apartment">{apartment}</div>
      </div>
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

  // Load authenticated user on mount
  useEffect(() => {
    fetchCurrentUser()
      .then(setUser)
      .catch((err) => {
        console.error(err);
        setError("Authentication check failed.");
        setUser(null);
      });
  }, []);

  // Update clock every second
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
        <Typography variant="body1" align="center">
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

    // Authenticated views
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
      }}
    >
      {/* Top bar with hamburger menu, language selector and clock */}
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
              <MenuItem value="pt">Português</MenuItem>
              <MenuItem value="en">English</MenuItem>
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

      {/* Side drawer menu */}
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

      {/* Main content */}
      <Box sx={{ p: 2 }}>{renderContent()}</Box>
    </Box>
  );
}

export default App;
