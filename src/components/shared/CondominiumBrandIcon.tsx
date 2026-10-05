import { Box } from "@mui/material";
import MapsHomeWorkRoundedIcon from "@mui/icons-material/MapsHomeWorkRounded";
import { condominiumBrand } from "../../theme/condominiumBrand";

export default function CondominiumBrandIcon({ size = 72 }: Readonly<{ size?: number }>) {
  return (
    <Box
      aria-label="VSGI Condomínio"
      sx={{
        width: size,
        height: size,
        borderRadius: `${Math.max(14, Math.round(size * 0.24))}px`,
        display: "grid",
        placeItems: "center",
        color: "white",
        background: `linear-gradient(145deg, ${condominiumBrand.primaryLight} 0%, ${condominiumBrand.primary} 52%, ${condominiumBrand.primaryDark} 100%)`,
        boxShadow: "0 16px 34px rgba(15,118,110,.24)",
        flex: "0 0 auto",
      }}
    >
      <MapsHomeWorkRoundedIcon sx={{ fontSize: Math.round(size * 0.52) }} />
    </Box>
  );
}
