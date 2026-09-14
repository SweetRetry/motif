export const FALLBACK_SITE_ORIGIN = "https://motif-ui.vercel.app" as const;

const getBaseUrl = () => {
  if (process.env.NODE_ENV !== "production") {
    return "http://localhost:3000";
  }

  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }

  return process.env.SITE_URL ?? FALLBACK_SITE_ORIGIN;
};

const baseUrl = getBaseUrl();

export const SITE = {
  AUTHOR: {
    NAME: "SweetRetry",
    TWITTER: "@SweetRetry",
  },
  DESCRIPTION: {
    LONG: "An open shadcn registry of interface parts for AI agents and generative media — conversation, reasoning, approvals, and the controls that frame them. Install with npx shadcn add, own the source, restyle it with your theme.",
    SHORT: "Interface parts for AI agents",
  },
  KEYWORDS: [
    "shadcn",
    "shadcn registry",
    "component registry",
    "shadcn components",
    "ai agent ui",
    "agent interface",
    "ai chat interface",
    "chat ui components",
    "generative media ui",
    "react components",
    "next.js",
    "tailwindcss",
    "npx shadcn add",
  ] as const,
  NAME: "Motif",
  OG_IMAGE: `${baseUrl}/og`,
  REGISTRY: baseUrl,
  URL: baseUrl,
};

export const META_THEME_COLORS = {
  dark: "#09090b",
  light: "#ffffff",
};

export const UTM_PARAMS = {
  utm_source: new URL(baseUrl).hostname,
};
