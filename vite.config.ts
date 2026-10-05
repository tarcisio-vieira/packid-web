import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  let base = "/condominio/";

  if (mode === "android") {
    base = "./";
  } else if (mode === "dev") {
    base = "/packid-dev/";
  }

  return {
    plugins: [react()],
    base,
  };
});
