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
  jsPlugins: ["./tools/comment-lint/plugin.mjs"],
  overrides: [
    {
      files: ["registry/new-york/**/*.ts", "registry/new-york/**/*.tsx"],
      rules: { "motif/no-comments": "warn" },
    },
    {
      files: [
        "app/**/*.ts",
        "app/**/*.tsx",
        "components/**/*.ts",
        "components/**/*.tsx",
        "hooks/**/*.ts",
        "hooks/**/*.tsx",
        "lib/**/*.ts",
        "lib/**/*.tsx",
      ],
      rules: { "motif/no-comments": "warn" },
    },
    {
      files: [
        "components/motion/**",
        "components/ui/motif/agent-disclosure.tsx",
        "hooks/use-hover-capable.ts",
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
