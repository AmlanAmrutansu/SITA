const { handler } = require('./test-api-bundle.cjs');
(async () => {
  const result = await handler({
    httpMethod: 'POST',
    path: '/.netlify/functions/api/auth/signup',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ email: 'test@example.com', password: 'password123', displayName: 'Test User' })
  }, {});
  console.log(result);
})();
