import { useMemo, useState } from "react";
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
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import LoginRoundedIcon from "@mui/icons-material/LoginRounded";
import LockRoundedIcon from "@mui/icons-material/LockRounded";
import PersonRoundedIcon from "@mui/icons-material/PersonRounded";
import SecurityRoundedIcon from "@mui/icons-material/SecurityRounded";
import VisibilityRoundedIcon from "@mui/icons-material/VisibilityRounded";
import VisibilityOffRoundedIcon from "@mui/icons-material/VisibilityOffRounded";
import CondominiumBrandIcon from "./shared/CondominiumBrandIcon";
import { condominiumBrand } from "../theme/condominiumBrand";
import { residentLogin, userFriendlyError, type ResidentSession } from "../api";

const fieldSx = {
  "& .MuiOutlinedInput-root": {
    minHeight: 54,
    borderRadius: 3,
    bgcolor: "#fff",
    "&.Mui-focused": { boxShadow: "0 0 0 4px rgba(15,118,110,.08)" },
  },
  "& .MuiInputLabel-root.Mui-focused": { color: condominiumBrand.primary },
  "& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline": { borderColor: condominiumBrand.primary },
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
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(initialError ?? null);

  const canSubmit = useMemo(() => Boolean(username.trim() && password), [username, password]);

  const submit = async () => {
    if (!canSubmit) {
      setError("Informe seu usuário e sua senha.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const session = await residentLogin({ username: username.trim(), password });
      onLoggedIn(session);
    } catch (err) {
      setError(userFriendlyError(err, "Usuário ou senha inválidos."));
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
        background: "linear-gradient(155deg, #f4faf8 0%, #edf7f5 52%, #f9fbfa 100%)",
      }}
    >
      <Card
        elevation={0}
        sx={{
          width: "100%",
          maxWidth: 410,
          borderRadius: 5,
          border: "1px solid rgba(15,118,110,.14)",
          boxShadow: "0 22px 60px rgba(17,94,89,.13)",
          overflow: "hidden",
        }}
      >
        <Box sx={{ height: 5, background: `linear-gradient(90deg, ${condominiumBrand.primary}, ${condominiumBrand.accent})` }} />
        <CardContent sx={{ p: { xs: 2.5, sm: 3.5 } }}>
          <Stack alignItems="center" spacing={1.2} sx={{ mb: 3 }}>
            <CondominiumBrandIcon size={66} />
            <Typography variant="h4" align="center" sx={{ fontWeight: 950, fontSize: { xs: 27, sm: 30 } }}>
              Acesso do Morador
            </Typography>
            <Typography variant="body2" align="center" color="text.secondary" sx={{ maxWidth: 300 }}>
              Entre apenas com seu usuário e senha. O aplicativo identifica automaticamente seu condomínio e sua unidade.
            </Typography>
          </Stack>

          <Alert severity="info" icon={<SecurityRoundedIcon />} sx={{ mb: 2.2, borderRadius: 3 }}>
            Acesso pessoal e individual do morador.
          </Alert>

          {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 3 }} onClose={() => setError(null)}>{error}</Alert>}

          <Stack spacing={1.5}>
            <TextField
              label="Usuário"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              autoFocus
              fullWidth
              sx={fieldSx}
              InputProps={{ startAdornment: <InputAdornment position="start"><PersonRoundedIcon color="action" /></InputAdornment> }}
            />
            <TextField
              label="Senha"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") void submit(); }}
              autoComplete="current-password"
              fullWidth
              sx={fieldSx}
              InputProps={{
                startAdornment: <InputAdornment position="start"><LockRoundedIcon color="action" /></InputAdornment>,
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton onClick={() => setShowPassword((v) => !v)} edge="end" aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}>
                      {showPassword ? <VisibilityOffRoundedIcon /> : <VisibilityRoundedIcon />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
            <Button
              variant="contained"
              size="large"
              fullWidth
              startIcon={loading ? <CircularProgress size={18} color="inherit" /> : <LoginRoundedIcon />}
              disabled={loading || !canSubmit}
              onClick={() => void submit()}
              sx={{ minHeight: 52, borderRadius: 3, fontWeight: 900, textTransform: "none", fontSize: 16, bgcolor: condominiumBrand.primary, "&:hover": { bgcolor: condominiumBrand.primaryDark } }}
            >
              {loading ? "Entrando..." : "Entrar"}
            </Button>
          </Stack>

          <Divider sx={{ my: 2.5 }} />

          <Button
            variant="text"
            fullWidth
            startIcon={<ArrowBackRoundedIcon />}
            onClick={onCollaboratorAccess}
            sx={{ minHeight: 44, borderRadius: 2.5, textTransform: "none", color: "text.secondary", fontWeight: 700 }}
          >
            Acesso da portaria e secretaria
          </Button>

          <Typography
            component="a"
            href="https://app.vsgi.com.br/condominio/politica-de-privacidade.html"
            target="_blank"
            rel="noopener noreferrer"
            variant="caption"
            sx={{ display: "block", mt: 1.5, textAlign: "center", color: condominiumBrand.primary, fontWeight: 700, textDecoration: "none", "&:hover": { textDecoration: "underline" } }}
          >
            Política de Privacidade
          </Typography>

        </CardContent>
      </Card>
    </Box>
  );
}
