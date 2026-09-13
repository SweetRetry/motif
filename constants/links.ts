export const GITHUB = {
  branch: "main",
  org: "SweetRetry",
  repo: "motif",
  user: "SweetRetry",
} as const;

const githubUrl = `https://github.com/${GITHUB.org}/${GITHUB.repo}`;

export const LINK = {
  GITHUB: githubUrl,
  LICENSE: `${githubUrl}/blob/${GITHUB.branch}/LICENSE`,
  PORTFOLIO: `https://github.com/${GITHUB.user}`,
  SHADCN_MCP_DOCS: "https://ui.shadcn.com/docs/mcp",
  SPONSOR: `https://github.com/sponsors/${GITHUB.user}`,
  X: `https://x.com/${GITHUB.user}`,
} as const;
