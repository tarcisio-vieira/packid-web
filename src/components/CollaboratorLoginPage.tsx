import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  Stack,
  Typography,
} from "@mui/material";
import ApartmentRoundedIcon from "@mui/icons-material/ApartmentRounded";
import AdminPanelSettingsOutlinedIcon from "@mui/icons-material/AdminPanelSettingsOutlined";
import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import DoorFrontOutlinedIcon from "@mui/icons-material/DoorFrontOutlined";

export default function CollaboratorLoginPage({
  error,
  onGoogleLogin,
  onResidentAccess,
}: Readonly<{
  error?: string | null;
  onGoogleLogin: () => void;
  onResidentAccess: () => void;
}>) {
  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        px: 2,
        py: 4,
        background:
          "radial-gradient(circle at 15% 20%, rgba(25,118,210,.10), transparent 34%), radial-gradient(circle at 85% 80%, rgba(46,125,50,.08), transparent 30%), #f6f3ea",
      }}
    >
      <Card
        elevation={0}
        sx={{
          width: "100%",
          maxWidth: 450,
          borderRadius: 5,
          border: "1px solid",
          borderColor: "divider",
          boxShadow: "0 24px 70px rgba(25, 38, 55, .12)",
          overflow: "hidden",
        }}
      >
        <Box sx={{ height: 7, background: "linear-gradient(90deg, #1976d2, #42a5f5, #2e7d32)" }} />
        <CardContent sx={{ p: { xs: 3, sm: 4 } }}>
          <Stack alignItems="center" spacing={1.4} textAlign="center">
            <Box
              sx={{
                width: 68,
                height: 68,
                borderRadius: 4,
                display: "grid",
                placeItems: "center",
                bgcolor: "primary.main",
                color: "primary.contrastText",
                boxShadow: "0 12px 28px rgba(25,118,210,.28)",
              }}
            >
              <ApartmentRoundedIcon sx={{ fontSize: 38 }} />
            </Box>
            <Typography variant="h4" fontWeight={900} letterSpacing={-0.8}>
              VSGI Condomínio
            </Typography>
            <Chip
              icon={<AdminPanelSettingsOutlinedIcon />}
              label="Acesso de colaboradores"
              variant="outlined"
              color="primary"
              sx={{ fontWeight: 700 }}
            />
            <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 345 }}>
              Entre com a conta Google autorizada pelo condomínio.
            </Typography>
          </Stack>

          {error && <Alert severity="error" sx={{ mt: 3 }}>{error}</Alert>}

          <Button
            fullWidth
            size="large"
            variant="outlined"
            onClick={onGoogleLogin}
            sx={{
              mt: 3,
              py: 1.35,
              borderRadius: 2.5,
              color: "text.primary",
              borderColor: "divider",
              bgcolor: "background.paper",
              fontWeight: 800,
              textTransform: "none",
              "&:hover": { borderColor: "primary.main", bgcolor: "action.hover" },
            }}
            startIcon={
              <Box component="span" sx={{ fontSize: 19, fontWeight: 900, color: "#1a73e8", lineHeight: 1 }}>
                G
              </Box>
            }
          >
            Entrar com Google
          </Button>

          <Divider sx={{ my: 3 }} />
          <Button
            fullWidth
            color="inherit"
            endIcon={<ArrowForwardRoundedIcon />}
            startIcon={<DoorFrontOutlinedIcon />}
            onClick={onResidentAccess}
            sx={{ textTransform: "none", fontWeight: 700 }}
          >
            Acessar como morador
          </Button>
        </CardContent>
      </Card>
    </Box>
  );
}
