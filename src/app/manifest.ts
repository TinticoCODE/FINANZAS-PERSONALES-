import type { MetadataRoute } from "next";

const APP_NAME = "SharkMoney";
const APP_DESCRIPTION =
  "Administra tus finanzas personales con claridad, control y velocidad.";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${APP_NAME} — Finanzas Personales`,
    short_name: APP_NAME,
    description: APP_DESCRIPTION,
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait-primary",
    lang: "es",
    dir: "ltr",
    background_color: "#0a0a0a",
    theme_color: "#0a0a0a",
    categories: ["finance", "productivity"],
    icons: [
      {
        src: "/icons/icon-192x192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-192x192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icons/icon-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
