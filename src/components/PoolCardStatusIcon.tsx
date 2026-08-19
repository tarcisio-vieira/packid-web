import { Tooltip } from "@mui/material";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import HourglassEmptyOutlinedIcon from "@mui/icons-material/HourglassEmptyOutlined";
import type { PoolCardReviewStatus } from "../api";

function formatDate(value: string): string {
  const parsed = new Date(`${value}T12:00:00`);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleDateString("pt-BR");
}

export function poolCardStatusLabel(_status: PoolCardReviewStatus, valid: boolean, validUntil?: string | null): string {
  if (valid) return validUntil ? `Carteirinha válida até ${formatDate(validUntil)}` : "Carteirinha válida";
  if (validUntil) return `Carteirinha vencida em ${formatDate(validUntil)}`;
  return "Carteirinha indisponível";
}

export default function PoolCardStatusIcon({ status, valid, validUntil, size = 19 }: Readonly<{
  status?: PoolCardReviewStatus | null;
  valid?: boolean;
  validUntil?: string | null;
  size?: number;
}>) {
  const title = poolCardStatusLabel(status, valid, validUntil);
  const icon = status === "PENDING_REVIEW"
    ? <HourglassEmptyOutlinedIcon sx={{ fontSize: size, color: "warning.main" }} />
    : status === "APPROVED" && valid
      ? <CheckCircleOutlineIcon sx={{ fontSize: size, color: "success.main" }} />
      : <ErrorOutlineIcon sx={{ fontSize: size, color: "error.main" }} />;
  return <Tooltip title={title} arrow><span style={{ display: "inline-flex" }}>{icon}</span></Tooltip>;
}
