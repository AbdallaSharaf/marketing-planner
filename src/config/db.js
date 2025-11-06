const mongoose = require('mongoose');

module.exports = async function connectDB() {
  const uri =
    process.env.MONGODB_URI ||
    process.env.DATABASE_URL ||
    'mongodb://localhost:27017/marketing-planner';
  const opts = {
    maxPoolSize: parseInt(process.env.DATABASE_POOL_MAX || '10', 10),
    minPoolSize: parseInt(process.env.DATABASE_POOL_MIN || '2', 10),
  };

  await mongoose.connect(uri, opts);
  console.log('Connected to MongoDB');
};
