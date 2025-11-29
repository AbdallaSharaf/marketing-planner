require('dotenv').config();
const app = require('./app');
const mongoose = require('mongoose');

const PORT = process.env.PORT || 5000;

// Enable mongoose debugging
mongoose.set('debug', true);

const connectDB = async function () {
  console.log('🔍 connectDB called');
  console.log('🔍 MongoDB URI exists:', !!process.env.MONGODB_URI);
  console.log('🔍 Current connection state:', mongoose.connection.readyState);

  // If already connected, return the connection
  if (mongoose.connection.readyState === 1) {
    console.log('✅ Using existing MongoDB connection');
    return mongoose.connection;
  }

  const uri = process.env.MONGODB_URI;

  if (!uri) {
    throw new Error('MONGODB_URI is not defined in environment variables');
  }

  console.log(
    '🔍 Connecting to:',
    uri.replace(/mongodb\+srv:\/\/([^:]+):[^@]+@/, 'mongodb+srv://$1:****@')
  );

  const opts = {
    maxPoolSize: 5,
    minPoolSize: 1,
    serverSelectionTimeoutMS: 10000,
    socketTimeoutMS: 45000,
    bufferCommands: false,
  };

  console.log('🔄 Attempting MongoDB connection...');

  try {
    const conn = await mongoose.connect(uri, opts);
    console.log('✅ Connected to MongoDB successfully');
    console.log(
      '🔍 Connection state after connect:',
      mongoose.connection.readyState
    );
    return conn;
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    console.error('🔍 Error name:', error.name);
    console.error('🔍 Error code:', error.code);
    throw error;
  }
};

// Simple connection function without complex retry logic
const initializeDatabase = async () => {
  try {
    console.log('🚀 Initializing database connection...');
    await connectDB();
    return true;
  } catch (error) {
    console.error('🔥 Database initialization failed:', error.message);
    return false;
  }
};

// For traditional server startup
function startServer() {
  initializeDatabase().then((success) => {
    if (success) {
      app.listen(PORT, () => {
        console.log(`🚀 Server running on port ${PORT}`);
      });
    } else {
      console.error(
        '❌ Failed to start server due to database connection issues'
      );
      process.exit(1);
    }
  });
}

// Vercel serverless handler - SIMPLIFIED
if (process.env.VERCEL) {
  console.log('🔍 Running in Vercel environment');

  let dbInitialized = false;
  let initializationPromise = null;

  // Initialize database on cold start
  const initializeDBForVercel = async () => {
    if (!initializationPromise) {
      initializationPromise = initializeDatabase();
    }
    const result = await initializationPromise;
    dbInitialized = result;
    return result;
  };

  // Start initialization immediately
  initializeDBForVercel().then((success) => {
    if (success) {
      console.log('🎯 Database ready for Vercel functions');
    } else {
      console.log('💥 Database initialization failed on startup');
    }
  });

  module.exports = async (req, res) => {
    console.log(`🔍 Incoming ${req.method} request to: ${req.url}`);

    if (!dbInitialized) {
      console.log('🔄 Database not ready, attempting connection...');
      try {
        const success = await initializeDBForVercel();
        if (!success) {
          return res.status(503).json({
            error: {
              code: 'DATABASE_UNAVAILABLE',
              message:
                'Database connection failed. Please check your MongoDB configuration.',
            },
          });
        }
      } catch (error) {
        console.error('💥 Error during request-time connection:', error);
        return res.status(503).json({
          error: {
            code: 'DATABASE_UNAVAILABLE',
            message: `Database connection error: ${error.message}`,
          },
        });
      }
    }

    // If we get here, database should be connected
    console.log(
      '🔍 Database connection state before handling request:',
      mongoose.connection.readyState
    );

    try {
      return app(req, res);
    } catch (error) {
      console.error('💥 Error in request handler:', error);
      return res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Request handling failed',
        },
      });
    }
  };
} else {
  // Local development
  console.log('🔍 Running in local environment');
  startServer();
}

// Add event listeners for debugging
mongoose.connection.on('connected', () => {
  console.log('🎯 Mongoose connected to MongoDB');
});

mongoose.connection.on('error', (err) => {
  console.error('💥 Mongoose connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.log('⚠️ Mongoose disconnected from MongoDB');
});

mongoose.connection.on('reconnected', () => {
  console.log('🔁 Mongoose reconnected to MongoDB');
});
