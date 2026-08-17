import type { ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import FitnessCenterIcon from "@mui/icons-material/FitnessCenter";
import SportsEsportsIcon from "@mui/icons-material/SportsEsports";
import ToysIcon from "@mui/icons-material/Toys";
import SpaOutlinedIcon from "@mui/icons-material/SpaOutlined";
import KeyIcon from "@mui/icons-material/Key";
import LogoutIcon from "@mui/icons-material/Logout";
import HomeOutlinedIcon from "@mui/icons-material/HomeOutlined";
import PetsOutlinedIcon from "@mui/icons-material/PetsOutlined";
import DirectionsCarOutlinedIcon from "@mui/icons-material/DirectionsCarOutlined";
import PedalBikeOutlinedIcon from "@mui/icons-material/PedalBikeOutlined";
import PeopleAltOutlinedIcon from "@mui/icons-material/PeopleAltOutlined";
import Inventory2OutlinedIcon from "@mui/icons-material/Inventory2Outlined";
import ManageAccountsOutlinedIcon from "@mui/icons-material/ManageAccountsOutlined";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import PhotoCameraOutlinedIcon from "@mui/icons-material/PhotoCameraOutlined";
import {
  fetchResidentPortal,
  requestResidentSpace,
  residentLogout,
  residentRegistryPhotoUrl,
  updateResidentCredentials,
  updateResidentProfile,
  uploadResidentProfilePhoto,
  userFriendlyError,
  type RegistryEntry,
  type ResidentPortalData,
  type ResidentSession,
  type SpaceAccess,
  type SpaceType,
} from "../api";
import { spaceAccessStatusLabel, spaceLabel } from "./SpacesScreen";

function formatDateTime(value?: string | null): string {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(date);
}

function latestActive(rows: SpaceAccess[], type: SpaceType): SpaceAccess | null {
  return rows.find(row => row.spaceType === type && ["REQUESTED_PICKUP", "IN_USE", "REQUESTED_RETURN"].includes(row.status)) ?? null;
}

function buttonState(row: SpaceAccess | null): { label: string; color: "primary" | "warning" | "success" | "info"; disabled: boolean } {
  if (!row) return { label: "Solicitar chave", color: "primary", disabled: false };
  if (row.status === "REQUESTED_PICKUP") return { label: "Aguardando liberação da portaria", color: "warning", disabled: true };
  if (row.status === "IN_USE") return { label: "Solicitar devolução da chave", color: "info", disabled: false };
  if (row.status === "REQUESTED_RETURN") return { label: "Aguardando portaria receber a chave", color: "success", disabled: true };
  return { label: "Solicitar chave", color: "primary", disabled: false };
}

function SpaceButton({ type, rows, busy, onClick }: Readonly<{ type: SpaceType; rows: SpaceAccess[]; busy: boolean; onClick: () => void }>) {
  const current = latestActive(rows, type);
  const state = buttonState(current);
  const Icon = type === "GYM"
    ? FitnessCenterIcon
    : type === "GAMES_ROOM"
      ? SportsEsportsIcon
      : type === "SAUNA"
        ? SpaOutlinedIcon
        : ToysIcon;
  return (
    <Card variant="outlined" sx={{ height: "100%", borderWidth: 2, borderColor: current?.status === "IN_USE" ? "info.main" : current ? "warning.light" : "divider" }}>
      <CardContent>
        <Stack spacing={1.5} alignItems="center" textAlign="center">
          <Box sx={{ width: 66, height: 66, borderRadius: 3, display: "grid", placeItems: "center", bgcolor: "action.hover" }}><Icon sx={{ fontSize: 36 }} /></Box>
          <Typography variant="h6" fontWeight={800}>{spaceLabel(type)}</Typography>
          {current && <Chip size="small" label={spaceAccessStatusLabel(current.status)} color={current.status === "IN_USE" ? "info" : "warning"} />}
          {current?.releasedAt && <Typography variant="caption" color="text.secondary">Chave liberada em {formatDateTime(current.releasedAt)}</Typography>}
          <Button fullWidth variant="contained" color={state.color} startIcon={<KeyIcon />} disabled={state.disabled || busy} onClick={onClick}>
            {busy ? "Processando..." : state.label}
          </Button>
        </Stack>
      </CardContent>
    </Card>
  );
}

function RegistryCards({
  title,
  rows,
  icon,
  onEdit,
}: Readonly<{ title: string; rows: RegistryEntry[]; icon: ReactNode; onEdit?: (row: RegistryEntry) => void }>) {
  return (
    <Card variant="outlined">
      <CardContent>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5 }}>{icon}<Typography fontWeight={800}>{title} ({rows.length})</Typography></Stack>
        {rows.length === 0 ? <Typography variant="body2" color="text.secondary">Nenhum cadastro.</Typography> : (
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2,1fr)" }, gap: 1.25 }}>
            {rows.map(row => (
              <Stack key={row.id} direction="row" spacing={1.2} alignItems="center" sx={{ p: 1, borderRadius: 1, bgcolor: "action.hover" }}>
                <Avatar src={row.photoAvailable && row.photoOwnedByCurrentUser ? residentRegistryPhotoUrl(row.id, row.updatedAt ?? row.createdAt) : undefined}>{row.name?.[0]?.toUpperCase()}</Avatar>
                <Box sx={{ minWidth: 0, flexGrow: 1 }}>
                  <Typography variant="body2" fontWeight={700} noWrap>{row.name}</Typography>
                  <Typography variant="caption" color="text.secondary">{row.identifier || row.breed || row.model || row.document || "Cadastro da unidade"}</Typography>
                </Box>
                {onEdit && (
                  <Button size="small" startIcon={<EditOutlinedIcon />} onClick={() => onEdit(row)} sx={{ minWidth: 0 }}>
                    Editar
                  </Button>
                )}
              </Stack>
            ))}
          </Box>
        )}
      </CardContent>
    </Card>
  );
}

