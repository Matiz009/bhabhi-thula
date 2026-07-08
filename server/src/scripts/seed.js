require('dotenv').config();
const { connectDB } = require('../config/db');
const User = require('../models/User');
const mongoose = require('mongoose');

const TEST_USERS = [
  { username: 'alice', email: 'alice@example.com', password: 'password123' },
  { username: 'bob', email: 'bob@example.com', password: 'password123' },
  { username: 'carol', email: 'carol@example.com', password: 'password123' },
  { username: 'dave', email: 'dave@example.com', password: 'password123' },
];

async function seed() {
  await connectDB(process.env.MONGO_URI);

  for (const u of TEST_USERS) {
    const existing = await User.findOne({ username: u.username });
    if (existing) {
      console.log(`Skipping existing user: ${u.username}`);
      continue;
    }
    const passwordHash = await User.hashPassword(u.password);
    await User.create({ username: u.username, email: u.email, passwordHash });
    console.log(`Created user: ${u.username} / ${u.password}`);
  }

  await mongoose.disconnect();
  console.log('Seed complete.');
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
