import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
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
import {
  fetchResidentPortal,
  requestResidentSpace,
  residentLogout,
  residentRegistryPhotoUrl,
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

function RegistryCards({ title, rows, icon }: Readonly<{ title: string; rows: RegistryEntry[]; icon: ReactNode }>) {
  return (
    <Card variant="outlined">
      <CardContent>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5 }}>{icon}<Typography fontWeight={800}>{title} ({rows.length})</Typography></Stack>
        {rows.length === 0 ? <Typography variant="body2" color="text.secondary">Nenhum cadastro.</Typography> : (
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2,1fr)" }, gap: 1.25 }}>
            {rows.map(row => <Stack key={row.id} direction="row" spacing={1.2} alignItems="center" sx={{ p: 1, borderRadius: 1, bgcolor: "action.hover" }}>
              <Avatar src={row.photoAvailable && row.photoOwnedByCurrentUser ? residentRegistryPhotoUrl(row.id, row.updatedAt ?? row.createdAt) : undefined}>{row.name?.[0]?.toUpperCase()}</Avatar>
              <Box sx={{ minWidth: 0 }}><Typography variant="body2" fontWeight={700} noWrap>{row.name}</Typography><Typography variant="caption" color="text.secondary">{row.identifier || row.breed || row.model || row.document || "Cadastro da unidade"}</Typography></Box>
            </Stack>)}
          </Box>
        )}
      </CardContent>
    </Card>
  );
}

export default function ResidentPortal({ session, onLoggedOut }: Readonly<{ session: ResidentSession; onLoggedOut: () => void }>) {
  const [data, setData] = useState<ResidentPortalData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busySpace, setBusySpace] = useState<SpaceType | null>(null);

  const load = async () => {
    try { setData(await fetchResidentPortal()); setError(null); }
    catch (err) { setError(userFriendlyError(err, "Não foi possível carregar os dados da sua unidade.")); }
  };

  useEffect(() => { void load(); }, []);

  const activeRows = useMemo(() => data?.spaceAccesses ?? [], [data?.spaceAccesses]);

  const toggleSpace = async (type: SpaceType) => {
    setBusySpace(type); setError(null);
    try { await requestResidentSpace(type); await load(); }
    catch (err) { setError(userFriendlyError(err, "Não foi possível atualizar a solicitação da chave.")); }
    finally { setBusySpace(null); }
  };

  const logout = async () => {
    try { await residentLogout(); } finally { onLoggedOut(); }
  };

  return (
    <Box sx={{ maxWidth: 1250, mx: "auto", py: 2 }}>
      <Card elevation={2} sx={{ mb: 2 }}>
        <CardContent>
          <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" spacing={2} alignItems={{ sm: "center" }}>
            <Box>
              <Stack direction="row" spacing={1} alignItems="center"><HomeOutlinedIcon color="primary" /><Typography variant="h5" fontWeight={800}>{session.tenantName}</Typography></Stack>
              <Typography color="text.secondary">Olá, {session.residentName} · Bloco {session.block} / Apto {session.apartment}</Typography>
            </Box>
            <Button variant="outlined" startIcon={<LogoutIcon />} onClick={() => void logout()}>Sair</Button>
          </Stack>
        </CardContent>
      </Card>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {!data ? <Box sx={{ display: "flex", justifyContent: "center", py: 7 }}><CircularProgress /></Box> : <>
        <Typography variant="h6" fontWeight={800} sx={{ mb: 1 }}>Solicitar acesso à área de lazer</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Ao solicitar, a portaria receberá um aviso. Depois de usar a área, toque novamente no botão para informar que devolverá a chave.
        </Typography>
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2,1fr)", lg: "repeat(4,1fr)" }, gap: 2, mb: 3 }}>
          {(["GYM", "GAMES_ROOM", "PLAYROOM", "SAUNA"] as SpaceType[]).map(type => <SpaceButton key={type} type={type} rows={activeRows} busy={busySpace === type} onClick={() => void toggleSpace(type)} />)}
        </Box>

        <Typography variant="h6" fontWeight={800} sx={{ mb: 1.5 }}>Dados da sua unidade</Typography>
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "repeat(2,1fr)" }, gap: 2 }}>
          <RegistryCards title="Condôminos" rows={data.residents} icon={<PeopleAltOutlinedIcon color="primary" />} />
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
    </Box>
  );
}
