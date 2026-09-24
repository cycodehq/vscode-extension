import * as vscode from 'vscode';
import { randomBytes } from 'crypto';

export const getNonce = (): string => randomBytes(16).toString('hex');

const HEAD_TAG_REGEX = /<head(?=[\s>])[^>]*>/i;
const SCRIPT_TAG_REGEX = /<script(?=[\s>])/gi;
const SCRIPT_TAG_WITH_NONCE_REGEX = /<script(?=[\s>])[^>]*\snonce=/i;

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

  if (!HEAD_TAG_REGEX.test(html) || SCRIPT_TAG_WITH_NONCE_REGEX.test(html)) {
    // fail closed: never show the webview without the policy or with nonces we didn't generate
    throw new Error('Webview HTML must contain <head> and must not contain script nonces');
  }

  const htmlWithCsp = html
    .replace(HEAD_TAG_REGEX, (headTag) => `${headTag}\n    ${cspMetaTag}`)
    .replace(SCRIPT_TAG_REGEX, `<script nonce="${nonce}"`);

  const scriptTagsCount = htmlWithCsp.match(/<script\b/gi)?.length ?? 0;
  const scriptTagsWithNonceCount = htmlWithCsp.split(`<script nonce="${nonce}"`).length - 1;
  if (scriptTagsCount !== scriptTagsWithNonceCount) {
    throw new Error('Failed to add the nonce to all script tags of the webview HTML');
  }

  return htmlWithCsp;
};
