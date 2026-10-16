# Documentation

## Using and developing the app

- [App guide](app-guide.md): features, local setup, video curation, and desktop builds.
- [Screenshots and feature walkthrough](screenshots.md): examples of the app's main screens.
- [Profile progression](LEVELS.md): XP, levels, milestones, check-ins, and lifetime study hours.
- [TXT social accounts](social.md): the Social tab, account links, and verification sources.
- [TXT video catalog](video-catalog.md): the generated, member-organized collection of video links.
- [Appearance refresh](ui-refresh.md): the TaskNook-inspired design choices.
- [Stability test](stability-test.md): reproduced bugs, patches, verification, and remaining manual checks.

## Repository guidance

- [Agent instructions](AGENTS.md): current architecture and maintenance rules.
- [Earlier Claude guide](CLAUDE.md): retained reference; use the current agent instructions above.

## Historical notes

- [Original requirements](requirements.md): the starting product scope.
- [Code review findings](FINDINGS.md): earlier reviews and feature opportunities.
- [TaskNook feature comparison](TASKNOOK_PORT.md): the earlier study-plan and daily-goal work.

Screenshot assets are stored in [images](images/). The short README and agent
entry files remain at the repository root for GitHub and tool discovery.
`requirements-desktop.txt` stays at the root because it is an executable pip
dependency manifest, rather than a project document.
