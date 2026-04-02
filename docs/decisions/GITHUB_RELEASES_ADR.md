# ADR: GitHub Releases for Desktop

## Title

Automated Windows and Linux desktop builds and GitHub Releases via CI

## Status

Accepted

## Decision

A GitHub Actions workflow (`.github/workflows/release-desktop.yml`) automates building and releasing the desktop app for Windows and Linux:

1. **Triggers**: Push to `main`, version tags (`v*`), and manual `workflow_dispatch`.
2. **Parallel builds**: `build-windows` (Squirrel `.exe`) and `build-linux` (`.deb` + `.AppImage`) run concurrently.
3. **Artifacts**: Every build uploads artifacts to the workflow run for download/testing.
4. **Releases**: A separate `release` job runs only on tagged pushes (`v*`), collects artifacts from both builds, and creates a single GitHub Release with all platform installers.

## Rationale

- Parallel jobs keep build times short — each platform builds independently.
- A dedicated `release` job ensures one tag produces one release with all platform artifacts.
- Squirrel (Windows), `.deb`, and AppImage cover the most common distribution formats — AppImage is universal (no install required), `.deb` covers Debian/Ubuntu.
- `softprops/action-gh-release` is the most widely adopted action for creating releases and handles file globbing well.

## Consequences

- Every push to `main` consumes CI minutes on both `windows-latest` and `ubuntu-latest`.
- Releases are only created for `v*` tags. To release, run: `git tag v0.x.0 && git push origin v0.x.0`.
- macOS can be added as another parallel job later.
