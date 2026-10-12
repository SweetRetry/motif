import { createRoot } from "react-dom/client";

import { Stage } from "../shots";

// The stage draws dark unless the capture asks for the light theme.
if (new URLSearchParams(location.search).get("theme") === "light") {
  document.documentElement.classList.remove("dark");
}

// Asked for up front, so `document.fonts.ready` waits on them before a shot starts:
// a shot that rasterises text into a canvas needs the real face, not the fallback.
void document.fonts.load('600 112px "Geist"');
void document.fonts.load('400 13px "Geist Mono"');

const root = document.querySelector("#root");
if (root) {
  createRoot(root).render(<Stage name={location.hash.slice(1)} />);
}
