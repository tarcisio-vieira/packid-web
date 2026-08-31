import { Tooltip } from "@mui/material";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";

function formatDate(value: string): string {
  const parsed = new Date(`${value}T12:00:00`);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleDateString("pt-BR");
}

export function poolCardStatusLabel(valid: boolean, validUntil?: string | null): string {
  if (valid) return validUntil ? `Carteirinha válida até ${formatDate(validUntil)}` : "Carteirinha válida";
  if (validUntil) return `Carteirinha vencida em ${formatDate(validUntil)}`;
  return "Carteirinha indisponível";
}

export default function PoolCardStatusIcon({ valid = false, validUntil, size = 19 }: Readonly<{
  valid?: boolean;
  validUntil?: string | null;
  size?: number;
}>) {
  const title = poolCardStatusLabel(valid, validUntil);
  const icon = valid
    ? <CheckCircleOutlineIcon sx={{ fontSize: size, color: "success.main" }} />
    : <ErrorOutlineIcon sx={{ fontSize: size, color: "error.main" }} />;
  return <Tooltip title={title} arrow><span style={{ display: "inline-flex" }}>{icon}</span></Tooltip>;
}
