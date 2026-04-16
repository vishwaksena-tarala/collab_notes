const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const User = require('./models/User');
const Note = require('./models/Note');

async function debug() {
  const mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
  
  try {
    const user = await User.create({
      username: 'testuser',
      email: 'test@example.com',
      password: 'password'
    });

    console.log('User created:', user._id);

    const note = await Note.create({
      title: 'Untitled Note',
      content: '',
      owner: user._id
    });
    console.log('Note created successfully');

    await note.populate('owner', 'username email');
    console.log('Populated successfully');
  } catch (err) {
    console.error('DEBUG ERROR:', err);
  } finally {
    await mongoose.disconnect();
    await mongoServer.stop();
  }
}

debug();
