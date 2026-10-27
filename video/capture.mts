/**
 * Films one shot from the stage bundle frame by frame, on a clock it owns.
 *
 *   pnpm build && [THEME=light] pnpm capture <shot> [seconds]
 *
 * Chrome's begin-frame control would make this trivial, but it is Linux only. On
 * macOS the clock is taken in two halves:
 *
 *   - Playwright's fake clock owns timers, `Date`, `performance.now` and
 *     `requestAnimationFrame`, which covers `motion`'s JS animations and every
 *     timer-driven stream.
 *   - WAAPI and CSS animations run on the document timeline, which no fake clock
 *     reaches. Each one is paused when first seen, then seeked every frame to the
 *     virtual time since, so the real milliseconds a screenshot takes cannot move it.
 *
 * A run takes as long as it takes and the film comes out the same every time. Frames are piped
 * straight into ffmpeg, never written to disk. Writes out/<shot>.mp4 and
 * out/<shot>.sha1, one hash per frame, so two runs can be diffed to prove it. `seconds` cuts the shot short for a trial run.
 *
 *   STILLS=12.5,30 pnpm capture <shot>
 *
 * walks the same clock but keeps only the frames at those seconds, as
 * out/stills/<seconds>.png, and stops after the last: a look at a moment without
 * encoding the film.
 *
 * This shares a laptop with whoever is using it. It refuses to start while the system
 * is under memory pressure, keeps ffmpeg to two threads, gives every browser call a
 * deadline, and closes the browser on any exit.
 */
