---
name: soobin-engineering
description: Investigate, implement, structurally review and verify scoped Study with Soobin features, fixes and refactors. Use during substantive coding work; skip documentation-only and trivial cosmetic edits.
---

# Study with Soobin engineering

Read [AGENTS.md](../../../AGENTS.md), inspect the working tree and preserve
its ownership and lifecycle contracts. Apply only the relevant boundaries below;
keep the requested outcome and diff scope concrete.

Check the project boundaries touched by the change:

- Timer logic stays independent of video state. Switching or hiding tool tabs
  preserves mounted timer, music and task components.
- Both pickers, random choice and previous/next use the shared catalog rules.
  Changing filters must not interrupt current playback.
- Original broadcast dates and upload dates are separate. Generated catalog
  snapshots are refreshed by the existing scripts, not edited by hand.
- Media controls wait for player readiness; stale callbacks cannot apply to
  a newer video. Unmuting follows a user gesture, and player failures retain
  the distinction between blocked content and retryable errors.
- Theme changes clear previous inline overrides and preserve the luminance
  solver's contrast contract. Persistence uses the existing storage gateway.
- The desktop origin remains stable and pywebview keeps its persistent profile.

## Shared workflow

Use `toolkit-engineering` for the reusable investigation, implementation,
review and verification loop. Resolve it through [toolkit setup](../../../docs/AGENT_SKILLS.md).
Apply [soobin-thermonuclear-review](../soobin-thermonuclear-review/SKILL.md)
and [soobin-verify](../soobin-verify/SKILL.md) for this project's boundaries
and checks. Skip the full loop for documentation-only or trivial cosmetic work.
