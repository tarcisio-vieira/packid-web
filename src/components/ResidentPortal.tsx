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
  IconButton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
  useMediaQuery,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
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
import AccessTimeRoundedIcon from "@mui/icons-material/AccessTimeRounded";
import ApartmentRoundedIcon from "@mui/icons-material/ApartmentRounded";
import {
  fetchResidentPortal,
  fetchResidentSpaceAvailability,
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
  type SpaceKeyAvailability,
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

function buttonState(row: SpaceAccess | null): { label: string; compactLabel: string; color: "primary" | "warning" | "success" | "info"; disabled: boolean } {
  if (!row) return { label: "Solicitar chave", compactLabel: "Solicitar", color: "primary", disabled: false };
  if (row.status === "REQUESTED_PICKUP") return { label: "Aguardando liberação da portaria", compactLabel: "Aguardando", color: "warning", disabled: true };
  if (row.status === "IN_USE") return { label: "Solicitar devolução da chave", compactLabel: "Devolver", color: "info", disabled: false };
  if (row.status === "REQUESTED_RETURN") return { label: "Aguardando portaria receber a chave", compactLabel: "Devolução pedida", color: "success", disabled: true };
  return { label: "Solicitar chave", compactLabel: "Solicitar", color: "primary", disabled: false };
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
    <Card
      variant="outlined"
      sx={{
        height: "100%",
        borderRadius: 3,
        borderColor: current?.status === "IN_USE" ? "info.main" : current ? "warning.light" : "divider",
        bgcolor: "background.paper",
      }}
    >
      <CardContent sx={{ p: { xs: 1.25, sm: 2 }, "&:last-child": { pb: { xs: 1.25, sm: 2 } } }}>
        <Stack spacing={{ xs: 0.8, sm: 1.25 }} alignItems="center" textAlign="center">
          <Box
            sx={{
              width: { xs: 44, sm: 58 },
              height: { xs: 44, sm: 58 },
              borderRadius: 2.5,
              display: "grid",
              placeItems: "center",
              bgcolor: "action.hover",
            }}
          >
            <Icon sx={{ fontSize: { xs: 26, sm: 32 } }} />
          </Box>
          <Typography sx={{ fontSize: { xs: 13.5, sm: 16 }, fontWeight: 800, lineHeight: 1.2 }}>{spaceLabel(type)}</Typography>
          {current && (
            <Chip
              size="small"
              label={spaceAccessStatusLabel(current.status)}
              color={current.status === "IN_USE" ? "info" : "warning"}
              sx={{ maxWidth: "100%", height: 23, "& .MuiChip-label": { px: 0.8, fontSize: 10.5 } }}
            />
          )}
          <Button
            fullWidth
            variant="contained"
            color={state.color}
            startIcon={<KeyIcon sx={{ fontSize: "16px !important" }} />}
            disabled={state.disabled || busy}
            onClick={onClick}
            sx={{
              minHeight: 38,
              px: 0.75,
              borderRadius: 2,
              textTransform: "none",
              fontWeight: 800,
              fontSize: { xs: 11.5, sm: 13 },
            }}
          >
            <Box component="span" sx={{ display: { xs: "inline", sm: "none" } }}>{busy ? "Aguarde..." : state.compactLabel}</Box>
            <Box component="span" sx={{ display: { xs: "none", sm: "inline" } }}>{busy ? "Processando..." : state.label}</Box>
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
    <Card variant="outlined" sx={{ borderRadius: 3, overflow: "hidden" }}>
      <CardContent sx={{ p: { xs: 1.5, sm: 2 }, "&:last-child": { pb: { xs: 1.5, sm: 2 } } }}>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: rows.length ? 1.25 : 0 }}>
          {icon}
          <Typography fontWeight={800}>{title}</Typography>
          <Chip size="small" label={rows.length} sx={{ ml: "auto !important", height: 22 }} />
        </Stack>
        {rows.length === 0 ? (
          <Typography variant="body2" color="text.secondary">Nenhum cadastro.</Typography>
        ) : (
          <Stack spacing={0.75}>
            {rows.map(row => (
              <Stack
                key={row.id}
                direction="row"
                spacing={1.1}
                alignItems="center"
                sx={{ p: 0.9, borderRadius: 2, bgcolor: "action.hover" }}
              >
                <Avatar
                  sx={{ width: 40, height: 40 }}
                  src={row.photoAvailable && row.photoOwnedByCurrentUser ? residentRegistryPhotoUrl(row.id, row.updatedAt ?? row.createdAt) : undefined}
                >
                  {row.name?.[0]?.toUpperCase()}
                </Avatar>
                <Box sx={{ minWidth: 0, flexGrow: 1 }}>
                  <Typography variant="body2" fontWeight={750} noWrap>{row.name}</Typography>
                  <Typography variant="caption" color="text.secondary" noWrap display="block">
                    {row.identifier || row.breed || row.model || row.document || "Cadastro da unidade"}
                  </Typography>
                </Box>
                {onEdit && (
                  <Tooltip title="Editar meus dados">
                    <IconButton size="small" onClick={() => onEdit(row)} aria-label={`Editar ${row.name}`}>
                      <EditOutlinedIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                )}
              </Stack>
            ))}
          </Stack>
        )}
      </CardContent>
    </Card>
  );
}

