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

  if (rotate) {
    return (
      <Box
        sx={{
          width: "100%",
          height: "calc(100dvh - 126px)",
          minHeight: 420,
          position: "relative",
          overflow: "hidden",
          boxSizing: "border-box",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Box
          sx={{
            width: "min(142vw, calc(100dvh - 150px), 900px)",
            maxWidth: "none",
            flexShrink: 0,
            transform: "rotate(90deg)",
            transformOrigin: "center center",
            boxSizing: "border-box",
          }}
        >
          <PoolCardVisual card={card} settings={settings} logoUrl={logoUrl} />
        </Box>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        width: "100%",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        overflow: "hidden",
        px: 0.5,
        py: 0.5,
        boxSizing: "border-box",
      }}
    >
      <Box sx={{ width: "100%", maxWidth: 900, boxSizing: "border-box" }}>
        <PoolCardVisual card={card} settings={settings} logoUrl={logoUrl} />
      </Box>
    </Box>
  );
}
