# AGENTS.md

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
