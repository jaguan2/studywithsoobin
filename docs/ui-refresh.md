# Appearance refresh

The October 14, 2026 refresh draws from the local TaskNook repository:

- `frontend/src/index.css`: low-saturation surfaces, one accent family,
  14px backdrop blur, soft borders, and touch-safe hover actions.
- `frontend/src/components/Dock.jsx`: consistent stroke icons and quiet
  selected states.
- `frontend/src/components/HudFocusCard.jsx`: a clear timer transport with
  advanced configuration tucked into an expander.
- `frontend/src/components/SettingsPanel.jsx`: labeled palette choices and
  a hex-code alternative to the native color picker.

StudyWithSoobin adapts these ideas into linen, coffee, dark, and custom
themes. The existing grid and tabbed dock retain their placement, matching the
owner's preference. The video stays in its reserved stage, with controls and
captions below it. No draggable or overlapping panels were added.

The Dark preset uses neutral charcoal backgrounds, soft white and gray text,
and a muted blue accent. It replaces the original plum-night palette and keeps
the saved `dark` preference, so existing users receive the updated colors.
Keyboard focus uses the lighter blue accent for visibility on dark surfaces.
The page's subtle background glow is neutral gray, keeping the blue confined to
controls and small highlights. See [current screenshots](screenshots.md#current-dark-mode-screenshots).

The dark-palette check samples 65%, 88%, and 100% panel opacity, raised surfaces,
and accent-tinted selected surfaces. Sampled body/secondary/accent text stays at
or above 5.13:1 contrast; white primary-button text measures 4.74:1 normally and
6.27:1 on hover. These numeric samples supplement the Windows visual check;
they are not a complete accessibility audit.

The toolbar's Appearance disclosure changes themes and panel opacity. The
opacity preference is saved as `sws.panelOpacity`; only background surfaces
become translucent. Timer settings group duration presets, Pomodoro setup, and
daily focus goals. Existing tasks, timer behavior, favorites, and playback
preferences keep their data formats.

The custom-theme solver retains per-stop luminance rather than using fixed
HSL lightness. Contrast tests cover primary-button text for saturated hues,
gray, white, and black picks. Task deletion controls stay available on touch
devices and keyboard focus, following TaskNook's hover-reveal pattern.
