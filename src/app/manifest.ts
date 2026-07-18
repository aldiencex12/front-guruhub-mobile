import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "GuruHub Mobile Portal",
    short_name: "GuruHub Mobile",
    description: "Aplikasi Khusus Mobile - Manajemen Sekolah GuruHub",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#ffffff",
    theme_color: "#4f46e5",
    icons: [
      {
        src: "/logo-hangtuah.png",
        sizes: "any",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
