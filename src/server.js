require('dotenv').config();
const app = require('./app');
const connectDB = require('./config/db');

const PORT = process.env.PORT || 5000;

// When running on Vercel (serverless) we should export the Express app
// as the handler instead of starting a long-lived listener. When run
// locally (node src/server.js or npm run dev) we connect the DB and
// start the server as usual.
async function start() {
  try {
    await connectDB();
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (err) {
    console.error('Failed to start server', err);
    process.exit(1);
  }
}

// If Vercel sets the VERCEL env var (or if this file is required as a
// module) export the app for the serverless platform. Otherwise start
// a local server (development / production container).
if (process.env.VERCEL || require.main !== module) {
  // Ensure DB is connected for serverless invocations. connectDB is
  // idempotent and will reuse an existing connection if present.
  connectDB().catch((err) => console.error('DB connection error:', err));
  module.exports = app;
} else {
  start();
}
