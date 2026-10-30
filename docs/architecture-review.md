# Structure and scalability review

Reviewed October 30, 2026 with an independent Codex session. This pass preserves
the current interface and saved-data formats while separating application wiring
from reusable behavior.

## Changes implemented

| Boundary | Responsibility | Reason |
| --- | --- | --- |
| `src/App.tsx` | Compose player, timer, progression, screens, and tools | Keep integration visible without owning every feature's persistence |
| `src/hooks/useAppearance.ts` | Validate saved appearance, apply root styles, persist selections | Share one owner across the welcome screen, sidebar, and appearance panel |
| `src/lib/theme.ts` | Palette derivation and shared `Theme` type | Components depend on the domain rather than importing from `App` |
| `src/hooks/useVideoCatalog.ts` | Selection, filters, favorites, blocked videos, last selection, URL | Test navigation with an injected catalog without creating a player |
| `src/lib/workspace.ts` | Stable tool IDs, labels, icons, and order | Define tools once and derive the selection type from that definition |
| `src/components/StudyTools.tsx` | Tab/panel connections, dock visibility, timer footer | Preserve mounted tools while centralizing the dock layout |

Adding a tool means adding metadata to `STUDY_TOOLS` and providing its view in
the `App` panels record. TypeScript reports a missing view, and the tab grid
adapts to the registry length. Stable IDs preserve panel identity across renders.

The catalog hook has no knowledge of iframe creation. It calls `onRepeat` when
the only matching video should replay, and `onBlocked` when a failed embed is
excluded. `App` connects these events to the player and notices. Mute state,
Pomodoro playback integration, and keyboard shortcuts remain in `App`.

## Preserved behavior and verification

- Existing localStorage keys and preference defaults remain compatible.
- Valid `?v=` links select a video; invalid IDs open the welcome screen. Returning
  there removes only `v`, retaining other query parameters and the URL fragment.
- Filters and favorites leave current playback alone. Previous/next, random
  selection, and blocked-video recovery use the filtered order.
- Inactive tools and the hidden dock retain mounted panels, preserving drafts,
  timer state, and audio. The profile remains confined to its own tools tab.
- Leaving the custom theme clears inline colors; panel opacity changes the
  surface token without fading text.

Mounted hook and dock tests cover these boundaries. Existing player recovery,
progression concurrency, catalog, task-planning, and theme-contrast tests remain
part of `npm test`. Production build and desktop packaging checks are required
after runtime changes. These checks do not verify live third-party playback.

## Recommended next passes

1. **Task state ownership.** `TasksCard` combines saved tasks, ordering, selection,
   Undo, editing, and form rendering. `useProgression` also reads the task schema
   when migrating a profile. Introduce a task-specific read adapter shared by
   both, then a task controller hook. Keep drafts and DOM focus in the component;
   preserve IDs, migration, Undo ordering, and once-per-task XP rules.
2. **Timer transitions.** Before separating deadline scheduling from Pomodoro
   transitions and completion effects, add mounted fake-clock coverage for
   completion exactly once, throttled pause/resume, phase changes, skip-break,
   restart, and reset without rewards. Timer helper tests alone are insufficient
   protection for that refactor.
3. **Larger catalogs.** Profile search and welcome-grid rendering as the catalog
   grows. Precomputed searchable metadata, membership sets, or pagination can
   address measured bottlenecks. No performance improvement is claimed by this
   structural refactor.

Progression already distinguishes unreadable storage from absent data and
replays pending writes under a lock. Retain those guarantees when adding
persistence helpers; a generic saved-state hook must not replace them.
