import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Divider,
  IconButton,
  InputAdornment,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import ApartmentRoundedIcon from "@mui/icons-material/ApartmentRounded";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import HomeRoundedIcon from "@mui/icons-material/HomeRounded";
import LoginRoundedIcon from "@mui/icons-material/LoginRounded";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import PersonOutlineRoundedIcon from "@mui/icons-material/PersonOutlineRounded";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import VisibilityOffOutlinedIcon from "@mui/icons-material/VisibilityOffOutlined";
import {
  fetchPublicTenants,
  residentLogin,
  userFriendlyError,
  type PublicTenant,
  type ResidentSession,
} from "../api";

const fieldSx = {
  "& .MuiOutlinedInput-root": {
    borderRadius: 2.4,
    bgcolor: "#fff",
    transition: "box-shadow .18s ease, border-color .18s ease",
    "&:hover": { bgcolor: "#fff" },
    "&.Mui-focused": {
      bgcolor: "#fff",
      boxShadow: "0 0 0 3px rgba(25,118,210,.08)",
    },
  },
  "& input:-webkit-autofill, & input:-webkit-autofill:hover, & input:-webkit-autofill:focus": {
    WebkitTextFillColor: "#17212b",
    WebkitBoxShadow: "0 0 0 1000px #ffffff inset",
    boxShadow: "0 0 0 1000px #ffffff inset",
    caretColor: "#17212b",
    transition: "background-color 9999s ease-out 0s",
  },
} as const;

