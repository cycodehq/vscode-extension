export default `
<style>
/*!
  LICENSE: MIT
  SOURCE: https://github.com/Yukaii/github-highlightjs-themes
*/

.hljs {
  display: block;
  overflow-x: auto;
  padding: 0.5em;

  color: #24292e;
  /* MODIFIED. THE ORIGINAL IS:
  background: #ffffff;
   */
  background: var(--vscode-textPreformat-background);
}

.hljs-comment,
.hljs-punctuation {
  color: #6a737d;
}

.hljs-attr,
.hljs-attribute,
.hljs-meta,
.hljs-selector-attr,
.hljs-selector-class,
.hljs-selector-id {
  color: #005cc5;
}

.hljs-variable,
.hljs-literal,
.hljs-number,
.hljs-doctag {
  color: #e36209;
}

.hljs-params {
  color: #24292e;
}

.hljs-function {
  color: #6f42c1;
}

.hljs-class,
.hljs-tag,
.hljs-title,
.hljs-built_in {
  color: #22863a;
}

.hljs-keyword,
.hljs-type,
.hljs-builtin-name,
.hljs-meta-keyword,
.hljs-template-tag,
.hljs-template-variable {
  color: #d73a49;
}

.hljs-string,
.hljs-undefined {
  color: #032f62;
}

.hljs-regexp {
  color: #032f62;
}

.hljs-symbol {
  color: #005cc5;
}

.hljs-bullet {
  color: #e36209;
}

.hljs-section {
  color: #005cc5;
  font-weight: bold;
}

.hljs-quote,
.hljs-name,
.hljs-selector-tag,
.hljs-selector-pseudo {
  color: #22863a;
}

.hljs-emphasis {
  color: #e36209;
  font-style: italic;
}

.hljs-strong {
  color: #e36209;
  font-weight: bold;
}

.hljs-deletion {
  color: #b31d28;
  background-color: #ffeef0;
}

.hljs-addition {
  color: #22863a;
  background-color: #f0fff4;
}

.hljs-link {
  color: #032f62;
  font-style: underline;
}
</style>
`;