import { execFileSync, spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { once } from "node:events";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { extname, join, normalize } from "node:path";
import { setTimeout as sleep } from "node:timers/promises";

import { chromium } from "playwright";

const FPS = 60;
/** Laid out at 960x540 and drawn at twice that, so a component sits at a size that
 *  reads in a 1080p frame and its hairlines stay sharp. */
const VIEWPORT = { height: 540, width: 960 };
const SCALE = 2;
const DEADLINE_MS = 15_000;

const here = import.meta.dirname;
const [shot, cut] = process.argv.slice(2);
const theme = process.env.THEME === "light" ? "light" : "dark";
const stills = new Map(
  (process.env.STILLS ?? "")
    .split(",")
    .filter(Boolean)
    .map((seconds) => [Math.round(Number(seconds) * FPS), seconds])
);
if (!shot) {
  throw new Error("usage: node capture.mts <shot> [seconds]");
}

// 1 is normal, 2 is warn, 4 is critical.
const pressure = Number(
  execFileSync("sysctl", [
    "-n",
    "kern.memorystatus_vm_pressure_level",
  ]).toString()
);
if (pressure > 1) {
  throw new Error(
    `memory pressure is at level ${pressure}; free some memory and retry`
  );
}

const overdue = async (what: string) => {
  await sleep(DEADLINE_MS, undefined, { ref: false });
  throw new Error(`${what} took over ${DEADLINE_MS} ms`);
};
const within = <T,>(work: Promise<T>, what: string) =>
  Promise.race([work, overdue(what)]);

/** The stage, served the way the site serves itself: the bundle from dist/, and every
 *  other root path (`/attachment-demo.jpg`) from the site's public/. Local only. */
const TYPES: Record<string, string> = {
  ".css": "text/css",
  ".html": "text/html",
  ".jpg": "image/jpeg",
  ".js": "text/javascript",
  ".m4a": "audio/mp4",
  ".mp4": "video/mp4",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".woff2": "font/woff2",
};
const server = createServer((request, response) => {
  const path = normalize(new URL(request.url ?? "/", "http://stage").pathname);
  const file = [join(here, "dist", path), join(here, "../public", path)].find(
    (candidate) => existsSync(candidate) && extname(candidate)
  );
  const served = path === "/" ? join(here, "dist/index.html") : file;
  if (!served) {
    response.writeHead(404).end();
    return;
  }
  response
    .writeHead(200, {
      "content-type": TYPES[extname(served)] ?? "application/octet-stream",
    })
    .end(readFileSync(served));
});
server.listen(0, "127.0.0.1");
await once(server, "listening");
const { port } = server.address() as AddressInfo;

// Partial raster redraws only the damaged rect, and a blur filter at that rect's edge
// comes out a few pixels different depending on what was drawn before. Full raster
// makes a frame depend on nothing but its own state.
const browser = await chromium.launch({ args: ["--disable-partial-raster"] });
mkdirSync(join(here, "out", "stills"), { recursive: true });
// Stills never feed the encoder, so it is started on nothing and left to exit quietly.
const ffmpeg = spawn(
  "ffmpeg",
  [
    "-y",
    "-loglevel",
    "error",
    "-threads",
    "2",
    "-f",
    "image2pipe",
    "-framerate",
    String(FPS),
    "-c:v",
    "png",
    "-i",
    "-",
    "-c:v",
    "libx264",
    "-preset",
    "medium",
    "-crf",
    "14",
    "-pix_fmt",
    "yuv420p",
    "-x264-params",
    "threads=2",
    join(here, "out", stills.size > 0 ? "stills/unused.mp4" : `${shot}.mp4`),
  ],
  { stdio: ["pipe", "inherit", stills.size > 0 ? "ignore" : "inherit"] }
);

const teardown = () => {
  ffmpeg.kill("SIGKILL");
  server.close();
  void browser.close();
};
for (const [signal, code] of [
  ["SIGINT", 130],
  ["SIGTERM", 143],
] as const) {
  process.once(signal, () => {
    teardown();
    process.exit(code);
  });
}

try {
  const context = await browser.newContext({
    colorScheme: theme,
    deviceScaleFactor: SCALE,
    viewport: VIEWPORT,
  });
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  await page.clock.install({ time: 0 });
  // `motion` hands opacity and transform to WAAPI, which runs on real time from the
  // call that starts it. A screenshot takes real seconds, so a short one is born and
  // finished between two frames, before the loop below sees it, and `motion` is left
  // holding a half-committed style. It only reaches for WAAPI when `Element.prototype`
  // owns `animate`, so the method moves one level down: every element still has it,
  // and `motion` draws those values in its own frame loop, on the fake clock.
  await page.addInitScript(() => {
    const { animate } = Element.prototype;
    for (const proto of [HTMLElement.prototype, SVGElement.prototype]) {
      Object.defineProperty(proto, "animate", {
        configurable: true,
        value: animate,
        writable: true,
      });
    }
    delete (Element.prototype as Partial<Element>).animate;
  });

  const stage = new URL(`http://127.0.0.1:${port}/`);
  stage.hash = shot;
  stage.searchParams.set("theme", theme);
  await page.goto(stage.href, { timeout: DEADLINE_MS, waitUntil: "load" });
  await page.waitForFunction(() => window.__shot, undefined, {
    timeout: DEADLINE_MS,
  });
  await within(
    page.evaluate(async () => {
      await document.fonts.ready;
    }),
    "fonts"
  );
  const seconds = Math.min(
    await page.evaluate(() => window.__shot?.seconds ?? 0),
    cut ? Number(cut) : Number.POSITIVE_INFINITY
  );

  /** React schedules renders and effects on MessageChannel tasks, which run on real
   *  time. A few round trips through the same queue lets every update the last tick
   *  caused commit before the frame is taken, so it lands on the same frame each run.
   *  The fake clock freezes `performance.now`, so the scheduler never yields mid-way. */
  const settle = () =>
    page.evaluate(async () => {
      for (let trip = 0; trip < 5; trip += 1) {
        const channel = new MessageChannel();
        // The page has no promise-returning way to wait on a MessagePort.
        // eslint-disable-next-line promise/avoid-new
        const answered = new Promise((resolve) => {
          channel.port1.addEventListener("message", resolve, { once: true });
        });
        channel.port1.start();
        channel.port2.postMessage(0);
        await answered;
      }
    });

  // Frame zero is virtual time `zero`; everything before it was page load.
  const zero = 10_000;
  await page.clock.pauseAt(zero);
  await page.evaluate(() => window.__shot?.start());
  await settle();

  const total =
    stills.size > 0
      ? Math.max(...stills.keys()) + 1
      : Math.round(seconds * FPS);
  const hashes: string[] = [];
  let elapsed = 0;
  for (let frame = 0; frame < total; frame += 1) {
    // Whole milliseconds, carried so the drift never adds up: 16, 17, 17, 16, ...
    const target = Math.round(((frame + 1) * 1000) / FPS);
    await within(
      page.clock.runFor(target - elapsed),
      `clock at frame ${frame}`
    );
    elapsed = target;
    // Shots that keep their own timeline (the film) read the frame time off this.
    await page.evaluate((now) => {
      window.dispatchEvent(new CustomEvent("stage:frame", { detail: now }));
    }, elapsed);
    await settle();

    await page.evaluate((now) => {
      for (const animation of document.getAnimations()) {
        const held = animation as Animation & {
          __motifSeen?: number;
          __motifRate?: number;
        };
        if (held.__motifSeen === undefined) {
          // Paused or finished by the page itself: not ours to move.
          if (held.playState === "paused" || held.playState === "finished") {
            continue;
          }
          // Born on this frame, whatever real milliseconds it has run for: that count
          // is the one thing here that differs between runs.
          held.__motifSeen = now;
          held.__motifRate = held.playbackRate;
          held.pause();
        }
        if (held.playState === "finished") {
          continue;
        }
        const time = (now - held.__motifSeen) * (held.__motifRate ?? 1);
        const end = held.effect?.getComputedTiming().endTime;
        // A paused animation never finishes on its own, and `motion` waits on that
        // to commit its end state, so the end is reached with `finish()`.
        if (typeof end === "number" && Number.isFinite(end) && time >= end) {
          held.finish();
        } else {
          held.currentTime = time;
        }
      }
    }, elapsed);

    if (stills.size > 0 && !stills.has(frame + 1)) {
      continue;
    }
    const { data } = await within(
      // CDP draws at 1x unless the clip says otherwise, whatever the device ratio.
      cdp.send("Page.captureScreenshot", {
        clip: { ...VIEWPORT, scale: SCALE, x: 0, y: 0 },
        format: "png",
      }),
      `frame ${frame}`
    );
    const png = Buffer.from(data, "base64");
    if (stills.size > 0) {
      writeFileSync(
        join(here, "out", "stills", `${stills.get(frame + 1)}.png`),
        png
      );
      continue;
    }
    hashes.push(createHash("sha1").update(png).digest("hex"));
    if (!ffmpeg.stdin.write(png)) {
      await once(ffmpeg.stdin, "drain");
    }
  }

  ffmpeg.stdin.end();
  await once(ffmpeg, "close");
  if (stills.size > 0) {
    console.log(`${shot}: ${stills.size} stills → out/stills/`);
  } else {
    writeFileSync(join(here, "out", `${shot}.sha1`), `${hashes.join("\n")}\n`);
    console.log(`${shot}: ${total} frames → out/${shot}.mp4`);
  }
} finally {
  ffmpeg.kill("SIGKILL");
  server.close();
  await browser.close();
}
