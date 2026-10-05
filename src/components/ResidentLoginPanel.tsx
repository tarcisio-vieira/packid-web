import { useMemo, useState } from "react";
import { Alert, Button, Stack, TextField } from "@mui/material";
import { residentLogin, userFriendlyError, type ResidentSession } from "../api";

export default function ResidentLoginPanel({ onLoggedIn }: Readonly<{ onLoggedIn: (session: ResidentSession) => void }>) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const canSubmit = useMemo(() => Boolean(username.trim() && password), [username, password]);

  const submit = async () => {
    if (!canSubmit) return;
    setLoading(true);
    setError(null);
    try {
      onLoggedIn(await residentLogin({ username: username.trim(), password }));
    } catch (e) {
      setError(userFriendlyError(e, "Usuário ou senha inválidos."));
    } finally {
      setLoading(false);
    }
  };

  return <Stack spacing={1.5}>
    {error && <Alert severity="error">{error}</Alert>}
    <TextField size="small" label="Usuário" value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" />
    <TextField size="small" label="Senha" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" onKeyDown={(e) => { if (e.key === "Enter") void submit(); }} />
    <Button variant="contained" disabled={loading || !canSubmit} onClick={() => void submit()}>{loading ? "Entrando..." : "Entrar"}</Button>
  </Stack>;
}
