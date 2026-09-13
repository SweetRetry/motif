<p align="center">
  <img src="https://motif-sweetretrys-projects.vercel.app/og" alt="Motif banner" />
</p>

<h1 align="center">Motif</h1>

<p align="center">
  An open shadcn registry of interface parts for AI agents and generative media — conversation, reasoning, approvals, and the controls that frame them. Install a piece, compose a surface, own the source.
  <br />
  <br />
  <a href="https://github.com/SweetRetry/motif"><img src="https://www.shieldcn.dev/github/stars/SweetRetry/motif.svg?variant=secondary&size=xs&theme=zinc" alt="GitHub Stars" /></a>
  <a href="https://github.com/SweetRetry/motif/actions"><img src="https://www.shieldcn.dev/github/ci/SweetRetry/motif.svg?variant=secondary&size=xs&theme=zinc" alt="CI" /></a>
</p>

## What's in it

- 🧩 **Agents** — `conversation`, `message`, `thinking-block`, `waiting-row`,
  `prompt-input`, `voice-input`, `attachment`, `scroll-rail`, `approval-card`,
  `skill-detail`
- 🎛️ **Components** — `aspect-ratio-picker`, `resolution-segmented`, `duration-slider`,
  `generation-overlay`, `cover-fan`, `flow-edge`, `toolbar`, `settings-dialog`,
  `activity-heatmap`
- 🏗️ **Blocks** — whole surfaces assembled from the parts, starting with `chat-app`

## Why it feels like one library

- 🧩 **Compound components** — a root owns the state and named parts compose it. Rearrange
  them, drop one into another frame, or leave one out. A slot with nothing in it draws
  nothing; a part with no handler behind it is not drawn at all.
- 🎨 **Theme tokens** — every colour is a shadcn token, so dark mode and a theme swap
  restyle a component for free. A component that needs a state the base theme does not
  name brings the token with it in `cssVars`.
- ✨ **[Motion](https://motion.dev/)** — animation explains the surface: a follow that
  keeps a thread at its tail, a wave that says a turn is still coming, a lift that names
  the card under the pointer.
- 🤖 **Agent ready** — `llms.txt`, `llms-full.txt`, an API catalog and agent-skill
  discovery routes, so an assistant can read the registry without a browser.
- 🔊 **[Web audio feedback](https://audio.raphaelsalaja.com/)** - Built-in sound effects powered by `@web-kits/audio`
- 📳 **[Web haptics](https://haptics.lochie.me/)** - Optional haptic feedback hooks for supported devices via `web-haptics`
- 🔄 **[View transitions](https://nextjs.org/docs/app/api-reference/config/next-config-js/viewTransition)** - Next.js view transitions enabled for smoother navigation between pages

## Built in

- `Next.js 16` with the App Router
- `React 19` and `TypeScript`
- `Tailwind CSS 4`
- `Fumadocs` for documentation
- `shiki` + `rehype-pretty-code` for code blocks
- `sonner` for toasts
- `radix-ui` + `vaul` for accessible primitives
- `@vercel/analytics` for analytics

## Use a component

```bash
npx shadcn@latest add https://motif-sweetretrys-projects.vercel.app/r/approval-card.json
```

`shadcn add` writes the source into your repo at the path the registry item names and
brings its base components — `button`, `input`, `radio-group` — along with it.

## Contributing a component

1. **Add the component** under `registry/new-york/` — the reference one is
   `registry/new-york/agents/approval-card/`

2. **Add a docs page and an example** under `content/docs/` and `examples/`

3. **Update `registry.json`** with the registry item and its base components

4. **Build the registry**:

```bash
pnpm registry:build
```

5. **Check it**:

```bash
pnpm dev
```

## Project structure

```
├── registry/
│   └── new-york/           # The component source that ships
│       └── agents/approval-card/
├── registry.json           # Registry manifest
├── content/docs/           # Documentation (MDX)
├── examples/               # Docs demos
├── app/                    # Next.js app
└── public/r/               # Built registry files (auto-generated)
```

## Scripts

- `pnpm dev` - Start development server
- `pnpm build` - Build for production
- `pnpm registry:build` - Rebuild the registry into `public/r/`

## License

[MIT](./LICENSE)
