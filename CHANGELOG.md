# Change Log

## [Unreleased]

## [v1.14.0]

- Add the "Ignore this violation" button for violation card of SCA
- Add support of `.gitignore` files for a file excluding from scans

## [v1.13.1]

- Improve suggested AI fix rendering in violation cards
- Fix extension state on startup
- Fix Code Actions creation

## [v1.13.0]

- Add AI remediations for IaC and SAST
- Add code highlighting for Violation Cards

## [v1.12.0]

- Add support for Swift Package Manager in SCA
- Increase default sync scans timeout

## [v1.11.2]

- Add support for Theia IDE
- Add auto publishing the extension to the Open VSX Registry
- Fix false positive status bar changes
- Fix CLI output handling

## [v1.11.1]

- Fix CliError parsing

## [v1.11.0]

- Add extension loading screen
- Add toolbar actions: Run All, Expand All, Collapse All, Clear Results
- Rework extension sidebar. Now it vertically splits the screen and always shows the tree view on top
- Rework sidebar views to be more dynamic with proper action states
- Huge code refactoring

## [v1.10.0]

- Add sync flow for Secrets and IaC
- Fix scan on save for individual files

## [v1.9.4]

- Fix empty IaC scan results on Windows
- Fix missed markdown blocks on violation cards
- Fix settings icon appearing outside views of the extension
- Fix scan on save of outside workspace files

## [v1.9.3]

- Rework scan results handling

## [v1.9.2]

- Fix CodeLens updating

## [v1.9.1]

- Integrate Sentry

## [v1.9.0]

- Add SAST support

## [v1.8.0]

- Add "Ignore this violation" for violation card of secrets
- Make CWE and CVE clickable on violation cards
- Leave "Open violation card" as only one quick fix action

## [v1.7.0]

- Add experimental SAST support
- Add code actions to open violation card
- Add policy display name as the title of SAST detections
- Improve UX of violation cards by clarifying fields
- Improve UX of tree view by using relative paths
- Fix "quick fix" duplications

## [v1.6.0]

- Add Infrastructure as Code (IaC) support
- Add Secrets Violation Card
- Add IaC Violation Card
- Add icons for file nodes in the tree view
- Add a full path of file nodes in the tree view

## [v1.5.0]

- Migrate to the new architecture that auto-manages the CLI

## [v1.4.0]

- Add the on-demand scan of an entire project for Secrets

## [v1.3.0]

- Add new SCA flow which decreases execution time

## [v1.2.2]

- Fix detections count in SCA notifications
- Fix work on Windows

## [v1.2.1]

- Disable "SCA Scan on Open" setting
- Disable progress bar for scans on save
- Fix communication with CLI
- Fix quick fix ignore functionality for SCA

## [v1.2.0]

- Add Company Guidelines
- Fix the severity of detected secrets

## [v1.1.0]

- Add Elixir support for SCA

## [v1.0.1]

- Mark SCA as beta
- Remove "play" (start scan) button from filename and violation items in the tree view

## [v1.0.0]

The first stable release with the support of Secrets, SCA, TreeView, Violation Card, and more.

[v1.14.0]: https://github.com/cycodehq/vscode-extension/releases/tag/v1.14.0

[v1.13.1]: https://github.com/cycodehq/vscode-extension/releases/tag/v1.13.1

[v1.13.0]: https://github.com/cycodehq/vscode-extension/releases/tag/v1.13.0

[v1.12.0]: https://github.com/cycodehq/vscode-extension/releases/tag/v1.12.0

[v1.11.2]: https://github.com/cycodehq/vscode-extension/releases/tag/v1.11.2

[v1.11.1]: https://github.com/cycodehq/vscode-extension/releases/tag/v1.11.1

[v1.11.0]: https://github.com/cycodehq/vscode-extension/releases/tag/v1.11.0

[v1.10.0]: https://github.com/cycodehq/vscode-extension/releases/tag/v1.10.0

[v1.9.4]: https://github.com/cycodehq/vscode-extension/releases/tag/v1.9.4

[v1.9.3]: https://github.com/cycodehq/vscode-extension/releases/tag/v1.9.3

[v1.9.2]: https://github.com/cycodehq/vscode-extension/releases/tag/v1.9.2

[v1.9.1]: https://github.com/cycodehq/vscode-extension/releases/tag/v1.9.1

[v1.9.0]: https://github.com/cycodehq/vscode-extension/releases/tag/v1.9.0

[v1.8.0]: https://github.com/cycodehq/vscode-extension/releases/tag/v1.8.0

[v1.7.0]: https://github.com/cycodehq/vscode-extension/releases/tag/v1.7.0

[v1.6.0]: https://github.com/cycodehq/vscode-extension/releases/tag/v1.6.0

[v1.5.0]: https://github.com/cycodehq/vscode-extension/releases/tag/v1.5.0

[v1.4.0]: https://github.com/cycodehq/vscode-extension/releases/tag/v1.4.0

[v1.3.0]: https://github.com/cycodehq/vscode-extension/releases/tag/v1.3.0

[v1.2.2]: https://github.com/cycodehq/vscode-extension/releases/tag/v1.2.2

[v1.2.1]: https://github.com/cycodehq/vscode-extension/releases/tag/v1.2.1

[v1.2.0]: https://github.com/cycodehq/vscode-extension/releases/tag/v1.2.0

[v1.1.0]: https://github.com/cycodehq/vscode-extension/releases/tag/v1.1.0

[v1.0.1]: https://github.com/cycodehq/vscode-extension/releases/tag/v1.0.1

[v1.0.0]: https://github.com/cycodehq/vscode-extension/releases/tag/v1.0.0

[Unreleased]: https://github.com/cycodehq/vscode-extension/compare/v1.14.0...HEAD
