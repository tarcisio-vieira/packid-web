import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  FormControlLabel,
  Paper,
  Snackbar,
  Stack,
  Switch,
  TextField,
  Typography,
} from "@mui/material";
import SettingsIcon from "@mui/icons-material/Settings";
import GoogleIcon from "@mui/icons-material/Google";
import SaveIcon from "@mui/icons-material/Save";
import LinkOffIcon from "@mui/icons-material/LinkOff";
import EmailIcon from "@mui/icons-material/Email";
import {
  disconnectOfficialGoogleAccount,
  fetchCondominiumSettings,
  getGoogleAccountAuthorizeUrl,
  testOfficialGoogleGmail,
  updateCondominiumSettings,
  userFriendlyError,
  type CondominiumSettings,
  type CondominiumSettingsPayload,
  type User,
} from "../api";
import SystemUsersPanel from "./SystemUsersPanel";

function emptyPayload(): CondominiumSettingsPayload {
  return {
    name: "",
    documentNumber: "",
    addressLine1: "",
    addressLine2: "",
    city: "",
    state: "",
    zipCode: "",
    phone: "",
    email: "",
    managerName: "",
    whatsapp: "",
    notes: "",
    emailNotificationsEnabled: true,
    packIdPrintTwoLabels: true,
  };
}

function toPayload(data: CondominiumSettings): CondominiumSettingsPayload {
  return {
    name: data.name ?? "",
    documentNumber: data.documentNumber ?? "",
    addressLine1: data.addressLine1 ?? "",
    addressLine2: data.addressLine2 ?? "",
    city: data.city ?? "",
    state: data.state ?? "",
    zipCode: data.zipCode ?? "",
    phone: data.phone ?? "",
    email: data.email ?? "",
    managerName: data.managerName ?? "",
    whatsapp: data.whatsapp ?? "",
    notes: data.notes ?? "",
    emailNotificationsEnabled: data.emailNotificationsEnabled !== false,
    packIdPrintTwoLabels: data.packIdPrintTwoLabels !== false,
  };
}

