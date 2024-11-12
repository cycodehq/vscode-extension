# Cycode VS Code Extension

The Cycode VS Code Extension is a plugin for Microsoft's Visual Studio Code (VS Code) that helps users to adopt a
shift-left strategy, by enabling code scanning early in the development lifecycle, which could significantly help
businesses avoid costly repairs and potential complications down the line.

## Features

Cycode VS Code Extension scans your code for exposed secrets, passwords, tokens, keys, and other credentials, as well as
open-source packages' vulnerabilities. The extension provides functionalities such as:

- A tree view, broken down by:
    - Scanning categories: 
      - Hardcoded Secrets
      - Open-source Threats (SCA)
      - Infrastructure as Code (IaC)
      - Code Security (SAST)
    - Files
- Cycode console features a "View Problem" card that enables in-depth violation analysis with remediation
  recommendations.
- Company’s Custom Remediation Guidelines - If your company has set custom remediation guidelines via the Cycode portal, you'll see a field for "Company Guidelines" that contains those guidelines.
- Running a new scan from your IDE even before committing the code.
- Triggering a scan automatically whenever a file is saved.
- Highlighting vulnerable code in the editor - syntax highlighting for Cycode-specific code and configuration files,
  making it easy for users to identify and work with these files in their projects.
- Removing a detected secret or ignoring it by secret value, rule (type) or by path.
- Upgrading and fixing vulnerable packages following Cycode's remediation guidelines.

## Installation

To install the Cycode VS Code Extension, follow these steps:

1. Open the editor.
2. Navigate to the Extensions Section.
3. Search for "Cycode" in the search bar.
4. Click on the "Install" button next to the Cycode plugin.
5. Wait for the installation to complete.
6. Restart the editor.

## Authentication

To install the Cycode VS Code Extension, follow these steps:

1. Open the editor.
2. Click on the Cycode icon in the left-hand sidebar.
3. Click on the "Authenticate" button.

## Configuring the Plugin

To configure the plugin go to the extension settings to change the default settings:

1. In the Additional Parameters field, you can submit additional CLI parameters, such as `--verbose` mode for debugging
   purposes.
2. Use the API URL and APP URL fields to change the base URLs:
    1. On-premises Cycode customers should ask their admin for the relevant base URLs.
    2. For EU tenants, you'll need to adjust the API and APP URLs to include the EU tag:
        1. API URL: `https://api.eu.cycode.com`
        2. APP URL: `https://app.eu.cycode.com`
3. Use CLI PATH to set the path to the Cycode CLI executable. In cases where the CLI can't be downloaded due to your
   network configuration (for example, due to firewall rules), use this option.
4. Clear the Scan on Save option to prevent Cycode from scanning your code every time you save your work. Instead, use
   the Scan on-Demand option.
5. In the SCA Scan On Open field, specify whether to perform a scan when a project opened.

Note: If the "Scan on Save File" option is enabled in the extension settings, Cycode will scan the file in focus (
including manifest files, such as `package.json` and `dockerfile`) for hardcoded secrets. Package vulnerabilities (SCA)
will only be scanned by Cycode if the file in focus is a manifest file (then the different scan types will run
simultaneously).

## Usage

To use the Cycode VS Code extension, follow these steps:

1. Open the editor.
2. Open a project that uses the Cycode platform.
3. Open a file to scan.
4. Press Ctrl+S or Cmd+S on Mac to save a file → A scan will automatically be triggered.
    - If the "Scan on Save File" option is enabled in the plugin settings, Cycode will scan the file in focus (including
      manifest files, such as package.json and dockerfile) for hardcoded secrets. Package vulnerabilities (SCA) will
      only be scanned by Cycode if the file in focus is a manifest file.
    - Also applies for auto-save.
5. Wait for the scan to complete and to display a success message.
6. Run on-demand scans: In the tree view, locate the desired file and click the Play button to run the scan.

## Viewing Scan Results

1. The scan displays a list of security vulnerabilities and code issues found in the application code. The results are
   displayed in a tree view broken down according to the type scan: Hardcoded Secrets, Open-source Threats (SCA),
   Infrastructure as Code (IaC), and Code Security (SAST).
2. Under each category, you'll see vulnerabilities grouped by file (per category).
3. You can also see the summary of the total number of vulnerabilities found in each file as well as a breakdown by
   severity.
4. Expanding the file displays the vulnerabilities sorted by vulnerability severity (with critical at the top).
5. Selecting a line in the results displays the line in the code file (see middle pane).

## Handling SCA Vulnerabilities

1. For SCA only, selecting a line also opens a Cycode console in the right pane that details the SCA vulnerability in
   depth.
2. The console includes details such as the package name, version, and a remediation recommendation, such as the first
   patched version with the vulnerability fixed.

## Handling Detected Secrets

1. Once the scan completes (either on save or on-demand), you’ll then see the violation(s) highlighted in your main
   window.
2. Hover over the violation to see the violation summary.
3. To view the details of the violation, select it in the list.
4. Next, choose how to address the detected violation(s) by selecting the Quick Fix button.
5. If the violation is a secret, you can choose to ignore it — either by secret value, secret rule (i.e., secret type) or
   the specific file. Note that Ignore occurs locally on the developer’s machine.
6. Go back to viewing the problem in the main window by clicking View problem.
7. You can also view a summary of all the problems by selecting the Problems tab.

## Support

If you encounter any issues or have any questions about the Cycode VS Code Extension, please reach out to the Cycode
support team at support@cycode.com.

## License

The Cycode VS Code Extension is released under the MIT license. See the LICENSE file for more details.
