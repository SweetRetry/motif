# AGENTS.md

## The inherited template is not ours to edit

`startercn` came with a whole site: page chrome, docs infrastructure, the `components/ui`
primitives, `styles/`, and a placeholder registry entry. Those files are the upstream's and
stay as they came. Our work lands in files we add — registry items under
`registry/new-york/`, their docs pages and their examples — and in the entries we add to
`registry.json`.

Two consequences. A sweep — an animation audit, a colour audit, a dead-code hunt — reports
on inherited files and stops there: `components/announcement.tsx` is unused downstream code
that belongs to the template, not a file to delete. And when an inherited file genuinely
has to change, it is one named decision inside the task — never a side effect of a sweep.

Which side a file is on is mechanical: `git cat-file -e 5e5c379:<path>` — the scaffold
commit — exits 0 for the template's files.

## Compound components

A surface ships as a compound component: a root that owns the state and named parts that
compose it — `PromptInput` over `PromptInputHeader` / `PromptInputTextarea` /
`PromptInputFooter`, `SettingsDialog` over its rows and sections. Parts are the product.
A caller rearranges them, drops one into a different frame, or leaves one out; a prop on a
monolith cannot be rearranged, and every surface that outgrows it becomes a second prop.

Two rules follow. A slot with nothing in it draws nothing. A part with no handler behind
it is not drawn at all.

## Base components come first

A higher-order component is assembled from base components: it imports them at the path
they are installed to — `@/components/ui/waiting-row`, `@/components/ui/button` — declares
them in the registry item's `registryDependencies`, and lets `shadcn add` bring them along.
Thinking Block is Waiting Row plus a window, a mask and a follow; Prompt Input is
Attachment, Button and Dropdown Menu, plus a field of its own.

So the base comes first. When a composite needs a piece the registry does not have yet,
the piece ships on its own — source, docs page, registry item — and the composite is then
written against it. The base is what every later surface reuses; a composite that inlines
the primitive makes the next one write it again.

## Colors come from the theme

Every color a component draws is a shadcn token — `bg-card`, `text-muted-foreground`,
`border-ring/50`, `bg-primary`, `text-success` — so dark mode and a theme swap restyle it
for free. A token names the role the component actually knows (`muted`, `destructive`); a
palette hue (`bg-zinc-800`, `#1c1c1c`) bakes in a guess about the theme it will be drawn
on and is wrong the moment that changes.

A state is a token like any other: reject and failure are `destructive`, success is
`success`, a step walked past is `warning`. When a component needs a state the theme does
not name yet, the theme gets the token — in `:root`, `.dark` and `@theme`, and in the
registry item's `cssVars` so `shadcn add` brings it along — and the component is written
against it. The tell that a token is missing: a literal carrying its own dark value, like
`text-rose-600 dark:text-rose-400`, is a token being re-written by hand.

Literal color is right when what it is measured against is not the theme: a scrim over
user artwork, the full-opacity stop inside an SVG mask, a cast shadow landing on a photo.
Those are content-independent by nature rather than a shortcut around the palette.

## Surfaces stack in a fixed order

A component that draws its own container picks one of three levels, and the token names
the level rather than the theme it happens to be drawn on: the page is `background`, an
in-place container is `card` with `border-border`, a floating one is `popover`. A level is
where the component will be nested, so a card is `bg-card` whichever parent it lands in —
the caller's frame does not change what it is.

`muted` and `accent` are not levels. They are fills for something that recedes or answers
the pointer, and they are only safe _inside_ a container. That is exactly why a card
cannot borrow one: `muted` sits below the page in light and above the card in dark, so a
component that draws its own surface with it reads as recessed in one theme and floating in
the other. The same goes for a recessed field or group — it draws `border-border`, not a
fill, because a border is stable across the swap and a fill is not.

"Brighter is closer" is a consequence of the order, not the rule for it. Dark mode reads
that way (`background` 0.145 → `card` 0.205 → `popover` 0.269); light mode cannot, because
its three levels are all white and the border is all that separates them. Writing the rule
as "the nearer surface is brighter" would force `background` to go grey in light mode,
which is a theme change, not a component fix.

## Browser use requires confirmation

Reaching for a browser — ego-browser, or any other browser automation — is a
user-visible action: it opens a window, drives the user's logged-in sessions,
and may touch their personal context. Treat it as a decision the user owns.

So: before the first browser call in a task, stop and ask the user to confirm.
State what you intend to do in the browser and why, wait for an explicit yes,
then proceed. If the user already approved that exact work in this task, go
ahead; a new goal, a new site, or a widening of scope is a new confirmation.

The `ego-browser` skill lives at
`/Users/zhangzimin/.agents/skills/ego-browser/SKILL.md`. Read it only after the
user has confirmed.