type ProfileForm = { phone: string; email: string; profession: string };

export default function ResidentPortal({ session, onLoggedOut }: Readonly<{ session: ResidentSession; onLoggedOut: () => void }>) {
  const [data, setData] = useState<ResidentPortalData | null>(null);
  const [localSession, setLocalSession] = useState(session);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [busySpace, setBusySpace] = useState<SpaceType | null>(null);
  const [accountOpen, setAccountOpen] = useState(session.mustChangePassword);
  const [accountUsername, setAccountUsername] = useState(session.username ?? "");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [accountBusy, setAccountBusy] = useState(false);
  const [profileRow, setProfileRow] = useState<RegistryEntry | null>(null);
  const [profileForm, setProfileForm] = useState<ProfileForm>({ phone: "", email: "", profession: "" });
  const [profilePhoto, setProfilePhoto] = useState<File | null>(null);
  const [profileBusy, setProfileBusy] = useState(false);
  const profilePhotoInputRef = useRef<HTMLInputElement | null>(null);

  const load = async () => {
    try {
      const portal = await fetchResidentPortal();
      setData(portal);
      setLocalSession(portal.session);
      setAccountUsername(portal.session.username ?? "");
      if (portal.session.mustChangePassword) setAccountOpen(true);
      setError(null);
    } catch (err) {
      setError(userFriendlyError(err, "Não foi possível carregar os dados da sua unidade."));
    }
  };

  useEffect(() => {
    if (!session.mustChangePassword) void load();
  }, []);

  const activeRows = useMemo(() => data?.spaceAccesses ?? [], [data?.spaceAccesses]);

  const toggleSpace = async (type: SpaceType) => {
    setBusySpace(type); setError(null); setSuccess(null);
    try { await requestResidentSpace(type); await load(); }
    catch (err) { setError(userFriendlyError(err, "Não foi possível atualizar a solicitação da chave.")); }
    finally { setBusySpace(null); }
  };

  const logout = async () => {
    try { await residentLogout(); } finally { onLoggedOut(); }
  };

  const openAccount = () => {
    setAccountUsername(localSession.username ?? "");
    setNewPassword("");
    setConfirmPassword("");
    setAccountOpen(true);
  };

  const saveAccount = async () => {
    const username = accountUsername.trim();
    if (username.length < 4) {
      setError("O usuário deve ter pelo menos 4 caracteres.");
      return;
    }
    if (localSession.mustChangePassword && newPassword.length < 8) {
      setError("No primeiro acesso, crie uma nova senha com pelo menos 8 caracteres.");
      return;
    }
    if (newPassword && newPassword.length < 8) {
      setError("A nova senha deve ter pelo menos 8 caracteres.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("A confirmação da nova senha não confere.");
      return;
    }
    setAccountBusy(true); setError(null); setSuccess(null);
    try {
      const updated = await updateResidentCredentials({
        username,
        newPassword: newPassword || undefined,
      });
      setLocalSession(updated);
      setAccountOpen(false);
      setNewPassword(""); setConfirmPassword("");
      setSuccess("Dados de acesso atualizados com sucesso.");
      await load();
    } catch (err) {
      setError(userFriendlyError(err, "Não foi possível atualizar usuário/senha."));
    } finally {
      setAccountBusy(false);
    }
  };

  const openProfile = (row: RegistryEntry) => {
    setProfileRow(row);
    setProfileForm({
      phone: row.phone ?? "",
      email: row.email ?? "",
      profession: row.profession ?? "",
    });
    setProfilePhoto(null);
  };

  const selectProfilePhoto = (file?: File) => {
    if (!file) return;
    if (!(file.type === "image/jpeg" || file.type === "image/png")) {
      setError("Use uma foto JPG ou PNG.");
      return;
    }
    if (file.size > 12 * 1024 * 1024) {
      setError("A foto deve ter no máximo 12 MB.");
      return;
    }
    setProfilePhoto(file);
  };

  const saveProfile = async () => {
    if (!profileRow) return;
    setProfileBusy(true); setError(null); setSuccess(null);
    try {
      await updateResidentProfile(profileRow.id, {
        phone: profileForm.phone.trim(),
        email: profileForm.email.trim(),
        profession: profileForm.profession.trim(),
      });
      if (profilePhoto) await uploadResidentProfilePhoto(profileRow.id, profilePhoto);
      setProfileRow(null);
      setProfilePhoto(null);
      setSuccess("Seus dados de contato foram atualizados.");
      await load();
    } catch (err) {
      setError(userFriendlyError(err, "Não foi possível atualizar os dados do condômino."));
    } finally {
      setProfileBusy(false);
    }
  };

  return (
    <Box sx={{ maxWidth: 1250, mx: "auto", py: 2 }}>
      <Card elevation={2} sx={{ mb: 2 }}>
        <CardContent>
          <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" spacing={2} alignItems={{ sm: "center" }}>
            <Box>
              <Stack direction="row" spacing={1} alignItems="center"><HomeOutlinedIcon color="primary" /><Typography variant="h5" fontWeight={800}>{localSession.tenantName}</Typography></Stack>
              <Typography color="text.secondary">Bloco {localSession.block} / Apto {localSession.apartment}</Typography>
            </Box>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
              <Button variant="outlined" startIcon={<ManageAccountsOutlinedIcon />} onClick={openAccount}>Meu acesso</Button>
              <Button variant="outlined" startIcon={<LogoutIcon />} onClick={() => void logout()}>Sair</Button>
            </Stack>
          </Stack>
        </CardContent>
      </Card>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}
      {!data ? <Box sx={{ display: "flex", justifyContent: "center", py: 7 }}><CircularProgress /></Box> : <>
        <Typography variant="h6" fontWeight={800} sx={{ mb: 1 }}>Solicitar acesso à área de lazer</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Ao solicitar, a portaria receberá um aviso. Depois de usar a área, toque novamente no botão para informar que devolverá a chave.
        </Typography>
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2,1fr)", lg: "repeat(4,1fr)" }, gap: 2, mb: 3 }}>
          {(["GYM", "GAMES_ROOM", "PLAYROOM", "SAUNA"] as SpaceType[]).map(type => <SpaceButton key={type} type={type} rows={activeRows} busy={busySpace === type} onClick={() => void toggleSpace(type)} />)}
        </Box>

        <Typography variant="h6" fontWeight={800} sx={{ mb: 1.5 }}>Dados da sua unidade</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
          Cada condômino pode atualizar pelo portal apenas foto, telefone, e-mail e profissão. Nome, documento, vínculo com a unidade e demais dados administrativos continuam protegidos.
        </Typography>
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "repeat(2,1fr)" }, gap: 2 }}>
          <RegistryCards title="Condôminos" rows={data.residents} icon={<PeopleAltOutlinedIcon color="primary" />} onEdit={openProfile} />
          <RegistryCards title="Veículos" rows={data.vehicles} icon={<DirectionsCarOutlinedIcon color="primary" />} />
          <RegistryCards title="Pets" rows={data.pets} icon={<PetsOutlinedIcon color="primary" />} />
          <RegistryCards title="Bicicletas" rows={data.bicycles} icon={<PedalBikeOutlinedIcon color="primary" />} />
        </Box>

        <Divider sx={{ my: 3 }} />
        <Card variant="outlined" sx={{ mb: 2 }}><CardContent>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5 }}><Inventory2OutlinedIcon color="primary" /><Typography fontWeight={800}>Encomendas ({data.packIds.length})</Typography></Stack>
          <TableContainer><Table size="small"><TableHead><TableRow><TableCell>Data</TableCell><TableCell>Página</TableCell><TableCell>Código</TableCell><TableCell>Recebido por</TableCell></TableRow></TableHead>
            <TableBody>{data.packIds.length === 0 && <TableRow><TableCell colSpan={4} align="center">Nenhuma encomenda no período desta ocupação.</TableCell></TableRow>}
              {data.packIds.map(row => <TableRow key={row.id}><TableCell>{formatDateTime(row.arrivedAt)}</TableCell><TableCell>{row.bookPage || "-"}</TableCell><TableCell>{row.labelPackageCode || row.packageCode}</TableCell><TableCell>{row.createdBy || "-"}</TableCell></TableRow>)}</TableBody>
          </Table></TableContainer>
        </CardContent></Card>

        <Card variant="outlined"><CardContent>
          <Typography fontWeight={800} sx={{ mb: 1.5 }}>Histórico de solicitações da área de lazer</Typography>
          <TableContainer><Table size="small"><TableHead><TableRow><TableCell>Área</TableCell><TableCell>Solicitado</TableCell><TableCell>Liberado</TableCell><TableCell>Pedido devolução</TableCell><TableCell>Encerrado</TableCell><TableCell>Status</TableCell></TableRow></TableHead>
            <TableBody>{data.spaceAccesses.length === 0 && <TableRow><TableCell colSpan={6} align="center">Nenhuma solicitação.</TableCell></TableRow>}
              {data.spaceAccesses.map(row => <TableRow key={row.id}><TableCell>{spaceLabel(row.spaceType)}</TableCell><TableCell>{formatDateTime(row.requestedAt)}</TableCell><TableCell>{formatDateTime(row.releasedAt)}</TableCell><TableCell>{formatDateTime(row.returnRequestedAt)}</TableCell><TableCell>{formatDateTime(row.completedAt)}</TableCell><TableCell><Chip size="small" label={spaceAccessStatusLabel(row.status)} /></TableCell></TableRow>)}</TableBody>
          </Table></TableContainer>
        </CardContent></Card>
      </>}

      <Dialog
        open={accountOpen}
        onClose={localSession.mustChangePassword ? undefined : () => setAccountOpen(false)}
        disableEscapeKeyDown={localSession.mustChangePassword}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>{localSession.mustChangePassword ? "Troque a senha no primeiro acesso" : "Meu acesso"}</DialogTitle>
        <DialogContent>
          {localSession.mustChangePassword && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              A senha recebida é temporária. Para sua segurança, crie uma nova senha antes de continuar usando o portal.
            </Alert>
          )}
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField label="Usuário" value={accountUsername} onChange={(e) => setAccountUsername(e.target.value)} helperText="Você pode alterar o usuário da unidade." fullWidth />
            <TextField label={localSession.mustChangePassword ? "Nova senha *" : "Nova senha (opcional)"} type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} helperText="Mínimo de 8 caracteres." fullWidth />
            <TextField label="Confirmar nova senha" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} fullWidth />
          </Stack>
        </DialogContent>
        <DialogActions>
          {!localSession.mustChangePassword && <Button onClick={() => setAccountOpen(false)}>Cancelar</Button>}
          <Button variant="contained" onClick={() => void saveAccount()} disabled={accountBusy}>{accountBusy ? "Salvando..." : "Salvar acesso"}</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(profileRow)} onClose={() => !profileBusy && setProfileRow(null)} fullWidth maxWidth="sm">
        <DialogTitle>Atualizar meus dados</DialogTitle>
        <DialogContent>
          {profileRow && (
            <Stack spacing={2} sx={{ mt: 1 }}>
              <Stack direction="row" spacing={2} alignItems="center">
                <Avatar sx={{ width: 72, height: 72 }} src={profileRow.photoAvailable && profileRow.photoOwnedByCurrentUser ? residentRegistryPhotoUrl(profileRow.id, profileRow.updatedAt ?? profileRow.createdAt) : undefined}>
                  {profileRow.name?.[0]?.toUpperCase()}
                </Avatar>
                <Box>
                  <Typography fontWeight={800}>{profileRow.name}</Typography>
                  <Typography variant="body2" color="text.secondary">Bloco {profileRow.block} / Apto {profileRow.apartment}</Typography>
                  <input ref={profilePhotoInputRef} type="file" accept="image/jpeg,image/png" hidden onChange={(e) => selectProfilePhoto(e.target.files?.[0])} />
                  <Button size="small" startIcon={<PhotoCameraOutlinedIcon />} onClick={() => profilePhotoInputRef.current?.click()} sx={{ mt: 0.5 }}>
                    {profilePhoto ? "Trocar foto selecionada" : "Alterar foto"}
                  </Button>
                  {profilePhoto && <Typography variant="caption" display="block" color="success.main">{profilePhoto.name}</Typography>}
                </Box>
              </Stack>
              <Alert severity="info">Nome, documento, data de nascimento, proprietário, PNE, bloco e apartamento só podem ser alterados pela administração/secretaria.</Alert>
              <TextField label="Telefone" value={profileForm.phone} onChange={(e) => setProfileForm(v => ({ ...v, phone: e.target.value }))} fullWidth />
              <TextField label="E-mail" type="email" value={profileForm.email} onChange={(e) => setProfileForm(v => ({ ...v, email: e.target.value }))} fullWidth />
              <TextField label="Profissão" value={profileForm.profession} onChange={(e) => setProfileForm(v => ({ ...v, profession: e.target.value }))} fullWidth />
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setProfileRow(null)} disabled={profileBusy}>Cancelar</Button>
          <Button variant="contained" onClick={() => void saveProfile()} disabled={profileBusy}>{profileBusy ? "Salvando..." : "Salvar"}</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
