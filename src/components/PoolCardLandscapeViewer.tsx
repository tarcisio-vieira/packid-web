import { Box, useMediaQuery, useTheme } from "@mui/material";
import type { PoolCard, PoolCardSettings } from "../api";
import PoolCardVisual from "./PoolCardVisual";

export default function PoolCardLandscapeViewer({ card, settings, logoUrl }: Readonly<{
  card: PoolCard;
  settings: PoolCardSettings;
  logoUrl?: string;
}>) {
  const theme = useTheme();
  const mobile = useMediaQuery(theme.breakpoints.down("sm"));
  const portrait = useMediaQuery("(orientation: portrait)");
  const rotate = mobile && portrait;

  return (
    <Box
      sx={{
        width: "100%",
        minHeight: rotate ? "calc(100dvh - 126px)" : "auto",
        display: "grid",
        placeItems: "center",
        overflow: "hidden",
        px: rotate ? 0 : 1,
        py: rotate ? 0 : 1,
      }}
    >
      <Box
        sx={rotate ? {
          width: "min(142vw, calc(100dvh - 150px), 900px)",
          maxWidth: "none",
          transform: "rotate(90deg)",
          transformOrigin: "center center",
          flexShrink: 0,
        } : {
          width: "min(900px, calc(100vw - 32px))",
          maxWidth: "100%",
        }}
      >
        <PoolCardVisual card={card} settings={settings} logoUrl={logoUrl} />
      </Box>
    </Box>
  );
}
