import * as vscode from 'vscode';
import mainStyles from './styles/main';
import hljsGithubLightThemeStyles from './styles/hljs/github-light-default';
import hljsGithubDarkThemeStyles from './styles/hljs/github-dark-dimmed';
import scaCard from './card/sca';
import secretCard from './card/secret';
import iacCard from './card/iac';
import sastCard from './card/sast';
import js from './js';
import { CliScanType } from '../../../cli/models/cli-scan-type';

let isDarkTheme = vscode.window.activeColorTheme.kind !== vscode.ColorThemeKind.Light;

vscode.window.onDidChangeActiveColorTheme((theme) => {
  // TODO(MarshalX): rerender panel with new theme. Now it requires to close and open the panel
  isDarkTheme = theme.kind !== vscode.ColorThemeKind.Light;
});

export default (scanType: CliScanType) => `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Cycode: Detection Details</title>
</head>
<body>
    ${mainStyles}
    ${isDarkTheme ? hljsGithubDarkThemeStyles : hljsGithubLightThemeStyles}

    ${scanType == CliScanType.Sca ? scaCard : ''}
    ${scanType == CliScanType.Secret ? secretCard : ''}
    ${scanType == CliScanType.Iac ? iacCard : ''}
    ${scanType == CliScanType.Sast ? sastCard : ''}

    ${js(scanType)}
</body>
</html>
`;
