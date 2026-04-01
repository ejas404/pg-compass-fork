# ADR: GitHub Releases for Desktop

## Title

Automated Windows desktop builds and GitHub Releases via CI

## Status

Accepted

## Decision

A GitHub Actions workflow (`.github/workflows/release-desktop.yml`) automates building and releasing the desktop app for Windows:

1. **Triggers**: Push to `main`, version tags (`v*`), and manual `workflow_dispatch`.
2. **Build**: Uses `electron-forge make` on `windows-latest` to produce a Squirrel installer (`.exe` + `.nupkg`).
3. **Artifacts**: Every build uploads artifacts to the workflow run for download/testing.
4. **Releases**: Tagged pushes (`v*`) automatically create a GitHub Release with auto-generated release notes and attach the installer files.

## Rationale

- Squirrel is already configured as the primary Windows maker in `forge.config.ts`.
- GitHub Releases are the simplest distribution method for an open-source Electron app — no external infrastructure needed.
- Separating "every push builds" from "only tags release" keeps the feedback loop fast while preventing accidental releases.
- `softprops/action-gh-release` is the most widely adopted action for creating releases and handles file globbing well.

## Consequences

- Every push to `main` consumes CI minutes on `windows-latest` (slower runners). If this becomes costly, a `paths` filter can be re-added.
- Releases are only created for `v*` tags. To release, run: `git tag v1.0.0 && git push origin v1.0.0`.
- Only Windows is covered. macOS/Linux can be added as parallel jobs in the same workflow later.
