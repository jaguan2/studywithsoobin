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

StudyWithSoobin adapts these ideas into linen, coffee, plum-night, and custom
themes. The existing grid and tabbed dock retain their placement, matching the
owner's preference. The video stays in its reserved stage, with controls and
captions below it. No draggable or overlapping panels were added.

The toolbar's Appearance disclosure changes themes and panel opacity. The
opacity preference is saved as `sws.panelOpacity`; only background surfaces
become translucent. Timer settings group duration presets, Pomodoro setup, and
daily focus goals. Existing tasks, timer behavior, favorites, and playback
preferences keep their data formats.

The custom-theme solver retains per-stop luminance rather than using fixed
HSL lightness. Contrast tests cover primary-button text for saturated hues,
gray, white, and black picks. Task deletion controls stay available on touch
devices and keyboard focus, following TaskNook's hover-reveal pattern.
