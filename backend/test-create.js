const http = require('http');

async function test() {
  try {
    const id = Date.now();
    const signupData = JSON.stringify({ username: `test${id}`, email: `test${id}@test.com`, password: 'password123' });
    const signupReq = await fetch('http://localhost:5000/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: signupData
    });
    const result = await signupReq.json();
    const token = result.token;

    if (!token) {
        console.error('Failed to get token:', result);
        return;
    }

    const noteData = JSON.stringify({ title: 'Untitled Note', content: '' });
    const createReq = await fetch('http://localhost:5000/api/notes', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: noteData
    });

    const createResult = await createReq.json();
    console.log('Create Note status:', createReq.status);
    console.log('Create Note result:', createResult);

  } catch (err) {
    console.error(err);
  }
}

test();
