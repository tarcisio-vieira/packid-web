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
        minHeight: "100dvh",
        display: "grid",
        placeItems: "center",
        px: { xs: 1.5, sm: 2 },
        pt: "calc(16px + env(safe-area-inset-top))",
        pb: "calc(16px + env(safe-area-inset-bottom))",
        bgcolor: "#f6f7f8",
      }}
    >
      <Card
        elevation={0}
        sx={{
          width: "100%",
          maxWidth: 440,
          borderRadius: { xs: 4, sm: 5 },
          border: "1px solid",
          borderColor: "divider",
          boxShadow: { xs: "0 10px 30px rgba(20,32,48,.08)", sm: "0 20px 60px rgba(20,32,48,.10)" },
          overflow: "hidden",
        }}
      >
        <CardContent sx={{ p: { xs: 2.25, sm: 3.5 }, "&:last-child": { pb: { xs: 2.25, sm: 3.5 } } }}>
          <Stack alignItems="center" spacing={0.9} textAlign="center">
            <Box sx={{ width: 54, height: 54, borderRadius: 3, display: "grid", placeItems: "center", bgcolor: "#263746", color: "white" }}>
              <HomeRoundedIcon sx={{ fontSize: 30 }} />
            </Box>
            <Typography variant="overline" sx={{ letterSpacing: 2, fontWeight: 900, lineHeight: 1.3 }}>VSGI</Typography>
            <Typography fontWeight={900} sx={{ fontSize: { xs: 23, sm: 28 }, letterSpacing: -0.5 }}>Portal do Morador</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 340 }}>
              Entre para consultar sua unidade, encomendas e chaves das áreas de lazer.
            </Typography>
          </Stack>

          {error && <Alert severity="error" sx={{ mt: 2, borderRadius: 2.5 }}>{error}</Alert>}

          <Stack spacing={1.35} sx={{ mt: 2.25 }}>
            <TextField
              select
              label="Condomínio"
              value={tenantSlug}
              onChange={(e) => setTenantSlug(e.target.value)}
              disabled={loadingTenants}
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

            <Box sx={{ display: "grid", gridTemplateColumns: "0.8fr 1.2fr", gap: 1.15 }}>
              <TextField label="Bloco" value={block} onChange={(e) => setBlock(e.target.value)} fullWidth inputProps={{ inputMode: "numeric" }} />
              <TextField label="Apartamento" value={apartment} onChange={(e) => setApartment(e.target.value)} fullWidth inputProps={{ inputMode: "numeric" }} />
            </Box>

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
              startIcon={<LoginRoundedIcon />}
              onClick={() => void submit()}
              disabled={!canSubmit || loading || loadingTenants}
              sx={{ py: 1.25, mt: 0.3, borderRadius: 2.5, textTransform: "none", fontWeight: 850 }}
            >
              {loading ? "Entrando..." : "Entrar"}
            </Button>
          </Stack>

          <Divider sx={{ my: 2.2 }} />
          <Button fullWidth color="inherit" size="small" startIcon={<ArrowBackRoundedIcon />} onClick={onCollaboratorAccess} sx={{ textTransform: "none", color: "text.secondary" }}>
            Acesso da portaria e secretaria
          </Button>
        </CardContent>
      </Card>
    </Box>
  );
}
