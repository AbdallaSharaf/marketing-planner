require('dotenv').config();
const connectDB = require('./config/db');
const User = require('./models/User');

async function seed() {
  await connectDB();
  const adminEmail = process.env.SEED_ADMIN_EMAIL || 'admin@example.com';
  const existing = await User.findOne({ email: adminEmail });
  if (existing) {
    console.log('Admin already exists:', adminEmail);
    process.exit(0);
  }
  const admin = new User({
    email: adminEmail,
    password: process.env.SEED_ADMIN_PASSWORD || 'Admin1234',
    fullName: 'Seed Admin',
    role: 'admin',
  });
  await admin.save();
  console.log('Created admin user:', adminEmail);
  process.exit(0);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
