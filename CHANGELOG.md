# Change Log

All notable changes to the "kusion" extension will be documented in this file.

## [0.0.1] - 2022-11-04

### Added

- Initialize the kusion extension
- Support basic operations: kusion compile/apply

## [0.0.2] - 2022-11-09

### Added

- Support kusion preview in editor context menu

### Updated

- Support user interaction for execution of kusion preview/compile/apply

## [0.0.4] - 2022-11-10

### Updated

- Use KusionStack icon as the extension icon.

## [0.0.6] - 2022-12-13

### Added

- Add quick start support on minikube automatically starting and notification about intended service operation.

## [0.0.7] - 2023-3-2

### Added

- Add the Kusion view container to the primary activity bar.
- Support Stack output data preview.


## [0.0.11] - 2023-4-24

### Updated

- downgrade the dependency version of the vscode engines to 1.68.0

## [0.0.13] - 2023-5-12

### Added

- support `Kusion: Create Kusion Project From Archetype` command to create a kusion project from template.
- support `kusion.templates.location` settings to configure the locations to load kusion templates from.

## [0.0.14] - 2023-5-22

### Added

- add walkthrough: Getting started with Kusion.
- support live-diff preview between real state and desired state of a stack: right click and select "Preview Live Diff and Apply" on the stack's main file.
- support apply button on the right corner of the live-diff page.
- add stack status page after applying changes.

## [0.0.15] - 2023-5-23

### Updated

- create project from template webview: adapt to user's VS Code theme color.

### Fixed

- live diff preview: stop showing the progress bar after the `kusion preview` command failed.

## [0.0.16] - 2023-5-24

### Fixed

- create project from template: support loading templates from templates/internal under the kusion installation location.

## [0.0.17] - 2023-5-25

### Fixed

- live diff preview: ensure refreshing the live diff preview tab before showing.