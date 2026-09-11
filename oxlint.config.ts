import { defineConfig } from "oxlint";
import core from "ultracite/oxlint/core";
import next from "ultracite/oxlint/next";
import react from "ultracite/oxlint/react";
import vitest from "ultracite/oxlint/vitest";

export default defineConfig({
  extends: [core, react, next, vitest],
  ignorePatterns: [
    "public/r/**",
    ".agents/**",
    ".cursor/**",
    ".changeset/**",
    ".claude/**",
    ".web-kits/**",
    "audio/**",
  ],
  overrides: [
    {
      // Vendored component code is kept as close to its upstream source as possible
      // so it can be diffed and re-synced. Only the stylistic rules it trips are
      // relaxed here; it is still formatted by oxfmt and type-checked. Repo-owned
      // code (examples/, docs, app) is not exempt.
      files: [
        "components/motion/**",
        "components/agents/agent-disclosure.tsx",
        "lib/ease.ts",
        "lib/hooks/use-hover-capable.ts",
        "registry/new-york/agents/**",
        "registry/new-york/scroll-rail/**",
      ],
      rules: {
        "@typescript-eslint/no-inferrable-types": "off",
        complexity: "off",
        "func-style": "off",
        "no-negated-condition": "off",
        "no-nested-ternary": "off",
        "no-plusplus": "off",
        "no-shadow": "off",
        "react-hooks/exhaustive-deps": "off",
        "unicorn/no-nested-ternary": "off",
      },
    },
  ],
});
