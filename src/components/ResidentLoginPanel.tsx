import { useState } from "react";
import { Alert, Box, Button, Divider, Stack, TextField, Typography } from "@mui/material";
import HomeOutlinedIcon from "@mui/icons-material/HomeOutlined";
import LoginIcon from "@mui/icons-material/Login";
import { residentLogin, userFriendlyError, type ResidentSession } from "../api";

export default function ResidentLoginPanel({ onLoggedIn }: Readonly<{ onLoggedIn: (session: ResidentSession) => void }>) {
  const [tenantSlug, setTenantSlug] = useState("");
  const [block, setBlock] = useState("");
  const [apartment, setApartment] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!tenantSlug.trim() || !block.trim() || !apartment.trim() || !username.trim() || !password) {
      setError("Informe condomínio, bloco, apartamento, usuário e senha."); return;
    }
    setLoading(true); setError(null);
    try {
      onLoggedIn(await residentLogin({ tenantSlug: tenantSlug.trim(), block: block.trim(), apartment: apartment.trim(), username: username.trim(), password }));
    } catch (err) { setError(userFriendlyError(err, "Não foi possível entrar como morador.")); }
    finally { setLoading(false); }
  };

  return (
    <Box sx={{ width: "100%" }}>
      <Divider sx={{ my: 2 }}><Typography variant="caption" color="text.secondary">OU</Typography></Divider>
      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}><HomeOutlinedIcon color="primary" /><Typography fontWeight={800}>Acesso do morador</Typography></Stack>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>Visualize os dados da unidade e solicite as chaves dos espaços comuns.</Typography>
      {error && <Alert severity="error" sx={{ mb: 1.5 }}>{error}</Alert>}
      <Stack spacing={1.5}>
        <TextField size="small" label="Condomínio (identificador)" placeholder="Ex.: recanto-tropical" value={tenantSlug} onChange={(e) => setTenantSlug(e.target.value)} />
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}><TextField size="small" label="Bloco" value={block} onChange={(e) => setBlock(e.target.value)} fullWidth /><TextField size="small" label="Apartamento" value={apartment} onChange={(e) => setApartment(e.target.value)} fullWidth /></Stack>
        <TextField size="small" label="Usuário" value={username} onChange={(e) => setUsername(e.target.value)} />
        <TextField size="small" label="Senha" type="password" value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") void submit(); }} />
        <Button variant="outlined" startIcon={<LoginIcon />} onClick={() => void submit()} disabled={loading}>{loading ? "Entrando..." : "Entrar como morador"}</Button>
      </Stack>
    </Box>
  );
}
