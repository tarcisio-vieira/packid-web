import type { ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
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
  Pagination,
  Stack,
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
import ExpandMoreRoundedIcon from "@mui/icons-material/ExpandMoreRounded";
import LocalShippingOutlinedIcon from "@mui/icons-material/LocalShippingOutlined";
import BuildOutlinedIcon from "@mui/icons-material/BuildOutlined";
import PoolOutlinedIcon from "@mui/icons-material/PoolOutlined";
import PictureAsPdfOutlinedIcon from "@mui/icons-material/PictureAsPdfOutlined";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import {
  fetchResidentPortal,
  fetchResidentSpaceAvailability,
  requestResidentSpace,
  residentLogout,
  residentRegistryPhotoUrl,
  updateResidentCredentials,
  updateResidentProfile,
  uploadResidentProfilePhoto,
  requestResidentPackagePickup,
  residentCondominiumLogoUrl,
  residentPoolCardPdfUrl,
  userFriendlyError,
  type RegistryEntry,
  type VisitorVisit,
  type DeliveryRecord,
  type ServiceRecord,
  type ResidentPortalData,
  type ResidentSession,
  type SpaceAccess,
  type SpaceKeyAvailability,
  type SpaceType,
  type PoolCard,
} from "../api";
import PoolCardVisual from "./PoolCardVisual";
import { spaceAccessStatusLabel, spaceLabel } from "./SpacesScreen";

function formatDateTime(value?: string | null): string {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Sao_Paulo" }).format(date);
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

const PAGE_SIZE = 10;

function PagedAccordion<T extends { id: string }>({
  title,
  rows,
  icon,
  emptyText,
  renderRow,
}: Readonly<{
  title: string;
  rows: T[];
  icon: ReactNode;
  emptyText: string;
  renderRow: (row: T) => ReactNode;
}>) {
  const [page, setPage] = useState(1);
  const pageCount = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));

  useEffect(() => {
    setPage(1);
  }, [rows]);

  const visibleRows = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <Accordion
      disableGutters
      elevation={0}
      sx={{
        border: "1px solid",
        borderColor: "divider",
        borderRadius: "12px !important",
        overflow: "hidden",
        bgcolor: "background.paper",
        "&:before": { display: "none" },
      }}
    >
      <AccordionSummary
        expandIcon={<ExpandMoreRoundedIcon />}
        sx={{
          minHeight: 56,
          px: { xs: 1.4, sm: 2 },
          "& .MuiAccordionSummary-content": { my: 1 },
        }}
      >
        <Stack direction="row" spacing={1} alignItems="center" sx={{ width: "100%", minWidth: 0 }}>
          {icon}
          <Typography fontWeight={850} sx={{ minWidth: 0, flexGrow: 1 }}>{title}</Typography>
          <Chip size="small" label={rows.length} sx={{ height: 22, mr: 0.5 }} />
        </Stack>
      </AccordionSummary>
      <AccordionDetails sx={{ px: { xs: 1.25, sm: 2 }, pt: 0, pb: 1.5 }}>
        {rows.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ py: 0.75 }}>{emptyText}</Typography>
        ) : (
          <>
            <Stack spacing={0.75}>{visibleRows.map(renderRow)}</Stack>
            {pageCount > 1 && (
              <Stack alignItems="center" sx={{ pt: 1.5 }}>
                <Pagination
                  page={page}
                  count={pageCount}
                  size="small"
                  siblingCount={0}
                  boundaryCount={1}
                  onChange={(_, nextPage) => setPage(nextPage)}
                />
                <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
                  {Math.min((page - 1) * PAGE_SIZE + 1, rows.length)}-{Math.min(page * PAGE_SIZE, rows.length)} de {rows.length}
                </Typography>
              </Stack>
            )}
          </>
        )}
      </AccordionDetails>
    </Accordion>
  );
}

function RegistryAccordion({
  title,
  rows,
  icon,
  onEdit,
}: Readonly<{ title: string; rows: RegistryEntry[]; icon: ReactNode; onEdit?: (row: RegistryEntry) => void }>) {
  return (
    <PagedAccordion
      title={title}
      rows={rows}
      icon={icon}
      emptyText="Nenhum cadastro."
      renderRow={(row) => (
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
      )}
    />
  );
}

type ProfileForm = { phone: string; email: string; profession: string };