function formatDateTime(value?: string | null): string {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

type SettingsScreenProps = Readonly<{
  googleConnectionStatus?: "success" | "error" | null;
  onGoogleConnectionHandled?: () => void;
  currentUser?: User | null;
}>;

export default function SettingsScreen({
  googleConnectionStatus = null,
  onGoogleConnectionHandled,
  currentUser,
}: SettingsScreenProps) {
  const [settings, setSettings] = useState<CondominiumSettings | null>(null);
  const [form, setForm] = useState<CondominiumSettingsPayload>(emptyPayload());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const applySettings = (data: CondominiumSettings) => {
    setSettings(data);
    setForm(toPayload(data));
  };

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchCondominiumSettings()
      .then((data) => {
        if (!cancelled) applySettings(data);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(userFriendlyError(err, "Não foi possível carregar as configurações do condomínio."));
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!googleConnectionStatus || loading) return;

    if (googleConnectionStatus === "success") {
      setSuccess(`Conta Google oficial conectada: ${settings?.googleAccount.email ?? "conta autenticada"}.`);
    } else {
      setError(
        "Não foi possível conectar a conta Google oficial. Tente novamente e confirme as permissões do Google Drive e do Gmail.",
      );
    }

    onGoogleConnectionHandled?.();
  }, [googleConnectionStatus, loading, onGoogleConnectionHandled, settings?.googleAccount.email]);

  const changed = useMemo(() => {
    if (!settings) return false;
    return JSON.stringify(form) !== JSON.stringify(toPayload(settings));
  }, [form, settings]);

  const setField = <K extends keyof CondominiumSettingsPayload>(
    field: K,
    value: CondominiumSettingsPayload[K],
  ) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const save = async () => {
    if (!form.name.trim()) {
      setError("Informe o nome do condomínio.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const data = await updateCondominiumSettings(form);
      applySettings(data);
      setSuccess("Dados do condomínio atualizados com sucesso.");
    } catch (err) {
      setError(userFriendlyError(err, "Não foi possível salvar as configurações."));
    } finally {
      setSaving(false);
    }
  };

  const authorizeGoogle = () => {
    globalThis.location.href = getGoogleAccountAuthorizeUrl();
  };

  const testGmail = async () => {
    setGoogleBusy(true);
    setError(null);
    setSuccess(null);
    try {
      const data = await testOfficialGoogleGmail();
      applySettings(data);
      setSuccess(`E-mail de teste enviado para ${data.googleAccount.email ?? "a conta oficial"}.`);
    } catch (err) {
      setError(userFriendlyError(err, "Não foi possível testar o Gmail da conta oficial."));
      try {
        const refreshed = await fetchCondominiumSettings();
        applySettings(refreshed);
      } catch {
        // Mantém a mensagem principal do teste.
      }
    } finally {
      setGoogleBusy(false);
    }
  };

  const disconnectGoogle = async () => {
    const confirmed = globalThis.confirm(
      "Desconectar a conta Google oficial? Fotos já salvas continuam no Drive, mas o VSGI não poderá acessá-las nem enviar e-mails até reconectar.",
    );
    if (!confirmed) return;

    setGoogleBusy(true);
    setError(null);
    try {
      const data = await disconnectOfficialGoogleAccount();
      applySettings(data);
      setSuccess("Conta Google oficial desconectada.");
    } catch (err) {
      setError(userFriendlyError(err, "Não foi possível desconectar a conta Google."));
    } finally {
      setGoogleBusy(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ width: "100%", maxWidth: 1150, mx: "auto" }}>
      <Paper elevation={2} sx={{ p: { xs: 2, md: 3 } }}>
        <Stack direction="row" spacing={1.2} alignItems="center" sx={{ mb: 0.5 }}>
          <SettingsIcon color="primary" />
          <Typography variant="h5">Configurações do condomínio</Typography>
        </Stack>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Dados gerais do condomínio e conta Google oficial usada pelo VSGI para fotos no Drive e notificações por Gmail.
        </Typography>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        <Typography variant="h6" sx={{ mb: 1.5 }}>Dados do condomínio</Typography>
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
            gap: 2,
          }}
        >
          <TextField label="Nome do condomínio" required value={form.name}
            onChange={(e) => setField("name", e.target.value)} fullWidth />
          <TextField label="CNPJ / documento" value={form.documentNumber ?? ""}
            onChange={(e) => setField("documentNumber", e.target.value)} fullWidth />
          <TextField label="Síndico / responsável" value={form.managerName ?? ""}
            onChange={(e) => setField("managerName", e.target.value)} fullWidth />
          <TextField label="E-mail do condomínio" type="email" value={form.email ?? ""}
            onChange={(e) => setField("email", e.target.value)} fullWidth />
          <TextField label="Telefone" value={form.phone ?? ""}
            onChange={(e) => setField("phone", e.target.value)} fullWidth />
          <TextField label="WhatsApp" value={form.whatsapp ?? ""}
            onChange={(e) => setField("whatsapp", e.target.value)} fullWidth />
          <TextField label="Endereço" value={form.addressLine1 ?? ""}
            onChange={(e) => setField("addressLine1", e.target.value)} fullWidth />
          <TextField label="Complemento" value={form.addressLine2 ?? ""}
            onChange={(e) => setField("addressLine2", e.target.value)} fullWidth />
          <TextField label="Cidade" value={form.city ?? ""}
            onChange={(e) => setField("city", e.target.value)} fullWidth />
          <TextField label="Estado" value={form.state ?? ""}
            onChange={(e) => setField("state", e.target.value)} fullWidth />
          <TextField label="CEP" value={form.zipCode ?? ""}
            onChange={(e) => setField("zipCode", e.target.value)} fullWidth />
          <TextField label="Identificador interno (slug)" value={settings?.tenantSlug ?? ""}
            fullWidth disabled helperText="Mantido somente para identificação técnica do tenant." />
        </Box>

        <TextField label="Observações" multiline minRows={3} value={form.notes ?? ""}
          onChange={(e) => setField("notes", e.target.value)} fullWidth sx={{ mt: 2 }} />

        <Paper variant="outlined" sx={{ mt: 2, p: 2 }}>
          <FormControlLabel
            control={
              <Switch
                checked={form.emailNotificationsEnabled !== false}
                onChange={(e) => setField("emailNotificationsEnabled", e.target.checked)}
              />
            }
            label="Enviar e-mails automáticos aos condôminos"
          />
          <Typography variant="body2" color="text.secondary" sx={{ ml: { sm: 6 } }}>
            Quando ativo, os condôminos com e-mail cadastrado recebem notificações de alterações na unidade e de novas encomendas registradas no PackID. Desative para suspender todos os disparos automáticos; o botão “Testar Gmail” continua disponível para validar a integração.
          </Typography>
        </Paper>

        <Paper variant="outlined" sx={{ mt: 2, p: 2 }}>
          <FormControlLabel
            control={
              <Switch
                checked={form.packIdPrintTwoLabels !== false}
                onChange={(e) => setField("packIdPrintTwoLabels", e.target.checked)}
              />
            }
            label="Imprimir duas etiquetas por encomenda no PackID"
          />
          <Typography variant="body2" color="text.secondary" sx={{ ml: { sm: 6 } }}>
            Ativado: imprime duas etiquetas idênticas na mesma página, como hoje. Desativado: imprime somente uma etiqueta, mantendo exatamente o mesmo desenho e as mesmas dimensões da etiqueta.
          </Typography>
        </Paper>

        <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 2 }}>
          <Button variant="contained" startIcon={<SaveIcon />} onClick={save}
            disabled={saving || !changed}>
            {saving ? "Salvando..." : "Salvar dados"}
          </Button>
        </Box>

        <Divider sx={{ my: 3 }} />

        <Typography variant="h6" sx={{ mb: 1.5 }}>Integração Google oficial</Typography>
        <Paper variant="outlined" sx={{ p: 2 }}>
          <Stack spacing={1.5}>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1} alignItems={{ sm: "center" }}>
              <GoogleIcon />
              <Typography sx={{ fontWeight: 600, flexGrow: 1 }}>
                {settings?.googleAccount.connected
                  ? settings.googleAccount.email
                  : "Nenhuma conta oficial conectada"}
              </Typography>
              <Chip label={settings?.googleAccount.connected ? "Conectado" : "Desconectado"}
                color={settings?.googleAccount.connected ? "success" : "default"} size="small" />
            </Stack>

            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              <Chip
                label={`Google Drive: ${settings?.googleAccount.driveEnabled && settings?.googleAccount.connected ? "ativo" : "inativo"}`}
                color={settings?.googleAccount.driveEnabled && settings?.googleAccount.connected ? "success" : "default"}
                variant="outlined" />
              <Chip
                label={`Gmail: ${settings?.googleAccount.gmailEnabled && settings?.googleAccount.connected ? "ativo" : "inativo"}`}
                color={settings?.googleAccount.gmailEnabled && settings?.googleAccount.connected ? "success" : "default"}
                variant="outlined" />
            </Stack>

            {settings?.googleAccount.connectedAt && (
              <Typography variant="body2" color="text.secondary">
                Conectado em: {formatDateTime(settings.googleAccount.connectedAt)}
              </Typography>
            )}
            {settings?.googleAccount.lastRefreshAt && (
              <Typography variant="body2" color="text.secondary">
                Último acesso renovado: {formatDateTime(settings.googleAccount.lastRefreshAt)}
              </Typography>
            )}
            {settings?.googleAccount.lastError && (
              <Alert severity="warning">
                Último problema com a conta Google: {settings.googleAccount.lastError}
              </Alert>
            )}

            <Typography variant="body2" color="text.secondary">
              A conta conectada será a conta oficial do condomínio. As novas fotos serão gravadas no Drive dessa conta e as notificações sairão pelo Gmail dela. Não é necessário configurar senha do Gmail na EC2. Ao conectar, o Google permitirá escolher a conta institucional sem trocar o usuário administrativo que já está usando o VSGI.
            </Typography>

            <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
              <Button variant="contained" startIcon={<GoogleIcon />} onClick={authorizeGoogle}
                disabled={googleBusy}>
                {settings?.googleAccount.connected ? "Reconectar conta Google" : "Conectar conta Google"}
              </Button>
              {settings?.googleAccount.connected && (
                <Button variant="outlined" startIcon={<EmailIcon />}
                  onClick={testGmail} disabled={googleBusy || !settings.googleAccount.gmailEnabled}>
                  Testar Gmail
                </Button>
              )}
              {settings?.googleAccount.connected && (
                <Button variant="outlined" color="error" startIcon={<LinkOffIcon />}
                  onClick={disconnectGoogle} disabled={googleBusy}>
                  Desconectar
                </Button>
              )}
            </Stack>
          </Stack>
        </Paper>

        <Divider sx={{ my: 3 }} />
        <Typography variant="h6" sx={{ mb: 1.5 }}>Acessos da equipe</Typography>
        <SystemUsersPanel currentUser={currentUser} />
      </Paper>

      <Snackbar open={Boolean(success)} autoHideDuration={5000}
        onClose={() => setSuccess(null)} anchorOrigin={{ vertical: "top", horizontal: "center" }}>
        <Alert severity="success" variant="filled" onClose={() => setSuccess(null)} sx={{ width: "100%" }}>
          {success}
        </Alert>
      </Snackbar>
    </Box>
  );
}
