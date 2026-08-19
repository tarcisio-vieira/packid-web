import { Box, Stack, Typography } from "@mui/material";
import AccessTimeOutlinedIcon from "@mui/icons-material/AccessTimeOutlined";
import PersonOutlinedIcon from "@mui/icons-material/PersonOutlined";
import AssignmentOutlinedIcon from "@mui/icons-material/AssignmentOutlined";
import PoolOutlinedIcon from "@mui/icons-material/PoolOutlined";
import type { PoolCard, PoolCardSettings } from "../api";

function Field({ label, value, wide }: { label: string; value?: string | null; wide?: boolean }) {
  return (
    <Box sx={{ display: "flex", alignItems: "end", gap: 1, minWidth: 0, gridColumn: wide ? "1 / -1" : undefined }}>
      <Typography fontWeight={700} sx={{ whiteSpace: "nowrap", fontSize: { xs: 12, sm: 14 } }}>{label}</Typography>
      <Box sx={{ flex: 1, borderBottom: "1px solid #aaa", minHeight: 22, minWidth: 40 }}>
        <Typography noWrap sx={{ fontSize: { xs: 12, sm: 14 } }}>{value || ""}</Typography>
      </Box>
    </Box>
  );
}

function InfoRow({ icon, title, text }: { icon: React.ReactNode; title?: string; text?: string | null }) {
  if (!text) return null;
  return (
    <Stack direction="row" spacing={1.1} alignItems="flex-start">
      <Box sx={{ mt: .2, display: "flex", flexShrink: 0 }}>{icon}</Box>
      <Box>
        {title && <Typography fontWeight={700} sx={{ fontSize: { xs: 10.5, sm: 12.5 }, lineHeight: 1.25 }}>{title}</Typography>}
        <Typography sx={{ fontSize: { xs: 10, sm: 12 }, lineHeight: 1.3 }}>{text}</Typography>
      </Box>
    </Stack>
  );
}

export default function PoolCardVisual({ card, settings, logoUrl }: { card: PoolCard; settings: PoolCardSettings; logoUrl?: string }) {
  const color = settings.color || "#0B5C2B";
  const issue = card.issueDate ? new Date(`${card.issueDate}T12:00:00`).toLocaleDateString("pt-BR") : "";
  const valid = card.validUntil ? new Date(`${card.validUntil}T12:00:00`).toLocaleDateString("pt-BR") : "";
  return (
    <Box sx={{ width: "100%", maxWidth: 900, aspectRatio: { xs: "auto", sm: "1.58 / 1" }, minHeight: { xs: 680, sm: 370 }, mx: "auto", position: "relative", overflow: "hidden", border: `3px solid ${color}`, borderRadius: 4, bgcolor: "white", boxShadow: 2, p: { xs: 2, sm: 3 } }}>
      <Box sx={{ position: "absolute", left: -80, right: -30, bottom: -90, height: "31%", bgcolor: color, borderRadius: "55% 48% 0 0 / 45% 45% 0 0", transform: "rotate(3deg)", zIndex: 0 }} />
      <Box sx={{ position: "absolute", left: -70, right: 100, bottom: -52, height: "25%", bgcolor: color, opacity: .72, borderRadius: "55% 50% 0 0 / 50% 50% 0 0", transform: "rotate(8deg)", zIndex: 0 }} />

      <Box sx={{ position: "relative", zIndex: 1, display: "grid", gridTemplateColumns: { xs: "1fr", sm: "56% 44%" }, height: { xs: "auto", sm: "82%" } }}>
        <Box sx={{ pr: { sm: 3 }, display: "flex", flexDirection: "column", gap: 2 }}>
          <Box sx={{ width: 145, height: 92, borderRadius: 2, overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", bgcolor: logoUrl ? "transparent" : color, color: "white" }}>
            {logoUrl ? <Box component="img" src={logoUrl} alt="Logo do condomínio" sx={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} /> : <Typography fontWeight={800} align="center" sx={{ fontSize: 14, px: 1 }}>{settings.condominiumName}</Typography>}
          </Box>
          <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}>
            <Field label="Bloco:" value={card.block} />
            <Field label="Apto:" value={card.apartment} />
            <Field label="Nome:" value={card.residentName} wide />
            <Field label="Emissão:" value={issue} />
            <Typography sx={{ fontSize: { xs: 12, sm: 14 } }}><b>Validade:</b> {valid}</Typography>
          </Box>
          <Stack direction="row" spacing={3} alignItems="center">
            <Typography fontWeight={700} sx={{ fontSize: { xs: 12, sm: 14 } }}>Menor de 10 anos:</Typography>
            <Typography sx={{ fontSize: { xs: 12, sm: 14 } }}>Sim {card.underTen ? "☑" : "☐"}</Typography>
            <Typography sx={{ fontSize: { xs: 12, sm: 14 } }}>Não {!card.underTen ? "☑" : "☐"}</Typography>
          </Stack>
        </Box>

        <Box sx={{ pl: { sm: 3 }, pt: { xs: 2, sm: 0 }, mt: { xs: 1, sm: 0 }, borderLeft: { sm: `2px solid ${color}` }, borderTop: { xs: `2px solid ${color}`, sm: "none" }, display: "block" }}>
          <Typography align="center" fontWeight={800} sx={{ color, fontSize: { sm: 35, md: 45 }, lineHeight: 1 }}>{settings.title || "PISCINA"}</Typography>
          <Typography align="center" sx={{ fontSize: { sm: 19, md: 25 }, mb: 2 }}>{settings.subtitle || "USO DA PISCINA"}</Typography>
          <Stack spacing={1.8}>
            {settings.showOpeningHours && <InfoRow icon={<AccessTimeOutlinedIcon sx={{ color, fontSize: 25 }} />} title="Horário de funcionamento:" text={settings.openingHours} />}
            {settings.showClosedDays && <InfoRow icon={<PersonOutlinedIcon sx={{ color, fontSize: 25 }} />} text={settings.closedDaysMessage} />}
            {settings.showValidityMessage && <InfoRow icon={<AssignmentOutlinedIcon sx={{ color, fontSize: 25 }} />} text={settings.validityMessage} />}
          </Stack>
          {settings.showGeneralInfo && settings.generalInfo && <Typography sx={{ borderTop: "1px dashed #888", mt: 2, pt: 1, fontSize: 11 }}>{settings.generalInfo}</Typography>}
          {settings.additionalInfo && <Typography align="right" sx={{ mt: 1, fontSize: 11 }}>{settings.additionalInfo}</Typography>}
        </Box>
      </Box>
      <PoolOutlinedIcon sx={{ position: "absolute", zIndex: 2, left: 55, bottom: 22, fontSize: 75, color: "white" }} />
    </Box>
  );
}
