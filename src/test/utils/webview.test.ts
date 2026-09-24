import * as assert from 'assert';
import * as vscode from 'vscode';
import { container } from 'tsyringe';
import { applyWebviewCsp } from '../../utils/webview';
import { StateServiceSymbol } from '../../symbols';
import { CliScanType } from '../../cli/models/cli-scan-type';
import violationPanelContent from '../../ui/panels/violation/content';
import loadingViewContent from '../../ui/views/loading/content';
import authViewContent from '../../ui/views/auth/content';
import scanViewContent from '../../ui/views/scan/content';

const webview = { cspSource: 'https://file+.vscode-resource.vscode-cdn.net' } as vscode.Webview;
const diff2htmlScriptUri = `${webview.cspSource}/extension/resources/webview/diff2html-ui.min.js`;

const getNonce = (html: string): string => {
  const match = (/script-src 'nonce-([0-9a-f]+)'/).exec(html);
  assert.ok(match, 'CSP with a script nonce is expected');
  return match[1];
};

const getScriptTags = (html: string): string[] => html.match(/<script\b[^>]*>/gi) ?? [];

suite('applyWebviewCsp', () => {
  suiteSetup(() => {
    container.register(StateServiceSymbol, { useValue: { tempState: { IsAiLargeLanguageModelEnabled: true } } });
  });

  const pages: Record<string, () => string> = {
    'loading view': () => loadingViewContent,
    'auth view': () => authViewContent,
    'scan view': () => scanViewContent,
  };
  for (const scanType of Object.values(CliScanType)) {
    pages[`violation panel (${scanType})`] = () => violationPanelContent(scanType, diff2htmlScriptUri);
  }

  for (const [pageName, getPageHtml] of Object.entries(pages)) {
    test(`adds CSP and a nonce to every script of the ${pageName}`, () => {
      const html = applyWebviewCsp(getPageHtml(), webview);
      const nonce = getNonce(html);

      const scriptTags = getScriptTags(html);
      assert.ok(scriptTags.length > 0);
      for (const scriptTag of scriptTags) {
        assert.ok(scriptTag.includes(`nonce="${nonce}"`), `script without nonce: ${scriptTag}`);
      }

      assert.strictEqual(html.match(/http-equiv="Content-Security-Policy"/g)?.length, 1);
      assert.ok(html.indexOf('Content-Security-Policy') < html.search(/<\/head>/i), 'CSP must be inside <head>');
    });
  }

  test('allows only nonce scripts and blocks everything else by default', () => {
    const html = applyWebviewCsp('<html><head></head><body></body></html>', webview);
    const nonce = getNonce(html);

    assert.ok(html.includes(`default-src 'none'`));
    assert.ok(html.includes(`script-src 'nonce-${nonce}'`));
    assert.ok(!html.includes('unsafe-eval'));
  });

  test('generates a new nonce every time', () => {
    const html = '<html><head></head><body><script>1</script></body></html>';
    assert.notStrictEqual(getNonce(applyWebviewCsp(html, webview)), getNonce(applyWebviewCsp(html, webview)));
  });

  test('handles <head> with attributes and script tags in different forms', () => {
    const html = applyWebviewCsp(
      '<html><head lang="en"></head><body><SCRIPT\n>1</SCRIPT><script\tsrc="a.js"></script></body></html>',
      webview,
    );
    const nonce = getNonce(html);

    assert.ok(html.includes('Content-Security-Policy'));
    for (const scriptTag of getScriptTags(html)) {
      assert.ok(scriptTag.includes(`nonce="${nonce}"`), `script without nonce: ${scriptTag}`);
    }
  });

  test('rejects HTML without <head>', () => {
    assert.throws(() => applyWebviewCsp('<html><body><script>1</script></body></html>', webview));
    assert.throws(() => applyWebviewCsp('<html><header></header><script>1</script></html>', webview));
  });

  test('rejects HTML with already existing script nonces', () => {
    assert.throws(() => applyWebviewCsp('<head></head><script nonce="attacker">1</script>', webview));
  });

  test('rejects HTML with script tags which can not be marked with the nonce', () => {
    assert.throws(() => applyWebviewCsp('<head></head><script/src="a.js"></script>', webview));
  });
});
