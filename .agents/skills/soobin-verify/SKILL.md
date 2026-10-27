---
name: soobin-verify
description: Verify Study with Soobin using its TypeScript build, existing logic tests, browser feature checks, and desktop self-test, with isolated state and explicit media-verification limits.
---

# Verify Study with Soobin

Use [AGENTS.md](../../../AGENTS.md). Run npm commands at the repository root;
use `npm.cmd` in PowerShell. Install locked dependencies with `npm.cmd ci` only
when necessary. Read the relevant [verification recipe](references/workflows.md)
before starting a browser or desktop check.

Choose the smallest relevant checks and complete the project-required gates.
Broaden verification when shared impact, a failure or release scope warrants it.
Reuse passing evidence for unchanged code in the same task; repeat a check only
when later edits invalidate it or a remaining concern needs it. Prefer existing
behavior coverage over new tests that duplicate it. For skill/documentation-only
edits, validate the changed files and links; build or launch the app only when
a verification recipe itself changed. Keep evidence proportional to the claim.

Select checks for the affected contract. Pure logic tests exercise parsing,
catalog ordering, dates, theme contrast and planning. They do not prove timer
hook lifecycle, real media playback, captions or visual layout. Add an actual
browser check for changes on those surfaces, using the available browser tool
and a separate local origin/profile. Do not modify production code to seed
verification state or invoke internal React setters instead of user controls.

Identify the checkout/build and the port before driving it. Use a strict-port
preview and retain the process handle. The recipes include a catalog smoke
check that does not require YouTube playback, and a separate timer lifecycle
check. Name which one was exercised rather than claiming all media is verified.

Keep evidence under ignored `build/skill-verification/`: commands, exit status,
observed counts/state and screenshots when useful. Close owned tabs and stop
only owned processes; preserve evidence. Use disposable application data for
desktop checks. The self-test proves server startup, not a rendered window or
working stream. Runtime changes require rebuilding the committed EXE under
the project rules; skill/documentation-only changes do not.

## Shared verification method

Use `toolkit-verify`, resolved through [toolkit setup](../../../docs/AGENT_SKILLS.md), for
evidence standards and the failure/recheck loop. The commands and artifact
requirements above remain this project's verification contract.
