import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Divider,
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
import {
  fetchPublicTenants,
  residentLogin,
  userFriendlyError,
  type PublicTenant,
  type ResidentSession,
} from "../api";

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
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        px: 2,
        py: 4,
        background:
          "radial-gradient(circle at 12% 18%, rgba(46,125,50,.10), transparent 34%), radial-gradient(circle at 88% 82%, rgba(25,118,210,.09), transparent 30%), #f6f3ea",
      }}
    >
      <Card
        elevation={0}
        sx={{
          width: "100%",
          maxWidth: 480,
          borderRadius: 5,
          border: "1px solid",
          borderColor: "divider",
          boxShadow: "0 24px 70px rgba(25, 38, 55, .12)",
          overflow: "hidden",
        }}
      >
        <Box sx={{ height: 7, background: "linear-gradient(90deg, #2e7d32, #66bb6a, #1976d2)" }} />
        <CardContent sx={{ p: { xs: 3, sm: 4 } }}>
          <Stack alignItems="center" spacing={1.2} textAlign="center">
            <Box
              sx={{
                width: 68,
                height: 68,
                borderRadius: 4,
                display: "grid",
                placeItems: "center",
                bgcolor: "success.main",
                color: "success.contrastText",
                boxShadow: "0 12px 28px rgba(46,125,50,.24)",
              }}
            >
              <HomeRoundedIcon sx={{ fontSize: 38 }} />
            </Box>
            <Typography variant="h4" fontWeight={900} letterSpacing={-0.8}>Portal do Morador</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 365 }}>
              Consulte os dados da sua unidade e solicite acesso às áreas de lazer do condomínio.
            </Typography>
          </Stack>

          {error && <Alert severity="error" sx={{ mt: 2.5 }}>{error}</Alert>}

          <Stack spacing={1.7} sx={{ mt: 3 }}>
            <TextField
              select
              label="Condomínio"
              value={tenantSlug}
              onChange={(e) => setTenantSlug(e.target.value)}
              disabled={loadingTenants}
              helperText={loadingTenants ? "Carregando condomínios..." : tenants.length === 0 ? "Nenhum condomínio disponível." : "Selecione o condomínio da sua unidade."}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    {loadingTenants ? <CircularProgress size={18} /> : <ApartmentRoundedIcon fontSize="small" />}
                  </InputAdornment>
                ),
              }}
              fullWidth
            >
              {tenants.map((tenant) => (
                <MenuItem key={tenant.slug} value={tenant.slug}>{tenant.name}</MenuItem>
              ))}
            </TextField>

            <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
              <TextField label="Bloco" value={block} onChange={(e) => setBlock(e.target.value)} fullWidth />
              <TextField label="Apartamento" value={apartment} onChange={(e) => setApartment(e.target.value)} fullWidth />
            </Stack>

            <TextField
              label="Usuário"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              InputProps={{ startAdornment: <InputAdornment position="start"><PersonOutlineRoundedIcon fontSize="small" /></InputAdornment> }}
              fullWidth
            />
            <TextField
              label="Senha"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && canSubmit && !loading) void submit(); }}
              autoComplete="current-password"
              InputProps={{ startAdornment: <InputAdornment position="start"><LockOutlinedIcon fontSize="small" /></InputAdornment> }}
              fullWidth
            />

            <Button
              size="large"
              fullWidth
              variant="contained"
              color="success"
              startIcon={<LoginRoundedIcon />}
              onClick={() => void submit()}
              disabled={!canSubmit || loading || loadingTenants}
              sx={{ py: 1.35, borderRadius: 2.5, textTransform: "none", fontWeight: 800 }}
            >
              {loading ? "Entrando..." : "Entrar no Portal do Morador"}
            </Button>
          </Stack>

          <Divider sx={{ my: 3 }} />
          <Button
            fullWidth
            color="inherit"
            startIcon={<ArrowBackRoundedIcon />}
            onClick={onCollaboratorAccess}
            sx={{ textTransform: "none", fontWeight: 700 }}
          >
            Acesso da secretaria e portaria
          </Button>
        </CardContent>
      </Card>
    </Box>
  );
}
