const _CONTENT_TEMPLATE = `
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>{title}</title>
  </head>
  <style>
    #container {
      display: flex;
      flex-direction: column;
    }
    button {
      color: var(--vscode-button-foreground);
      background-color: var(--vscode-button-background);
      align-items: center;
      border: 1px solid var(--vscode-button-border,transparent);
      border-radius: 2px;
      box-sizing: border-box;
      cursor: pointer;
      display: flex;
      justify-content: center;
      line-height: 18px;
      padding: 4px;
      text-align: center;
      width: 100%;
    }
    .styled-link {
      text-decoration: none;
      cursor: pointer;
    }
  </style>
  <body id="container">
    {body}
  </body>
</html>
`;

export const getContent = (title: string, body: string): string => {
  return _CONTENT_TEMPLATE.replace('{title}', title).replace('{body}', body);
};
