# Website to Electron Action

GitHub Action that packages a pre-built static website into an Electron desktop app using Electron Forge. It copies your site into the embedded Electron template, applies your metadata/icons, and returns ready-made installers.

## Usage

### Basic Usage

```yaml
name: Package desktop app
on:
  push:
    branches: [main]

jobs:
  make-electron:
    runs-on: macos-latest # use windows-latest for Squirrel installer, ubuntu-latest for deb/rpm
    steps:
      - uses: actions/checkout@v4

      # Build your static site first
      - name: Build static site
        run: |
          npm ci
          npm run build

      - name: Package Electron app
        uses: anyerqi/website-app@main
        with:
          site-path: build
          app-name: my-site-app
          product-name: "My Site"
          app-version: 1.2.3
          app-description: "Docs viewer"
          icon-icns-path: .github/icons/app.icns    # optional, Mac
          icon-ico-path: .github/icons/app.ico      # optional, Windows
          icon-png-path: .github/icons/app.png      # optional, Linux
          author: username  # Required for Windows

      - uses: actions/upload-artifact@v4
        with:
          name: electron-artifacts
          path: electron-out
```

### With Auto-Update (via GitHub Releases)

```yaml
name: Package and Release
on:
  push:
    tags:
      - 'v*'

jobs:
  make-electron:
    runs-on: macos-latest
    permissions:
      contents: write  # Required for publishing releases
    steps:
      - uses: actions/checkout@v4

      - name: Build static site
        run: |
          npm ci
          npm run build

      - name: Package and Publish Electron app
        uses: anyerqi/website-app@main
        with:
          site-path: build
          app-name: my-site-app
          product-name: "My Site"
          app-version: ${{ github.ref_name }}  # Use tag as version (e.g., v1.0.0)
          auto-update: "true"
          github-token: ${{ secrets.GITHUB_TOKEN }}
```

When `auto-update` is enabled:
- The built artifacts will be automatically published to GitHub Releases
- The app will check for updates from GitHub Releases on startup (using `update-electron-app`)
- Updates are checked every hour and downloaded automatically

## Inputs

| Input | Default | Description |
|-------|---------|-------------|
| `site-path` | `dist` | Folder containing your built static site |
| `app-name` | `website-app` | Package name used by Electron Forge (kebab-case) |
| `product-name` | `Website App` | Display name shown in installers |
| `app-version` | - | Version to embed in the build |
| `app-description` | - | Installer description |
| `author` | - | Author name (required for Windows) |
| `icon-icns-path` | - | Path to `.icns` icon for macOS |
| `icon-ico-path` | - | Path to `.ico` icon for Windows |
| `icon-png-path` | - | Path to `.png` icon for Linux/DMG |
| `auto-update` | `false` | Enable auto-update via GitHub Releases |
| `github-token` | - | GitHub token for publishing releases (required if `auto-update` is `true`) |

## Outputs

| Output | Description |
|--------|-------------|
| `artifact-path` | Workspace path where Electron Forge artifacts are copied (`electron-out`) |

## Notes

- Run on the platform you need artifacts for: macOS for DMG/universal, Windows for Squirrel installer, Linux for deb/rpm.
- The action runs `npm ci` inside the action bundle, copies your site into the embedded `dist/`, updates `package.json` metadata, and executes `npm run make`.
- Default icons live under `assets/`; provide platform-specific icons via inputs to override them.
- When using `auto-update`, make sure your workflow has `contents: write` permission to publish releases.
- The auto-update feature uses the current repository's GitHub Releases as the update source.
