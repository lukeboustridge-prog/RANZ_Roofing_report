import type { Metadata } from "next";

const siteConfig = {
  name: "RANZ Roofing Reports",
  description:
    "Professional roofing inspection reports for RANZ certified inspectors. Create legally defensible, ISO-compliant inspection documentation.",
  url: process.env.NEXT_PUBLIC_APP_URL || "https://reports.ranz.co.nz",
  ogImage: "/og-image.png",
};

export function constructMetadata({
  title,
  description,
  image,
  noIndex = false,
}: {
  title?: string;
  description?: string;
  image?: string;
  noIndex?: boolean;
} = {}): Metadata {
  return {
    title: title ? `${title} | ${siteConfig.name}` : siteConfig.name,
    description: description || siteConfig.description,
    keywords: [
      "roofing inspection",
      "RANZ",
      "roof report",
      "building inspection",
      "New Zealand",
      "LBP",
      "defect report",
      "weathertightness",
    ],
    authors: [{ name: "RANZ" }],
    creator: "RANZ",
    openGraph: {
      type: "website",
      locale: "en_NZ",
      url: siteConfig.url,
      title: title || siteConfig.name,
      description: description || siteConfig.description,
      siteName: siteConfig.name,
      images: [
        {
          url: image || siteConfig.ogImage,
          width: 1200,
          height: 630,
          alt: siteConfig.name,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: title || siteConfig.name,
      description: description || siteConfig.description,
      images: [image || siteConfig.ogImage],
    },
    robots: {
      index: !noIndex,
      follow: !noIndex,
      googleBot: {
        index: !noIndex,
        follow: !noIndex,
      },
    },
    metadataBase: new URL(siteConfig.url),
  };
}

export { siteConfig };
