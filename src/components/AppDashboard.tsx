import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  Box,
  Button,
  Card,
  CardActionArea,
  CardContent,
  Chip,
  Paper,
  Skeleton,
  Stack,
  Typography,
} from "@mui/material";
import Inventory2RoundedIcon from "@mui/icons-material/Inventory2Rounded";
import DomainRoundedIcon from "@mui/icons-material/DomainRounded";
import PoolRoundedIcon from "@mui/icons-material/PoolRounded";
import SettingsRoundedIcon from "@mui/icons-material/SettingsRounded";
import KeyRoundedIcon from "@mui/icons-material/KeyRounded";
import LocalShippingRoundedIcon from "@mui/icons-material/LocalShippingRounded";
import AccessTimeRoundedIcon from "@mui/icons-material/AccessTimeRounded";
import CalendarMonthRoundedIcon from "@mui/icons-material/CalendarMonthRounded";
import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import WifiRoundedIcon from "@mui/icons-material/WifiRounded";
import WifiOffRoundedIcon from "@mui/icons-material/WifiOffRounded";
import { fetchRecentPackIds } from "../api";
import type { User } from "../api";

export type DashboardView = "identifyPackage" | "registry" | "spaces" | "poolCards" | "settings";

type Props = Readonly<{
  currentUser?: User | null;
  onNavigate: (view: DashboardView) => void;
}>;

type PackageStats = {
  today: number;
  pending: number;
  last7Days: number;
};

