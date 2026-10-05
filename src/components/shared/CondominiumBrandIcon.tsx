import { Box } from "@mui/material";
import { condominiumBrand } from "../../theme/condominiumBrand";

export default function CondominiumBrandIcon({ size = 72 }: Readonly<{ size?: number }>) {
  return (
    <Box
      component="svg"
      viewBox="0 0 64 64"
      role="img"
      aria-label="Condomínio residencial - casas e apartamentos"
      sx={{
        width: size,
        height: size,
        display: "block",
        flex: "0 0 auto",
        filter: "drop-shadow(0 16px 18px rgba(15,118,110,.18))",
      }}
    >
      <rect x="3" y="3" width="58" height="58" rx="16" fill={condominiumBrand.primary} />
      <g fill="none" stroke="#FFFFFF" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12.5 49V20.5L28 15v34" />
        <path d="M18 25h4M18 32h4M18 39h4" />
        <path d="M30 34.5 43.5 23 57 34.5" />
        <path d="M34 32v17h19V32" />
        <path d="M41 49V39h5v10" />
        <path d="M10 49h47" />
      </g>
    </Box>
  );
}
