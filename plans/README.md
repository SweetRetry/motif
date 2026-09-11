### Eighth revision (the row expands, the gap stays)

The fixed 14px box backfired: a hovered bar grew to fill it, so the slack that _was_ the
visual gap vanished and the next bar looked glued to it (bar 3 never moved). Bars are now
sized by their content — `w` comes from the motion value, the buttons have no fixed width
and the row has an explicit `gap-1.5` — so hovering lengthens a bar and pushes the
following bars right, keeping the 6px gap constant.

Widths stay real pixels (8 / 11 / 14), never `scaleX`, so the caps stay round; the
`contain: layout paint` box and the inert slack are gone. This does reintroduce a small
row reflow on hover, which finding 3 originally objected to — accepted here because the
user wants the push, it is scoped to three 4px-tall elements, and the alternative (fixed
boxes) visibly breaks the spacing.

### Ninth revision (active state made legible)

8px vs 11px read as "the same bar", and the current bar had no colour of its own — it
borrowed the answered colour. Now the current bar is `16px` (2× the 8px resting width,
`20px` on hover) and full-strength `bg-foreground`, while answered sits at `55%` and
not-yet-reached at `20%`. The four-state tone lives in one `barTone()` helper instead of
nested ternaries in the JSX.

### Tenth revision (tooltip copy)

The tooltip is a single line now — `max-w-none whitespace-nowrap` at the call site, so a
long question title widens the bubble instead of wrapping inside it. The amber
"· unanswered" suffix is gone: the bar's colour already carries that, and the button's
`aria-label` still spells it out for assistive tech (`… (unanswered)`).
