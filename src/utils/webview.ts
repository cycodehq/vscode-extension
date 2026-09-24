import * as vscode from 'vscode';
import { randomBytes } from 'crypto';

export const getNonce = (): string => randomBytes(16).toString('hex');

/*
 * Adds a strict Content Security Policy to the webview HTML
 * and marks all our own <script> tags with a nonce, so only they are allowed to run.
 * Any script injected later (e.g. via innerHTML) will be blocked.
 */
export const applyWebviewCsp = (html: string, webview: vscode.Webview): string => {
  const nonce = getNonce();
  const csp = [
    `default-src 'none'`,
    `img-src ${webview.cspSource} https: data:`,
    `style-src ${webview.cspSource} 'unsafe-inline'`,
    `font-src ${webview.cspSource}`,
    `script-src 'nonce-${nonce}'`,
  ].join('; ');
  const cspMetaTag = `<meta http-equiv="Content-Security-Policy" content="${csp}">`;

  return html
    .replace(/<head>/i, `<head>\n    ${cspMetaTag}`)
    .replace(/<script(?=[\s>])/gi, `<script nonce="${nonce}"`);
};