export default function ResidentPortal({ session, onLoggedOut }: Readonly<{ session: ResidentSession; onLoggedOut: () => void }>) {
  const theme = useTheme();
  const mobile = useMediaQuery(theme.breakpoints.down("sm"));
  const mobilePortrait = useMediaQuery("(orientation: portrait)");
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
  const [pickupBusy, setPickupBusy] = useState<string | null>(null);
  const [poolCardOpen, setPoolCardOpen] = useState<PoolCard | null>(null);
  const [logoVisible, setLogoVisible] = useState(true);
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

  useEffect(() => {
    if (session.mustChangePassword) return;
    let cancelled = false;
    let refreshing = false;

    const refreshSpaces = async () => {
      if (cancelled || refreshing || document.visibilityState !== "visible") return;
      refreshing = true;
      try {
        const portal = await fetchResidentPortal();
        if (!cancelled) { setData(portal); setLocalSession(portal.session); }
      } catch {
        // A atualização automática não substitui os dados já exibidos nem interrompe o uso do portal.
      } finally {
        refreshing = false;
      }
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") void refreshSpaces();
    };

    const timer = globalThis.setInterval(() => void refreshSpaces(), 5000);
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      cancelled = true;
      globalThis.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [session.mustChangePassword]);

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
                {logoVisible && (
                  <Box sx={{ width: 42, height: 42, borderRadius: 2.2, display: "grid", placeItems: "center", flex: "0 0 auto", overflow: "hidden" }}>
                    <Box component="img" src={residentCondominiumLogoUrl()} alt="Logo do condomínio" onError={() => setLogoVisible(false)} sx={{ width: "100%", height: "100%", objectFit: "contain", bgcolor: "white" }} />
                  </Box>
                )}
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

            {data.poolCards?.length > 0 && <Box component="section" sx={{ mb: 2.5 }}>
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.25 }}>
                <PoolOutlinedIcon color="primary" />
                <Box><Typography fontWeight={900} sx={{ fontSize: { xs: 17, sm: 20 } }}>Carteirinhas de Piscina</Typography><Typography variant="body2" color="text.secondary">Visualize ou exporte sua carteirinha para PDF.</Typography></Box>
              </Stack>
              <Stack spacing={1}>{data.poolCards.map(card => <Card variant="outlined" key={card.id} sx={{ borderRadius: 2.5 }}><CardContent sx={{ p: 1.5, "&:last-child": { pb: 1.5 } }}>
                <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
                  <Box><Typography fontWeight={800}>{card.residentName}</Typography><Typography variant="caption" color="text.secondary">Validade: {new Date(`${card.validUntil}T12:00:00`).toLocaleDateString("pt-BR")} · {card.valid ? "Válida" : "Fora da validade"}</Typography></Box>
                  <Stack direction="row"><Button size="small" startIcon={<PoolOutlinedIcon />} onClick={() => setPoolCardOpen(card)}>Mostrar</Button><Tooltip title="Exportar PDF"><IconButton component="a" href={residentPoolCardPdfUrl(card.id)}><PictureAsPdfOutlinedIcon /></IconButton></Tooltip></Stack>
                </Stack>
              </CardContent></Card>)}</Stack>
            </Box>}

            <Box component="section" sx={{ mb: 2.5 }}>
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.25 }}>
                <HomeOutlinedIcon color="primary" />
                <Box>
                  <Typography fontWeight={900} sx={{ fontSize: { xs: 17, sm: 20 } }}>Minha unidade</Typography>
                  <Typography variant="body2" color="text.secondary">Toque em uma categoria para visualizar os dados.</Typography>
                </Box>
              </Stack>
              <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "repeat(2,minmax(0,1fr))" }, gap: 1 }}>
                <RegistryAccordion title="Condôminos" rows={data.residents} icon={<PeopleAltOutlinedIcon color="primary" />} onEdit={openProfile} />
                <RegistryAccordion title="Veículos" rows={data.vehicles} icon={<DirectionsCarOutlinedIcon color="primary" />} />
                <RegistryAccordion title="Pets" rows={data.pets} icon={<PetsOutlinedIcon color="primary" />} />
                <RegistryAccordion title="Bicicletas" rows={data.bicycles} icon={<PedalBikeOutlinedIcon color="primary" />} />
              </Box>
            </Box>

            <Box component="section">
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.25 }}>
                <AccessTimeRoundedIcon color="primary" />
                <Box>
                  <Typography fontWeight={900} sx={{ fontSize: { xs: 17, sm: 20 } }}>Histórico da unidade</Typography>
                  <Typography variant="body2" color="text.secondary">Registros desta ocupação. As listas iniciam fechadas.</Typography>
                </Box>
              </Stack>

              <Stack spacing={1}>
                <PagedAccordion
                  title="Encomendas"
                  rows={data.packIds}
                  icon={<Inventory2OutlinedIcon color="primary" />}
                  emptyText="Nenhuma encomenda no período desta ocupação."
                  renderRow={(row) => (
                    <Box key={row.id} sx={{ p: 1.15, borderRadius: 2, bgcolor: "action.hover" }}>
                      <Stack direction="row" justifyContent="space-between" spacing={1}>
                        <Box sx={{ minWidth: 0 }}><Stack direction="row" alignItems="center" spacing={.5}><Typography variant="body2" fontWeight={800} sx={{ overflowWrap: "anywhere" }}>{row.labelPackageCode || row.packageCode}</Typography>{row.residentAcknowledgedAt && <Tooltip title="Solicitação de retirada registrada pelo aplicativo. Não é necessário assinar o caderno de entrega."><CheckCircleOutlineIcon sx={{ color: "text.disabled", fontSize: 17 }} /></Tooltip>}</Stack>
                        <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.35 }}>{formatDateTime(row.arrivedAt)}</Typography>{row.createdBy && <Typography variant="caption" color="text.secondary">Recebido por {row.createdBy}</Typography>}</Box>
                        {row.bookPage && <Chip size="small" variant="outlined" label={`Pág. ${row.bookPage}`} sx={{ height: 22, flex: "0 0 auto" }} />}
                      </Stack>
                      <Box sx={{ mt: .75 }}>
                        {row.handedOverAt ? <Chip size="small" label={`Entregue em ${formatDateTime(row.handedOverAt)}`} color="success" variant="outlined" /> : row.residentAcknowledgedAt ? <Chip size="small" label="Retirada solicitada" variant="outlined" /> : <Button size="small" variant="outlined" disabled={pickupBusy === row.id} onClick={async () => { setPickupBusy(row.id); setError(null); try { await requestResidentPackagePickup(row.id); setSuccess("Portaria avisada. Sua encomenda está com retirada solicitada."); await load(); } catch (e) { setError(userFriendlyError(e, "Não foi possível solicitar a retirada.")); } finally { setPickupBusy(null); } }}>Solicitar retirada</Button>}
                      </Box>
                    </Box>
                  )}
                />

                <PagedAccordion<VisitorVisit>
                  title="Visitantes"
                  rows={data.visits}
                  icon={<PeopleAltOutlinedIcon color="primary" />}
                  emptyText="Nenhuma visita registrada no período desta ocupação."
                  renderRow={(row) => (
                    <Box key={row.id} sx={{ p: 1.15, borderRadius: 2, bgcolor: "action.hover" }}>
                      <Typography variant="body2" fontWeight={800}>{row.visitorName || "Visitante"}</Typography>
                      <Typography variant="caption" color="text.secondary" display="block">{formatDateTime(row.visitedAt)}</Typography>
                      {row.visitorDocument && <Typography variant="caption" color="text.secondary" display="block">Documento: {row.visitorDocument}</Typography>}
                      {row.notes && <Typography variant="caption" color="text.secondary" display="block">{row.notes}</Typography>}
                    </Box>
                  )}
                />

                <PagedAccordion<DeliveryRecord>
                  title="Entregadores"
                  rows={data.deliveries}
                  icon={<LocalShippingOutlinedIcon color="primary" />}
                  emptyText="Nenhuma entrega registrada no período desta ocupação."
                  renderRow={(row) => (
                    <Box key={row.id} sx={{ p: 1.15, borderRadius: 2, bgcolor: "action.hover" }}>
                      <Stack direction="row" justifyContent="space-between" spacing={1} alignItems="flex-start">
                        <Box sx={{ minWidth: 0 }}>
                          <Typography variant="body2" fontWeight={800}>{row.deliveryPersonName || "Entregador"}</Typography>
                          {row.company && <Typography variant="caption" color="text.secondary" display="block">{row.company}</Typography>}
                        </Box>
                        <Chip size="small" variant="outlined" label={row.authorizedToEnter ? "Entrada autorizada" : "Sem entrada"} sx={{ height: 22, flex: "0 0 auto" }} />
                      </Stack>
                      <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.35 }}>{formatDateTime(row.deliveredAt)}</Typography>
                      {row.notes && <Typography variant="caption" color="text.secondary" display="block">{row.notes}</Typography>}
                    </Box>
                  )}
                />

                <PagedAccordion<ServiceRecord>
                  title="Prestadores de serviço"
                  rows={data.serviceRecords}
                  icon={<BuildOutlinedIcon color="primary" />}
                  emptyText="Nenhum serviço registrado no período desta ocupação."
                  renderRow={(row) => (
                    <Box key={row.id} sx={{ p: 1.15, borderRadius: 2, bgcolor: "action.hover" }}>
                      <Typography variant="body2" fontWeight={800}>{row.serviceProviderName || "Prestador de serviço"}</Typography>
                      {row.serviceCompanyName && <Typography variant="caption" color="text.secondary" display="block">{row.serviceCompanyName}</Typography>}
                      <Typography variant="caption" color="text.secondary" display="block">{formatDateTime(row.performedAt)}</Typography>
                      <Typography variant="caption" color="text.secondary" display="block">Serviço: {row.serviceDescription}</Typography>
                      {row.notes && <Typography variant="caption" color="text.secondary" display="block">{row.notes}</Typography>}
                    </Box>
                  )}
                />

                <PagedAccordion<SpaceAccess>
                  title="Áreas de lazer"
                  rows={data.spaceAccesses}
                  icon={<AccessTimeRoundedIcon color="primary" />}
                  emptyText="Nenhuma solicitação de área de lazer."
                  renderRow={(row) => (
                    <Box key={row.id} sx={{ p: 1.15, borderRadius: 2, bgcolor: "action.hover" }}>
                      <Stack direction="row" justifyContent="space-between" spacing={1} alignItems="center">
                        <Typography variant="body2" fontWeight={800}>{spaceLabel(row.spaceType)}</Typography>
                        <Chip size="small" label={spaceAccessStatusLabel(row.status)} sx={{ height: 22 }} />
                      </Stack>
                      <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.4 }}>Solicitado: {formatDateTime(row.requestedAt)}</Typography>
                      {row.releasedAt && <Typography variant="caption" color="text.secondary" display="block">Liberado: {formatDateTime(row.releasedAt)}</Typography>}
                      {row.returnRequestedAt && <Typography variant="caption" color="text.secondary" display="block">Devolução solicitada: {formatDateTime(row.returnRequestedAt)}</Typography>}
                      {row.completedAt && <Typography variant="caption" color="text.secondary" display="block">Encerrado: {formatDateTime(row.completedAt)}</Typography>}
                    </Box>
                  )}
                />
              </Stack>
            </Box>
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

      <Dialog open={Boolean(poolCardOpen)} onClose={() => setPoolCardOpen(null)} fullWidth maxWidth="md" fullScreen={mobile}>
        <DialogTitle>Carteirinha de Piscina</DialogTitle>
        <DialogContent sx={mobile ? { px: 1, py: 1, overflowX: "auto" } : undefined}>
          {poolCardOpen && data?.poolCardSettings && (
            <Stack spacing={1.25} sx={{ minWidth: mobile ? 660 : 0, pb: 1 }}>
              {mobile && mobilePortrait && (
                <Alert severity="info" sx={{ mx: 0.5 }}>
                  Para visualizar melhor, gire o celular para o modo paisagem.
                </Alert>
              )}
              <PoolCardVisual
                card={poolCardOpen}
                settings={data.poolCardSettings}
                logoUrl={data.poolCardSettings.logoAvailable ? residentCondominiumLogoUrl() : undefined}
                forceLandscape={mobile}
              />
            </Stack>
          )}
        </DialogContent>
        <DialogActions sx={mobile ? { px: 2, pb: "calc(16px + env(safe-area-inset-bottom))" } : undefined}>{poolCardOpen && <Button component="a" href={residentPoolCardPdfUrl(poolCardOpen.id)} startIcon={<PictureAsPdfOutlinedIcon />}>Exportar PDF</Button>}<Button onClick={() => setPoolCardOpen(null)}>Fechar</Button></DialogActions>
      </Dialog>
    </Box>
  );
}
