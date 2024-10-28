import css from './css';
import js from './js';

const _CONTENT_TEMPLATE = `
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>Cycode</title>
  </head>
  
  ${css}
  ${js} <!-- Before body because body could use function from common JS module -->

  <body id="container">
    {body}
  </body>
</html>
`;

export const getContent = (body: string): string => {
  return _CONTENT_TEMPLATE.replace('{body}', body);
};
