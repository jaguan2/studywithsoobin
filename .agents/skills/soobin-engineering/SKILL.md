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

## Load the actual upstream workflow

Read [subtract-before-you-add](../../../docs/agent-skills/upstream/pstack/principle-subtract-before-you-add/SKILL.md).
For defects, also read [fix-root-causes](../../../docs/agent-skills/upstream/pstack/principle-fix-root-causes/SKILL.md).
For cross-module ownership questions, use [how's tracing instructions](../../../docs/agent-skills/upstream/pstack/how/references/explorer-prompt.md).
For multi-step changes, read [verifiable units](../../../docs/agent-skills/upstream/pstack/principle-sequence-verifiable-units/SKILL.md).
When outputs become large, use [context discipline](../../../docs/agent-skills/upstream/pstack/principle-guard-the-context-window/SKILL.md).
These are complete pinned upstream files, not summaries. Load only the relevant
ones and reuse them within the task.

## Implement, review, refine, verify

1. Define the observable outcome. Trace its entry point, data flow, owner and
   boundaries. Reproduce defects before choosing a remedy.
2. Implement one complete behavior in the canonical layer. Remove complexity
   made obsolete by this change before introducing another helper or flag.
3. Read [the structural review skill](../soobin-thermonuclear-review/SKILL.md)
   and review the actual diff plus necessary callers. Look for a simpler state
   model that removes branches, duplicate policy or needless wrappers.
4. Fix substantiated issues within the authorized task, then review the revised
   design. Record unrelated opportunities instead of enlarging the assignment.
5. Use [verification](../soobin-verify/SKILL.md). A failed check returns to root
   cause investigation; subsequent edits invalidate affected checks. Stop when
   the outcome, structural review and relevant required checks are satisfied.
6. Report the behavior, checks, review fixes and any unresolved limitation.
   Do not claim a skill improved efficiency without evidence from real tasks.

When an operator correction exposes a repeated mistake, consult
[correct](../../../docs/agent-skills/upstream/pstack/correct/SKILL.md) for architecture/type/test remedies
instead of merely adding another warning to the instructions.

Local adaptation: repository and user instructions govern scope and delivery.
Do not rebase, commit, start other model providers or delegate merely because
an upstream example does. Use the current agent for tracing; protected storage
and asynchronous guards remain necessary when they enforce a real contract.
