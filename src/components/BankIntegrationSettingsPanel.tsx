import { useEffect, useState } from "react";
import { Alert, Box, Button, Chip, MenuItem, Paper, Stack, Switch, TextField, Typography, FormControlLabel } from "@mui/material";
import AccountBalanceRoundedIcon from "@mui/icons-material/AccountBalanceRounded";
import SaveRoundedIcon from "@mui/icons-material/SaveRounded";
import {
  fetchBankIntegrationSettings,
  updateBankIntegrationSettings,
  userFriendlyError,
  type BankIntegrationSettings,
  type BankIntegrationSettingsPayload,
} from "../api";

const empty: BankIntegrationSettingsPayload = {
  provider: "NONE",
  environment: "SANDBOX",
  enabled: false,
  clientId: "",
  clientSecret: "",
  apiBaseUrl: "",
  tokenUrl: "",
  workspaceId: "",
  covenantCode: "",
  beneficiaryCode: "",
  notes: "",
};

export default function BankIntegrationSettingsPanel() {
  const [data, setData] = useState<BankIntegrationSettings | null>(null);
  const [form, setForm] = useState<BankIntegrationSettingsPayload>(empty);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchBankIntegrationSettings()
      .then((value) => {
        setData(value);
        setForm({ ...value, clientSecret: "" });
      })
      .catch((e) => setError(userFriendlyError(e, "Não foi possível carregar a integração bancária.")))
      .finally(() => setLoading(false));
  }, []);

  const setField = <K extends keyof BankIntegrationSettingsPayload>(key: K, value: BankIntegrationSettingsPayload[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const save = async () => {
    setSaving(true); setError(null); setMessage(null);
    try {
      const value = await updateBankIntegrationSettings(form);
      setData(value);
      setForm({ ...value, clientSecret: "" });
      setMessage("Configuração bancária salva.");
    } catch (e) {
      setError(userFriendlyError(e, "Não foi possível salvar a integração bancária."));
    } finally { setSaving(false); }
  };

  return <Paper variant="outlined" sx={{ p: { xs: 2, md: 2.5 }, borderRadius: 3 }}>
    <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" spacing={1} sx={{ mb: 2 }}>
      <Box>
        <Stack direction="row" spacing={1} alignItems="center"><AccountBalanceRoundedIcon color="primary" /><Typography variant="h6">Integração bancária · Boletos</Typography></Stack>
        <Typography variant="body2" color="text.secondary" sx={{ mt: .5 }}>Credenciais da API de cobrança do banco deste condomínio.</Typography>
      </Box>
      <Chip size="small" color={data?.enabled ? "success" : "default"} label={data?.enabled ? "Integração ativada" : "Integração desativada"} />
    </Stack>
    {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
    {message && <Alert severity="success" sx={{ mb: 2 }}>{message}</Alert>}
    <Alert severity="info" sx={{ mb: 2 }}>
      Cada banco possui API, autenticação e certificado próprios. Salve aqui os dados fornecidos pelo banco. O conector de produção deve corresponder ao banco selecionado.
    </Alert>
    <Stack spacing={2}>
      <Stack direction={{ xs: "column", md: "row" }} spacing={1.5}>
        <TextField select fullWidth label="Banco / provedor" value={form.provider} disabled={loading} onChange={(e) => setField("provider", e.target.value as BankIntegrationSettingsPayload["provider"])}>
          <MenuItem value="NONE">Não configurado</MenuItem><MenuItem value="SANTANDER">Santander</MenuItem><MenuItem value="BANCO_DO_BRASIL">Banco do Brasil</MenuItem><MenuItem value="ITAU">Itaú</MenuItem><MenuItem value="BRADESCO">Bradesco</MenuItem><MenuItem value="OUTRO">Outro</MenuItem>
        </TextField>
        <TextField select fullWidth label="Ambiente" value={form.environment} disabled={loading} onChange={(e) => setField("environment", e.target.value as BankIntegrationSettingsPayload["environment"])}>
          <MenuItem value="SANDBOX">Sandbox / Testes</MenuItem><MenuItem value="PRODUCTION">Produção</MenuItem>
        </TextField>
      </Stack>
      <FormControlLabel control={<Switch checked={Boolean(form.enabled)} onChange={(e) => setField("enabled", e.target.checked)} />} label="Habilitar integração bancária" />
      <Stack direction={{ xs: "column", md: "row" }} spacing={1.5}>
        <TextField fullWidth label="Client ID" value={form.clientId ?? ""} onChange={(e) => setField("clientId", e.target.value)} />
        <TextField fullWidth type="password" label={data?.clientSecretConfigured ? "Client Secret (deixe vazio para manter)" : "Client Secret"} value={form.clientSecret ?? ""} onChange={(e) => setField("clientSecret", e.target.value)} />
      </Stack>
      <TextField fullWidth label="URL base da API" value={form.apiBaseUrl ?? ""} onChange={(e) => setField("apiBaseUrl", e.target.value)} />
      <TextField fullWidth label="URL do token OAuth" value={form.tokenUrl ?? ""} onChange={(e) => setField("tokenUrl", e.target.value)} />
      <Stack direction={{ xs: "column", md: "row" }} spacing={1.5}>
        <TextField fullWidth label="Workspace ID" value={form.workspaceId ?? ""} onChange={(e) => setField("workspaceId", e.target.value)} />
        <TextField fullWidth label="Código do convênio" value={form.covenantCode ?? ""} onChange={(e) => setField("covenantCode", e.target.value)} />
        <TextField fullWidth label="Código do beneficiário" value={form.beneficiaryCode ?? ""} onChange={(e) => setField("beneficiaryCode", e.target.value)} />
      </Stack>
      <TextField fullWidth multiline minRows={2} label="Observações da integração" value={form.notes ?? ""} onChange={(e) => setField("notes", e.target.value)} />
      {data?.lastError && <Alert severity="warning">Último erro: {data.lastError}</Alert>}
      <Box><Button variant="contained" startIcon={<SaveRoundedIcon />} onClick={() => void save()} disabled={saving || loading}>{saving ? "Salvando..." : "Salvar integração bancária"}</Button></Box>
    </Stack>
  </Paper>;
}