function startOfDay(date: Date) {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function firstName(name?: string) {
  const value = (name || "").trim();
  if (!value) return "";
  return value.split(/\s+/)[0];
}

export default function AppDashboard({ currentUser, onNavigate }: Props) {
  const [loading, setLoading] = useState(true);
  const [online, setOnline] = useState(() => navigator.onLine);
  const [stats, setStats] = useState<PackageStats>({ today: 0, pending: 0, last7Days: 0 });

  useEffect(() => {
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);
    globalThis.addEventListener("online", handleOnline);
    globalThis.addEventListener("offline", handleOffline);
    return () => {
      globalThis.removeEventListener("online", handleOnline);
      globalThis.removeEventListener("offline", handleOffline);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const items = await fetchRecentPackIds(200);
        if (cancelled) return;
        const now = new Date();
        const todayStart = startOfDay(now);
        const sevenDaysStart = startOfDay(now);
        sevenDaysStart.setDate(sevenDaysStart.getDate() - 6);

        setStats({
          today: items.filter((item) => new Date(item.arrivedAt) >= todayStart).length,
          pending: items.filter((item) => !item.handedOverAt).length,
          last7Days: items.filter((item) => new Date(item.arrivedAt) >= sevenDaysStart).length,
        });
      } catch (error) {
        console.warn("Não foi possível carregar os indicadores do dashboard:", error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    const refresh = () => void load();
    globalThis.addEventListener("packid:registered", refresh);
    return () => {
      cancelled = true;
      globalThis.removeEventListener("packid:registered", refresh);
    };
  }, []);

  const canViewPoolCards = currentUser?.canViewPoolCards
    ?? ["ADMIN", "SECRETARY", "PORTER", "POOL_ATTENDANT"].includes((currentUser?.role ?? "").toUpperCase());
  const canManageSettings = currentUser?.canManageSettings
    ?? ["ADMIN", "SECRETARY"].includes((currentUser?.role ?? "").toUpperCase());

  const actions = useMemo(() => {
    const items: Array<{ view: DashboardView; label: string; helper: string; icon: ReactNode }> = [
      { view: "registry" as const, label: "Gestão", helper: "Unidades, moradores e cadastros", icon: <DomainRoundedIcon /> },
      { view: "identifyPackage" as const, label: "PackID", helper: "Receber e localizar encomendas", icon: <Inventory2RoundedIcon /> },
      { view: "spaces" as const, label: "Área de lazer", helper: "Chaves, acessos e responsabilidades", icon: <KeyRoundedIcon /> },
    ];
    if (canViewPoolCards) {
      items.push({ view: "poolCards" as const, label: "Piscina", helper: "Carteirinhas e controle de acesso", icon: <PoolRoundedIcon /> });
    }
    return items;
  }, [canViewPoolCards]);

  const name = firstName(currentUser?.name);

  return (
    <Box sx={{ mb: 2.25 }}>
      <Paper
        elevation={0}
        sx={{
          overflow: "hidden",
          border: "1px solid",
          borderColor: "divider",
          background: "linear-gradient(135deg, rgba(13,92,54,.98) 0%, rgba(22,122,74,.94) 58%, rgba(69,165,116,.90) 100%)",
          color: "#fff",
          position: "relative",
          p: { xs: 2, sm: 2.75 },
          borderRadius: { xs: 3, sm: 4 },
          boxShadow: "0 18px 52px rgba(13,92,54,.16)",
          "&::after": {
            content: '""',
            position: "absolute",
            width: 220,
            height: 220,
            borderRadius: "50%",
            right: -72,
            top: -105,
            background: "rgba(255,255,255,.08)",
          },
        }}
      >
        <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" spacing={2} sx={{ position: "relative", zIndex: 1 }}>
          <Box>
            <Typography variant="overline" sx={{ opacity: .78, fontWeight: 800, letterSpacing: ".12em" }}>
              PAINEL OPERACIONAL
            </Typography>
            <Typography variant="h4" sx={{ mt: .25, fontSize: { xs: "1.65rem", sm: "2rem" } }}>
              {name ? `Olá, ${name}` : "VSGI Condomínio"}
            </Typography>
            <Typography sx={{ mt: .6, opacity: .86, maxWidth: 620, fontSize: { xs: ".9rem", sm: ".98rem" } }}>
              Acesso rápido às rotinas da portaria e da administração em uma única tela.
            </Typography>
          </Box>

          <Chip
            icon={online ? <WifiRoundedIcon /> : <WifiOffRoundedIcon />}
            label={online ? "Sistema online" : "Sem conexão"}
            sx={{
              alignSelf: { xs: "flex-start", sm: "center" },
              bgcolor: "rgba(255,255,255,.14)",
              color: "#fff",
              border: "1px solid rgba(255,255,255,.22)",
              fontWeight: 750,
              "& .MuiChip-icon": { color: "inherit" },
            }}
          />
        </Stack>

        <Box sx={{ mt: 2.25, display: "grid", gridTemplateColumns: { xs: "1fr 1fr", sm: "repeat(3, minmax(0,1fr))" }, gap: 1 }}>
          {[
            { label: "Recebidas hoje", value: stats.today, icon: <LocalShippingRoundedIcon /> },
            { label: "Aguardando retirada", value: stats.pending, icon: <AccessTimeRoundedIcon /> },
            { label: "Últimos 7 dias", value: stats.last7Days, icon: <CalendarMonthRoundedIcon /> },
          ].map((item, index) => (
            <Box
              key={item.label}
              sx={{
                p: { xs: 1.25, sm: 1.5 },
                borderRadius: 2.5,
                bgcolor: "rgba(255,255,255,.115)",
                border: "1px solid rgba(255,255,255,.16)",
                gridColumn: { xs: index === 2 ? "1 / -1" : "auto", sm: "auto" },
              }}
            >
              <Stack direction="row" alignItems="center" spacing={1}>
                <Box sx={{ display: "grid", placeItems: "center", opacity: .86 }}>{item.icon}</Box>
                <Box>
                  {loading ? <Skeleton width={46} height={30} sx={{ bgcolor: "rgba(255,255,255,.16)" }} /> : (
                    <Typography sx={{ fontSize: "1.35rem", fontWeight: 850, lineHeight: 1.1 }}>{item.value}</Typography>
                  )}
                  <Typography sx={{ fontSize: ".76rem", opacity: .78, mt: .25 }}>{item.label}</Typography>
                </Box>
              </Stack>
            </Box>
          ))}
        </Box>
      </Paper>

      <Box sx={{ mt: 1.5 }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
          <Box>
            <Typography sx={{ fontWeight: 850, fontSize: "1rem" }}>Acessos rápidos</Typography>
            <Typography variant="caption" color="text.secondary">Toque para abrir uma rotina</Typography>
          </Box>
          {canManageSettings && (
            <Button size="small" startIcon={<SettingsRoundedIcon />} onClick={() => onNavigate("settings")}>Ajustes</Button>
          )}
        </Stack>

        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "repeat(2, minmax(0,1fr))", md: `repeat(${actions.length}, minmax(0,1fr))` }, gap: 1 }}>
          {actions.map((action) => (
            <Card key={action.view} elevation={0} sx={{ minWidth: 0, borderRadius: 3 }}>
              <CardActionArea onClick={() => onNavigate(action.view)} sx={{ height: "100%", borderRadius: 3 }}>
                <CardContent sx={{ p: { xs: 1.35, sm: 1.6 }, "&:last-child": { pb: { xs: 1.35, sm: 1.6 } } }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1}>
                    <Box
                      sx={{
                        width: 38,
                        height: 38,
                        borderRadius: 2.2,
                        bgcolor: "rgba(22,122,74,.10)",
                        color: "primary.main",
                        display: "grid",
                        placeItems: "center",
                      }}
                    >
                      {action.icon}
                    </Box>
                    <ArrowForwardRoundedIcon sx={{ color: "text.disabled", fontSize: 19 }} />
                  </Stack>
                  <Typography sx={{ mt: 1.1, fontWeight: 820, fontSize: ".94rem" }}>{action.label}</Typography>
                  <Typography sx={{ mt: .35, color: "text.secondary", fontSize: ".72rem", lineHeight: 1.35 }}>
                    {action.helper}
                  </Typography>
                </CardContent>
              </CardActionArea>
            </Card>
          ))}
        </Box>
      </Box>
    </Box>
  );
}