export default function ResidentLoginPage({
  initialError,
  onLoggedIn,
  onCollaboratorAccess,
}: Readonly<{
  initialError?: string | null;
  onLoggedIn: (session: ResidentSession) => void;
  onCollaboratorAccess: () => void;
}>) {
  const [tenants, setTenants] = useState<PublicTenant[]>([]);
  const [tenantSlug, setTenantSlug] = useState("");
  const [block, setBlock] = useState("");
  const [apartment, setApartment] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loadingTenants, setLoadingTenants] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(initialError ?? null);

  useEffect(() => {
    let cancelled = false;
    fetchPublicTenants()
      .then((items) => {
        if (cancelled) return;
        setTenants(items);
        if (items.length === 1) setTenantSlug(items[0].slug);
      })
      .catch((err) => {
        if (!cancelled) setError(userFriendlyError(err, "Não foi possível carregar os condomínios disponíveis."));
      })
      .finally(() => {
        if (!cancelled) setLoadingTenants(false);
      });
    return () => { cancelled = true; };
  }, []);

  const canSubmit = useMemo(
    () => Boolean(tenantSlug && block.trim() && apartment.trim() && username.trim() && password),
    [tenantSlug, block, apartment, username, password],
  );

  const submit = async () => {
    if (!canSubmit) {
      setError("Selecione o condomínio e informe bloco, apartamento, usuário e senha.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const session = await residentLogin({
        tenantSlug,
        block: block.trim(),
        apartment: apartment.trim(),
        username: username.trim(),
        password,
      });
      onLoggedIn(session);
    } catch (err) {
      setError(userFriendlyError(err, "Não foi possível entrar como morador."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: "100dvh",
        display: "grid",
        placeItems: "center",
        px: { xs: 1.5, sm: 3 },
        py: { xs: 2, sm: 4 },
        background:
          "radial-gradient(circle at 10% 10%, rgba(25,118,210,.09), transparent 30%), radial-gradient(circle at 92% 90%, rgba(46,125,50,.07), transparent 30%), linear-gradient(145deg, #f8f9fb 0%, #f5f2e9 100%)",
      }}
    >
      <Card
        elevation={0}
        sx={{
          width: "100%",
          maxWidth: 500,
          borderRadius: { xs: 4, sm: 5 },
          border: "1px solid rgba(31, 47, 65, .10)",
          boxShadow: "0 26px 80px rgba(24, 39, 58, .13)",
          overflow: "hidden",
          bgcolor: "rgba(255,255,255,.98)",
        }}
      >
        <Box
          sx={{
            height: 6,
            background: "linear-gradient(90deg, #1976d2 0%, #42a5f5 52%, #2e7d32 100%)",
          }}
        />

        <CardContent
          sx={{
            p: { xs: 2.4, sm: 4 },
            "&:last-child": { pb: { xs: 2.4, sm: 4 } },
          }}
        >
          <Stack alignItems="center" textAlign="center">
            <Box
              sx={{
                width: 62,
                height: 62,
                borderRadius: 3.6,
                display: "grid",
                placeItems: "center",
                color: "white",
                background: "linear-gradient(145deg, #31495c 0%, #1f3343 100%)",
                boxShadow: "0 14px 28px rgba(31,51,67,.22)",
                mb: 1.45,
              }}
            >
              <HomeRoundedIcon sx={{ fontSize: 33 }} />
            </Box>

            <Typography
              variant="overline"
              sx={{ fontWeight: 900, letterSpacing: 2.4, color: "text.secondary", lineHeight: 1, mb: 0.7 }}
            >
              VSGI CONDOMÍNIO
            </Typography>

            <Typography
              component="h1"
              fontWeight={900}
              sx={{ fontSize: { xs: 26, sm: 30 }, letterSpacing: -0.75, lineHeight: 1.15, color: "#15202b" }}
            >
              Portal do Morador
            </Typography>

            <Typography variant="body2" color="text.secondary" sx={{ mt: 1.1, maxWidth: 365, lineHeight: 1.5 }}>
              Consulte sua unidade, encomendas e solicitações das áreas de lazer.
            </Typography>
          </Stack>

          {error && <Alert severity="error" sx={{ mt: 2.2, borderRadius: 2.5 }}>{error}</Alert>}

          <Stack spacing={1.45} sx={{ mt: 2.6 }}>
            <TextField
              select
              size="small"
              label="Condomínio"
              value={tenantSlug}
              onChange={(e) => setTenantSlug(e.target.value)}
              disabled={loadingTenants}
              sx={fieldSx}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    {loadingTenants ? <CircularProgress size={18} /> : <ApartmentRoundedIcon fontSize="small" />}
                  </InputAdornment>
                ),
              }}
              fullWidth
            >
              {tenants.map((tenant) => <MenuItem key={tenant.slug} value={tenant.slug}>{tenant.name}</MenuItem>)}
            </TextField>

            <Box sx={{ display: "grid", gridTemplateColumns: "minmax(0, .75fr) minmax(0, 1.25fr)", gap: 1.2 }}>
              <TextField
                size="small"
                label="Bloco"
                value={block}
                onChange={(e) => setBlock(e.target.value)}
                fullWidth
                inputProps={{ inputMode: "numeric" }}
                sx={fieldSx}
              />
              <TextField
                size="small"
                label="Apartamento"
                value={apartment}
                onChange={(e) => setApartment(e.target.value)}
                fullWidth
                inputProps={{ inputMode: "numeric" }}
                sx={fieldSx}
              />
            </Box>

            <TextField
              size="small"
              label="Usuário"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              sx={fieldSx}
              InputProps={{
                startAdornment: <InputAdornment position="start"><PersonOutlineRoundedIcon fontSize="small" /></InputAdornment>,
              }}
              fullWidth
            />

            <TextField
              size="small"
              label="Senha"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && canSubmit && !loading) void submit(); }}
              autoComplete="current-password"
              sx={fieldSx}
              InputProps={{
                startAdornment: <InputAdornment position="start"><LockOutlinedIcon fontSize="small" /></InputAdornment>,
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      size="small"
                      edge="end"
                      aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                      onClick={() => setShowPassword((value) => !value)}
                    >
                      {showPassword ? <VisibilityOffOutlinedIcon fontSize="small" /> : <VisibilityOutlinedIcon fontSize="small" />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
              fullWidth
            />

            <Button
              size="large"
              fullWidth
              variant="contained"
              startIcon={loading ? <CircularProgress size={18} color="inherit" /> : <LoginRoundedIcon />}
              onClick={() => void submit()}
              disabled={!canSubmit || loading || loadingTenants}
              sx={{
                minHeight: 50,
                mt: 0.4,
                borderRadius: 2.5,
                textTransform: "none",
                fontWeight: 850,
                boxShadow: canSubmit ? "0 8px 18px rgba(25,118,210,.22)" : "none",
              }}
            >
              {loading ? "Entrando..." : "Entrar"}
            </Button>
          </Stack>

          <Divider sx={{ my: 2.5 }} />

          <Button
            fullWidth
            color="inherit"
            size="medium"
            startIcon={<ArrowBackRoundedIcon />}
            onClick={onCollaboratorAccess}
            sx={{
              minHeight: 44,
              borderRadius: 2.3,
              textTransform: "none",
              fontWeight: 700,
              color: "#52606d",
              bgcolor: "#f7f9fb",
              border: "1px solid rgba(38,55,70,.08)",
              "&:hover": { bgcolor: "#f0f4f7" },
            }}
          >
            Acesso da portaria e secretaria
          </Button>
        </CardContent>
      </Card>
    </Box>
  );
}
