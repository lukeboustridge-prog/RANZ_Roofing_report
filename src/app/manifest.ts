import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "RANZ Roofing Reports",
    short_name: "RANZ Reports",
    description:
      "Professional roofing inspection reports for RANZ certified inspectors. Create, manage, and sync inspection reports with offline support.",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#2d5c8f",
    orientation: "portrait-primary",
    scope: "/",
    icons: [
      {
        src: "/icons/icon-72.png",
        sizes: "72x72",
        type: "image/png",
      },
      {
        src: "/icons/icon-96.png",
        sizes: "96x96",
        type: "image/png",
      },
      {
        src: "/icons/icon-128.png",
        sizes: "128x128",
        type: "image/png",
      },
      {
        src: "/icons/icon-144.png",
        sizes: "144x144",
        type: "image/png",
      },
      {
        src: "/icons/icon-152.png",
        sizes: "152x152",
        type: "image/png",
      },
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icons/icon-384.png",
        sizes: "384x384",
        type: "image/png",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
      {
        src: "/icons/icon-maskable.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      {
        name: "New Report",
        short_name: "New",
        description: "Create a new inspection report",
        url: "/reports/new",
        icons: [
          {
            src: "/icons/shortcut-new.png",
            sizes: "96x96",
            type: "image/png",
          },
        ],
      },
      {
        name: "My Reports",
        short_name: "Reports",
        description: "View all your reports",
        url: "/reports",
        icons: [
          {
            src: "/icons/shortcut-reports.png",
            sizes: "96x96",
            type: "image/png",
          },
        ],
      },
      {
        name: "Capture Photos",
        short_name: "Camera",
        description: "Capture inspection photos",
        url: "/capture",
        icons: [
          {
            src: "/icons/shortcut-camera.png",
            sizes: "96x96",
            type: "image/png",
          },
        ],
      },
    ],
    categories: ["business", "productivity", "utilities"],
    lang: "en-NZ",
    dir: "ltr",
    prefer_related_applications: false,
    screenshots: [
      {
        src: "/screenshots/dashboard.png",
        sizes: "1280x720",
        type: "image/png",
        label: "Dashboard view showing report overview",
      },
      {
        src: "/screenshots/report-editor.png",
        sizes: "1280x720",
        type: "image/png",
        label: "Report editor with defect documentation",
      },
      {
        src: "/screenshots/mobile-capture.png",
        sizes: "390x844",
        type: "image/png",
        form_factor: "narrow",
        label: "Mobile photo capture interface",
      },
    ],
    // Share target for receiving photos from other apps
    share_target: {
      action: "/share-target",
      method: "POST",
      enctype: "multipart/form-data",
      params: {
        title: "title",
        text: "text",
        url: "url",
        files: [
          {
            name: "photos",
            accept: ["image/*"],
          },
        ],
      },
    },
  };
}
