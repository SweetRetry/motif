const normalize = (value) =>
  value
    .replace(/^\s*\/\//, "")
    .replace(/^\s*\/\*+/, "")
    .replace(/\*\/\s*$/, "")
    .replaceAll(/^\s*\*/gm, "");

export const isLintDirective = (value) =>
  /^oxlint-(disable|enable)/.test(normalize(value).trim());

export const isEmptyComment = (value) => normalize(value).trim() === "";

export const countsAsComment = (value) =>
  !(isEmptyComment(value) || isLintDirective(value));
