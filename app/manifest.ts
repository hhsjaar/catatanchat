import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Chatatanchat - Voice & Chat Notes",
    short_name: "Chatatanchat",
    description: "Aplikasi asisten suara premium untuk membuat catatan pengingat, menggabungkan catatan, dan mengelola aktivitas harian Anda dengan mudah.",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#4f46e5",
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
      {
        src: "/apple-icon.png",
        sizes: "180x180",
        type: "image/png",
      },
    ],
    shortcuts: [
      {
        name: "Asisten Suara Aira",
        short_name: "Asisten",
        description: "Buka Asisten Suara Aira secara langsung",
        url: "/assistant",
        icons: [
          {
            src: "/icon-192.png",
            sizes: "192x192",
            type: "image/png"
          }
        ]
      }
    ]
  };
}
