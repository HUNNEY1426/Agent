const http = require('http');
const app = require('../server');

async function runTest() {
  const server = app.listen(0);
  const port = server.address().port;
  console.log(`Test server running on port ${port}`);

  function request(method, path, data = null, cookies = null) {
    return new Promise((resolve, reject) => {
      const options = {
        hostname: '127.0.0.1',
        port: port,
        path: path,
        method: method,
        headers: {
          'Content-Type': 'application/json',
        }
      };

      if (cookies) {
        options.headers['Cookie'] = cookies;
      }

      const req = http.request(options, (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
          let parsed;
          try {
            parsed = JSON.parse(body);
          } catch (e) {
            parsed = body;
          }
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: parsed,
            cookies: res.headers['set-cookie']
          });
        });
      });

      req.on('error', reject);
      if (data) {
        req.write(JSON.stringify(data));
      }
      req.end();
    });
  }

  try {
    // 1. Register test user
    const email = `aitest_${Date.now()}@example.com`;
    const regRes = await request('POST', '/auth/signup', {
      name: 'AI Tester',
      email: email,
      password: 'Password123!',
      confirmPassword: 'Password123!'
    });
    console.log('1. Signup status:', regRes.status, 'success:', regRes.body.success);

    const cookies = regRes.cookies ? regRes.cookies.map(c => c.split(';')[0]).join('; ') : '';

    // 2. Test /ai/ask with valid auth
    console.log('\n2. Testing /ai/ask with valid auth (question: "hi")...');
    const askRes = await request('POST', '/ai/ask', {
      question: 'hi',
      provider: 'gemini',
      model: 'gemini-2.0-flash'
    }, cookies);

    console.log('Ask status:', askRes.status);
    console.log('Ask response:', JSON.stringify(askRes.body, null, 2));

    // 3. Test /ai/ask without auth (should return 401)
    console.log('\n3. Testing /ai/ask without auth (should return 401)...');
    const noAuthRes = await request('POST', '/ai/ask', {
      question: 'hi',
      provider: 'gemini',
      model: 'gemini-2.0-flash'
    });
    console.log('No auth status:', noAuthRes.status, 'code:', noAuthRes.body?.error?.code);

    // 4. Test /ai/settings with auth
    console.log('\n4. Testing /ai/settings...');
    const settingsRes = await request('GET', '/ai/settings', null, cookies);
    console.log('Settings status:', settingsRes.status, 'provider:', settingsRes.body.provider, 'model:', settingsRes.body.model);

    // 5. Test /ai/providers with auth
    console.log('\n5. Testing /ai/providers...');
    const providersRes = await request('GET', '/ai/providers', null, cookies);
    console.log('Providers status:', providersRes.status, 'providers count:', providersRes.body.providers?.length);

  } finally {
    server.close();
  }
}

runTest().catch(console.error);
