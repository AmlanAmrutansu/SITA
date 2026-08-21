const fs = require('fs');

function patch(file) {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(
    /const access = \(req: Request\) => req\.cookies\?\.sita_access_token as string \| undefined;/g,
    `const access = (req: Request) => (req.headers.authorization?.startsWith("Bearer ") ? req.headers.authorization.split(" ")[1] : req.cookies?.sita_access_token) as string | undefined;`
  );
  fs.writeFileSync(file, content);
}

patch('artifacts/api-server/src/routes/sita-data.ts');
patch('artifacts/api-server/src/routes/chat.ts');

let authContent = fs.readFileSync('artifacts/api-server/src/routes/auth.ts', 'utf8');
authContent = authContent.replace(
  'function token(req: Request) {\n  return req.cookies?.[ACCESS_COOKIE] as string | undefined;\n}',
  `function token(req: Request) {
  return (req.headers.authorization?.startsWith("Bearer ") ? req.headers.authorization.split(" ")[1] : req.cookies?.[ACCESS_COOKIE]) as string | undefined;
}`
);
fs.writeFileSync('artifacts/api-server/src/routes/auth.ts', authContent);

