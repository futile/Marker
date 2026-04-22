<div>
  <img src="/public/icon.png" width="70"/>
  <h1>Marker</h1>
  <p>An open-source, user-friendly UI for viewing and editing markdown files</p>
</div>

## Download

Navigate to the [release page](https://github.com/tk04/Marker/releases) and select the installer that matches your platform.

#### Using Homebrew
```bash
$ brew install --cask tk04/tap/marker
```

#### [AUR](https://aur.archlinux.org/packages/marker-md) for Arch Linux
##### Using `paru`
```bash
$ paru -S marker-md
```

##### Using `yay`
```bash
$ yay -S marker-md
```

## Building Locally

To build Marker locally, clone this repo and run the following commands (make sure to have Rust already installed on your system):

```sh
$ pnpm install && pnpm tauri build
```

### Development
The dev server runs on port `6275` to avoid common conflicts.

## Releasing

This fork is set up to create downloadable binaries from a manually run GitHub Actions workflow.

1. Bump the app version in all release metadata files:

```bash
pnpm bump:version 1.5.0
```

This updates:
- `package.json`
- `src-tauri/tauri.conf.json`
- `src-tauri/Cargo.toml`

2. Commit and push the version bump to the branch you want to release from.
3. In GitHub, run the `Release` workflow manually.
4. The workflow reads `package.json`, `src-tauri/tauri.conf.json`, and `src-tauri/Cargo.toml`, verifies they are in sync, and derives the Git tag automatically as `vX.Y.Z`.
5. The workflow fails if that tag already exists in the repository.
6. A prepare job creates the draft GitHub release once and auto-generates release notes from the commits since the previous release.
7. The matrix build jobs upload the platform binaries into that existing draft release.

This flow is currently aimed at downloadable binaries only. The updater configuration still points at upstream and is not yet fork-owned, so the workflow does not use Tauri updater signing secrets for now.

## Contributing

If you feel that Marker is missing something, feel free to open a PR. Contributions are welcome and highly appreciated.
