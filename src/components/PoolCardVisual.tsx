import type { ReactNode } from "react";
import { Box, Stack, Typography } from "@mui/material";
import AccessTimeOutlinedIcon from "@mui/icons-material/AccessTimeOutlined";
import PersonOutlinedIcon from "@mui/icons-material/PersonOutlined";
import AssignmentOutlinedIcon from "@mui/icons-material/AssignmentOutlined";
import PoolOutlinedIcon from "@mui/icons-material/PoolOutlined";
import type { PoolCard, PoolCardSettings } from "../api";
import PoolCardStatusIcon from "./PoolCardStatusIcon";

function Field({ label, value, wide }: { label: string; value?: string | null; wide?: boolean }) {
  return (
    <Box sx={{ display: "flex", alignItems: "end", gap: .75, minWidth: 0, gridColumn: wide ? "1 / -1" : undefined }}>
      <Typography fontWeight={700} sx={{ whiteSpace: "nowrap", fontSize: "clamp(9px, 1.55vw, 14px)" }}>{label}</Typography>
      <Box sx={{ flex: 1, borderBottom: "1px solid #aaa", minHeight: 18, minWidth: 28 }}>
        <Typography noWrap sx={{ fontSize: "clamp(9px, 1.55vw, 14px)" }}>{value || ""}</Typography>
      </Box>
    </Box>
  );
}

function InfoRow({ icon, title, text }: { icon: ReactNode; title?: string; text?: string | null }) {
  if (!text) return null;
  return (
    <Stack direction="row" spacing={.8} alignItems="flex-start">
      <Box sx={{ mt: .1, display: "flex", flexShrink: 0, "& svg": { fontSize: "clamp(16px, 2.7vw, 25px)" } }}>{icon}</Box>
      <Box sx={{ minWidth: 0 }}>
        {title && <Typography fontWeight={700} sx={{ fontSize: "clamp(8px, 1.35vw, 12.5px)", lineHeight: 1.2 }}>{title}</Typography>}
        <Typography sx={{ fontSize: "clamp(7.5px, 1.25vw, 12px)", lineHeight: 1.25 }}>{text}</Typography>
      </Box>
    </Stack>
  );
}

export default function PoolCardVisual({ card, settings, logoUrl }: Readonly<{ card: PoolCard; settings: PoolCardSettings; logoUrl?: string }>) {
  const color = settings.color || "#0B5C2B";
  const issue = card.issueDate ? new Date(`${card.issueDate}T12:00:00`).toLocaleDateString("pt-BR") : "";
  const valid = card.validUntil ? new Date(`${card.validUntil}T12:00:00`).toLocaleDateString("pt-BR") : "";
  return (
    <Box sx={{ width: "100%", maxWidth: 900, aspectRatio: "1.58 / 1", mx: "auto", position: "relative", overflow: "hidden", border: `3px solid ${color}`, borderRadius: 4, bgcolor: "white", boxShadow: 2, p: "clamp(10px, 2.6vw, 24px)" }}>
      <Box sx={{ position: "absolute", left: -80, right: -30, bottom: -90, height: "31%", bgcolor: color, borderRadius: "55% 48% 0 0 / 45% 45% 0 0", transform: "rotate(3deg)", zIndex: 0 }} />
      <Box sx={{ position: "absolute", left: -70, right: 100, bottom: -52, height: "25%", bgcolor: color, opacity: .72, borderRadius: "55% 50% 0 0 / 50% 50% 0 0", transform: "rotate(8deg)", zIndex: 0 }} />
      <Box sx={{ position: "absolute", right: "2%", top: "2%", zIndex: 3 }}>
        <PoolCardStatusIcon status={card.reviewStatus} valid={card.valid} validUntil={card.validUntil} size={22} />
      </Box>

      <Box sx={{ position: "relative", zIndex: 1, display: "grid", gridTemplateColumns: "56% 44%", height: "82%" }}>
        <Box sx={{ pr: "3%", display: "flex", flexDirection: "column", gap: "clamp(5px, 1.6vw, 16px)" }}>
          <Box sx={{ width: "29%", minWidth: 72, maxWidth: 145, aspectRatio: "1.58 / 1", borderRadius: 2, overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", bgcolor: logoUrl ? "transparent" : color, color: "white" }}>
            {logoUrl ? <Box component="img" src={logoUrl} alt="Logo do condomínio" sx={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} /> : <Typography fontWeight={800} align="center" sx={{ fontSize: "clamp(7px, 1.4vw, 14px)", px: .5 }}>{settings.condominiumName}</Typography>}
          </Box>
          <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "clamp(5px, 1.6vw, 16px)" }}>
            <Field label="Bloco:" value={card.block} />
            <Field label="Apto:" value={card.apartment} />
            <Field label="Nome:" value={card.residentName} wide />
            <Field label="Emissão:" value={issue} />
            <Typography noWrap sx={{ fontSize: "clamp(9px, 1.55vw, 14px)" }}><b>Validade:</b> {valid}</Typography>
          </Box>
          <Stack direction="row" spacing="clamp(8px, 2.5vw, 24px)" alignItems="center" flexWrap="nowrap">
            <Typography fontWeight={700} noWrap sx={{ fontSize: "clamp(9px, 1.55vw, 14px)" }}>Menor de 10 anos:</Typography>
            <Typography noWrap sx={{ fontSize: "clamp(9px, 1.55vw, 14px)" }}>Sim {card.underTen ? "☑" : "☐"}</Typography>
            <Typography noWrap sx={{ fontSize: "clamp(9px, 1.55vw, 14px)" }}>Não {!card.underTen ? "☑" : "☐"}</Typography>
          </Stack>
        </Box>

        <Box sx={{ pl: "5%", borderLeft: `2px solid ${color}`, display: "block", minWidth: 0 }}>
          <Typography align="center" fontWeight={800} noWrap sx={{ color, fontSize: "clamp(22px, 5vw, 45px)", lineHeight: 1 }}>{settings.title || "PISCINA"}</Typography>
          <Typography align="center" noWrap sx={{ fontSize: "clamp(12px, 2.8vw, 25px)", mb: "clamp(5px, 1.6vw, 16px)" }}>{settings.subtitle || "USO DA PISCINA"}</Typography>
          <Stack spacing="clamp(4px, 1.4vw, 14px)">
            {settings.showOpeningHours && <InfoRow icon={<AccessTimeOutlinedIcon sx={{ color }} />} title="Horário de funcionamento:" text={settings.openingHours} />}
            {settings.showClosedDays && <InfoRow icon={<PersonOutlinedIcon sx={{ color }} />} text={settings.closedDaysMessage} />}
            {settings.showValidityMessage && <InfoRow icon={<AssignmentOutlinedIcon sx={{ color }} />} text={settings.validityMessage} />}
          </Stack>
          {settings.showGeneralInfo && settings.generalInfo && <Typography sx={{ borderTop: "1px dashed #888", mt: 1, pt: .6, fontSize: "clamp(7px, 1.15vw, 11px)", lineHeight: 1.2 }}>{settings.generalInfo}</Typography>}
          {settings.additionalInfo && <Typography align="right" noWrap sx={{ mt: .5, fontSize: "clamp(7px, 1.15vw, 11px)" }}>{settings.additionalInfo}</Typography>}
        </Box>
      </Box>
      <PoolOutlinedIcon sx={{ position: "absolute", zIndex: 2, left: "6%", bottom: "2.5%", fontSize: "clamp(35px, 8vw, 75px)", color: "white" }} />
    </Box>
  );
}
