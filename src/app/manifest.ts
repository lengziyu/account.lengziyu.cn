import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "len的密码库",
    short_name: "len的密码库",
    description: "您的专属本地私密账号保护工具",
    start_url: "/",
    display: "standalone",
    background_color: "#08090a",
    theme_color: "#7c3aed",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
      {
        src: "/apple-icon",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  };
}