type ProfileForm = { phone: string; email: string; profession: string };

export default function ResidentPortal({ session, onLoggedOut }: Readonly<{ session: ResidentSession; onLoggedOut: () => void }>) {
  const theme = useTheme();
  const mobile = useMediaQuery(theme.breakpoints.down("sm"));
  const [data, setData] = useState<ResidentPortalData | null>(null);
  const [localSession, setLocalSession] = useState(session);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [busySpace, setBusySpace] = useState<SpaceType | null>(null);
  const [transferPrompt, setTransferPrompt] = useState<{ type: SpaceType; availability: SpaceKeyAvailability } | null>(null);
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
    try {
      const ownCurrent = latestActive(activeRows, type);
      if (!ownCurrent) {
        const availability = await fetchResidentSpaceAvailability(type);
        if (!availability.available) {
          setTransferPrompt({ type, availability });
          return;
        }
      }
      await requestResidentSpace(type);
      await load();
    } catch (err) {
      const message = userFriendlyError(err, "Não foi possível atualizar a solicitação da chave.");
      if (/chave já está com o morador da unidade/i.test(message)) {
        try {
          const availability = await fetchResidentSpaceAvailability(type);
          if (!availability.available) {
            setTransferPrompt({ type, availability });
            return;
          }
        } catch {
          // Mantém a mensagem original retornada pela API.
        }
      }
      setError(message);
    } finally {
      setBusySpace(null);
    }
  };

  const assumeKeyResponsibility = async () => {
    if (!transferPrompt) return;
    const { type } = transferPrompt;
    setBusySpace(type); setError(null); setSuccess(null);
    try {
      const updated = await requestResidentSpace(type, true);
      setTransferPrompt(null);
      setSuccess(
        updated.status === "IN_USE"
          ? `A responsabilidade pela chave da ${spaceLabel(type)} foi transferida para a sua unidade.`
          : `A chave da ${spaceLabel(type)} não estava mais em uso. Sua solicitação foi registrada normalmente.`,
      );
      await load();
    } catch (err) {
      setError(userFriendlyError(err, "Não foi possível transferir a responsabilidade pela chave."));
    } finally {
      setBusySpace(null);
    }
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
      const updated = await updateResidentCredentials({ username, newPassword: newPassword || undefined });
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
    setProfileForm({ phone: row.phone ?? "", email: row.email ?? "", profession: row.profession ?? "" });
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
    <Box sx={{ minHeight: "100dvh", bgcolor: "#f6f7f8", px: { xs: 1.25, sm: 2 }, pt: { xs: 1.25, sm: 2 }, pb: "calc(20px + env(safe-area-inset-bottom))" }}>
      <Box sx={{ maxWidth: 1120, mx: "auto" }}>
        <Card
          elevation={0}
          sx={{
            mb: 1.5,
            borderRadius: 3,
            border: "1px solid",
            borderColor: "divider",
            position: { xs: "sticky", sm: "static" },
            top: { xs: 8, sm: "auto" },
            zIndex: 10,
            boxShadow: { xs: "0 6px 24px rgba(20,32,48,.08)", sm: "none" },
          }}
        >
          <CardContent sx={{ p: { xs: 1.25, sm: 2 }, "&:last-child": { pb: { xs: 1.25, sm: 2 } } }}>
            <Stack direction="row" justifyContent="space-between" spacing={1.5} alignItems="center">
              <Stack direction="row" spacing={1.1} alignItems="center" sx={{ minWidth: 0 }}>
                <Box sx={{ width: 42, height: 42, borderRadius: 2.2, display: "grid", placeItems: "center", bgcolor: "#263746", color: "white", flex: "0 0 auto" }}>
                  <ApartmentRoundedIcon />
                </Box>
                <Box sx={{ minWidth: 0 }}>
                  <Typography fontWeight={900} noWrap sx={{ fontSize: { xs: 15.5, sm: 20 } }}>{localSession.tenantName}</Typography>
                  <Typography variant="caption" color="text.secondary" noWrap display="block">Bloco {localSession.block} Apto {localSession.apartment}</Typography>
                </Box>
              </Stack>
              <Stack direction="row" spacing={0.25}>
                <Tooltip title="Meu acesso">
                  <IconButton onClick={openAccount} aria-label="Meu acesso"><ManageAccountsOutlinedIcon /></IconButton>
                </Tooltip>
                <Tooltip title="Sair">
                  <IconButton onClick={() => void logout()} aria-label="Sair"><LogoutIcon /></IconButton>
                </Tooltip>
              </Stack>
            </Stack>
          </CardContent>
        </Card>

        {error && <Alert severity="error" sx={{ mb: 1.5, borderRadius: 2.5 }}>{error}</Alert>}
        {success && <Alert severity="success" sx={{ mb: 1.5, borderRadius: 2.5 }}>{success}</Alert>}

        {!data ? (
          <Box sx={{ display: "grid", placeItems: "center", py: 10 }}><CircularProgress /></Box>
        ) : (
          <>
            <Box component="section" sx={{ mb: 2.5 }}>
              <Stack direction="row" alignItems="flex-start" spacing={1} sx={{ mb: 1.25 }}>
                <KeyIcon color="primary" sx={{ mt: 0.2 }} />
                <Box>
                  <Typography fontWeight={900} sx={{ fontSize: { xs: 17, sm: 20 } }}>Chaves das áreas de lazer</Typography>
                  <Typography variant="body2" color="text.secondary">Solicite ou devolva a chave com poucos toques.</Typography>
                </Box>
              </Stack>
              <Box sx={{ display: "grid", gridTemplateColumns: { xs: "repeat(2,minmax(0,1fr))", md: "repeat(4,minmax(0,1fr))" }, gap: { xs: 1, sm: 1.5 } }}>
                {(["GYM", "GAMES_ROOM", "PLAYROOM", "SAUNA"] as SpaceType[]).map(type => (
                  <SpaceButton key={type} type={type} rows={activeRows} busy={busySpace === type} onClick={() => void toggleSpace(type)} />
                ))}
              </Box>
            </Box>

            <Box component="section" sx={{ mb: 2.5 }}>
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.25 }}>
                <HomeOutlinedIcon color="primary" />
                <Box>
                  <Typography fontWeight={900} sx={{ fontSize: { xs: 17, sm: 20 } }}>Minha unidade</Typography>
                  <Typography variant="body2" color="text.secondary">Moradores e cadastros vinculados ao apartamento.</Typography>
                </Box>
              </Stack>
              <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "repeat(2,minmax(0,1fr))" }, gap: 1.25 }}>
                <RegistryCards title="Condôminos" rows={data.residents} icon={<PeopleAltOutlinedIcon color="primary" />} onEdit={openProfile} />
                <RegistryCards title="Veículos" rows={data.vehicles} icon={<DirectionsCarOutlinedIcon color="primary" />} />
                <RegistryCards title="Pets" rows={data.pets} icon={<PetsOutlinedIcon color="primary" />} />
                <RegistryCards title="Bicicletas" rows={data.bicycles} icon={<PedalBikeOutlinedIcon color="primary" />} />
              </Box>
            </Box>

            <Card component="section" variant="outlined" sx={{ mb: 1.5, borderRadius: 3 }}>
              <CardContent sx={{ p: { xs: 1.5, sm: 2 }, "&:last-child": { pb: { xs: 1.5, sm: 2 } } }}>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.25 }}>
                  <Inventory2OutlinedIcon color="primary" />
                  <Typography fontWeight={900}>Encomendas</Typography>
                  <Chip size="small" label={data.packIds.length} sx={{ ml: "auto !important", height: 22 }} />
                </Stack>

                <Stack spacing={0.9} sx={{ display: { xs: "flex", md: "none" } }}>
                  {data.packIds.length === 0 && <Typography variant="body2" color="text.secondary">Nenhuma encomenda no período desta ocupação.</Typography>}
                  {data.packIds.map(row => (
                    <Box key={row.id} sx={{ p: 1.15, borderRadius: 2, bgcolor: "action.hover" }}>
                      <Stack direction="row" justifyContent="space-between" spacing={1}>
                        <Typography variant="body2" fontWeight={800} sx={{ overflowWrap: "anywhere" }}>{row.labelPackageCode || row.packageCode}</Typography>
                        {row.bookPage && <Chip size="small" variant="outlined" label={`Pág. ${row.bookPage}`} sx={{ height: 22, flex: "0 0 auto" }} />}
                      </Stack>
                      <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.35 }}>{formatDateTime(row.arrivedAt)}</Typography>
                      {row.createdBy && <Typography variant="caption" color="text.secondary">Recebido por {row.createdBy}</Typography>}
                    </Box>
                  ))}
                </Stack>

                <TableContainer sx={{ display: { xs: "none", md: "block" } }}>
                  <Table size="small">
                    <TableHead><TableRow><TableCell>Data</TableCell><TableCell>Página</TableCell><TableCell>Código</TableCell><TableCell>Recebido por</TableCell></TableRow></TableHead>
                    <TableBody>
                      {data.packIds.length === 0 && <TableRow><TableCell colSpan={4} align="center">Nenhuma encomenda no período desta ocupação.</TableCell></TableRow>}
                      {data.packIds.map(row => <TableRow key={row.id}><TableCell>{formatDateTime(row.arrivedAt)}</TableCell><TableCell>{row.bookPage || "-"}</TableCell><TableCell>{row.labelPackageCode || row.packageCode}</TableCell><TableCell>{row.createdBy || "-"}</TableCell></TableRow>)}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>

            <Card component="section" variant="outlined" sx={{ borderRadius: 3 }}>
              <CardContent sx={{ p: { xs: 1.5, sm: 2 }, "&:last-child": { pb: { xs: 1.5, sm: 2 } } }}>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.25 }}>
                  <AccessTimeRoundedIcon color="primary" />
                  <Typography fontWeight={900}>Histórico das áreas de lazer</Typography>
                </Stack>

                <Stack spacing={0.9} sx={{ display: { xs: "flex", md: "none" } }}>
                  {data.spaceAccesses.length === 0 && <Typography variant="body2" color="text.secondary">Nenhuma solicitação.</Typography>}
                  {data.spaceAccesses.map(row => (
                    <Box key={row.id} sx={{ p: 1.15, borderRadius: 2, bgcolor: "action.hover" }}>
                      <Stack direction="row" justifyContent="space-between" spacing={1} alignItems="center">
                        <Typography variant="body2" fontWeight={800}>{spaceLabel(row.spaceType)}</Typography>
                        <Chip size="small" label={spaceAccessStatusLabel(row.status)} sx={{ height: 22 }} />
                      </Stack>
                      <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.4 }}>Solicitado: {formatDateTime(row.requestedAt)}</Typography>
                      {row.releasedAt && <Typography variant="caption" color="text.secondary" display="block">Liberado: {formatDateTime(row.releasedAt)}</Typography>}
                      {row.completedAt && <Typography variant="caption" color="text.secondary" display="block">Encerrado: {formatDateTime(row.completedAt)}</Typography>}
                    </Box>
                  ))}
                </Stack>

                <TableContainer sx={{ display: { xs: "none", md: "block" } }}>
                  <Table size="small">
                    <TableHead><TableRow><TableCell>Área</TableCell><TableCell>Solicitado</TableCell><TableCell>Liberado</TableCell><TableCell>Pedido devolução</TableCell><TableCell>Encerrado</TableCell><TableCell>Status</TableCell></TableRow></TableHead>
                    <TableBody>
                      {data.spaceAccesses.length === 0 && <TableRow><TableCell colSpan={6} align="center">Nenhuma solicitação.</TableCell></TableRow>}
                      {data.spaceAccesses.map(row => <TableRow key={row.id}><TableCell>{spaceLabel(row.spaceType)}</TableCell><TableCell>{formatDateTime(row.requestedAt)}</TableCell><TableCell>{formatDateTime(row.releasedAt)}</TableCell><TableCell>{formatDateTime(row.returnRequestedAt)}</TableCell><TableCell>{formatDateTime(row.completedAt)}</TableCell><TableCell><Chip size="small" label={spaceAccessStatusLabel(row.status)} /></TableCell></TableRow>)}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          </>
        )}
      </Box>

      <Dialog open={Boolean(transferPrompt)} onClose={() => busySpace ? undefined : setTransferPrompt(null)} fullWidth maxWidth="sm" fullScreen={mobile}>
        <DialogTitle>Chave em uso por outra unidade</DialogTitle>
        <DialogContent>
          {transferPrompt && (
            <Stack spacing={2} sx={{ mt: 0.5 }}>
              <Alert severity="warning">
                A chave da <strong>{spaceLabel(transferPrompt.type)}</strong> já está com o morador da unidade <strong>Bloco {transferPrompt.availability.holderBlock || "-"} Apto {transferPrompt.availability.holderApartment || "-"}</strong>.
              </Alert>
              <Typography variant="body2">
                Ao assumir a responsabilidade, você confirma que receberá a chave dessa unidade. O sistema encerrará a responsabilidade anterior e deixará a chave em uso pela sua unidade.
              </Typography>
            </Stack>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 2, pb: mobile ? "calc(16px + env(safe-area-inset-bottom))" : 1 }}>
          <Button onClick={() => setTransferPrompt(null)} disabled={Boolean(busySpace)}>Cancelar</Button>
          <Button variant="contained" onClick={() => void assumeKeyResponsibility()} disabled={Boolean(busySpace)}>{busySpace ? "Transferindo..." : "Assumir responsabilidade"}</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={accountOpen} onClose={localSession.mustChangePassword ? undefined : () => setAccountOpen(false)} disableEscapeKeyDown={localSession.mustChangePassword} fullWidth maxWidth="sm" fullScreen={mobile}>
        <DialogTitle>{localSession.mustChangePassword ? "Troque a senha no primeiro acesso" : "Meu acesso"}</DialogTitle>
        <DialogContent>
          {localSession.mustChangePassword && <Alert severity="warning" sx={{ mb: 2 }}>A senha recebida é temporária. Crie uma nova senha antes de continuar.</Alert>}
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField label="Usuário" value={accountUsername} onChange={(e) => setAccountUsername(e.target.value)} fullWidth />
            <TextField label={localSession.mustChangePassword ? "Nova senha *" : "Nova senha (opcional)"} type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} helperText="Mínimo de 8 caracteres." fullWidth />
            <TextField label="Confirmar nova senha" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} fullWidth />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 2, pb: mobile ? "calc(16px + env(safe-area-inset-bottom))" : 1 }}>
          {!localSession.mustChangePassword && <Button onClick={() => setAccountOpen(false)}>Cancelar</Button>}
          <Button variant="contained" onClick={() => void saveAccount()} disabled={accountBusy}>{accountBusy ? "Salvando..." : "Salvar acesso"}</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(profileRow)} onClose={() => !profileBusy && setProfileRow(null)} fullWidth maxWidth="sm" fullScreen={mobile}>
        <DialogTitle>Meus dados</DialogTitle>
        <DialogContent>
          {profileRow && (
            <Stack spacing={2} sx={{ mt: 1 }}>
              <Stack direction="row" spacing={2} alignItems="center">
                <Avatar sx={{ width: 68, height: 68 }} src={profileRow.photoAvailable && profileRow.photoOwnedByCurrentUser ? residentRegistryPhotoUrl(profileRow.id, profileRow.updatedAt ?? profileRow.createdAt) : undefined}>{profileRow.name?.[0]?.toUpperCase()}</Avatar>
                <Box sx={{ minWidth: 0 }}>
                  <Typography fontWeight={800}>{profileRow.name}</Typography>
                  <Typography variant="body2" color="text.secondary">Bloco {profileRow.block} Apto {profileRow.apartment}</Typography>
                  <input ref={profilePhotoInputRef} type="file" accept="image/jpeg,image/png" hidden onChange={(e) => selectProfilePhoto(e.target.files?.[0])} />
                  <Button size="small" startIcon={<PhotoCameraOutlinedIcon />} onClick={() => profilePhotoInputRef.current?.click()} sx={{ mt: 0.5, textTransform: "none" }}>{profilePhoto ? "Trocar foto" : "Alterar foto"}</Button>
                  {profilePhoto && <Typography variant="caption" display="block" color="success.main" noWrap>{profilePhoto.name}</Typography>}
                </Box>
              </Stack>
              <Alert severity="info">Nome, documento, proprietário, PNE, bloco e apartamento são alterados pela administração.</Alert>
              <TextField label="Telefone" value={profileForm.phone} onChange={(e) => setProfileForm(v => ({ ...v, phone: e.target.value }))} fullWidth />
              <TextField label="E-mail" type="email" value={profileForm.email} onChange={(e) => setProfileForm(v => ({ ...v, email: e.target.value }))} fullWidth />
              <TextField label="Profissão" value={profileForm.profession} onChange={(e) => setProfileForm(v => ({ ...v, profession: e.target.value }))} fullWidth />
            </Stack>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 2, pb: mobile ? "calc(16px + env(safe-area-inset-bottom))" : 1 }}>
          <Button onClick={() => setProfileRow(null)} disabled={profileBusy}>Cancelar</Button>
          <Button variant="contained" onClick={() => void saveProfile()} disabled={profileBusy}>{profileBusy ? "Salvando..." : "Salvar"}</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
