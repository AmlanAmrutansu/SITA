const { handler } = require('./test-api-bundle.cjs');
(async () => {
  const result = await handler({
    httpMethod: 'GET',
    path: '/.netlify/functions/api/auth/google',
    headers: {}
  }, {});
  console.log(result);
})();
