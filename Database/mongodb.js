const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    // MongoDB connection options for better performance and stability
    const options = {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 30000, // 30 seconds
      socketTimeoutMS: 45000, // 45 seconds
      bufferCommands: false, // Disable mongoose buffering
      bufferMaxEntries: 0, // Disable MongoDB driver buffering
      maxPoolSize: 10, // Maintain up to 10 socket connections
      minPoolSize: 5, // Maintain at least 5 socket connections
      maxIdleTimeMS: 30000, // Close sockets after 30 seconds of inactivity
      family: 4, // Use IPv4, skip trying IPv6
    };

    console.log('🔄 Attempting to connect to MongoDB...');
    console.log(`📊 Database: ${process.env.MONGODB_URI.split('/').pop().split('?')[0]}`);

    const conn = await mongoose.connect(process.env.MONGODB_URI, options);

    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    console.log(`📁 Database: ${conn.connection.name}`);
    console.log(`👤 Connected as: ${conn.connection.user}`);

    // Connection event listeners for better debugging
    mongoose.connection.on('connected', () => {
      console.log('🟢 Mongoose connected to MongoDB');
    });

    mongoose.connection.on('error', (err) => {
      console.error('🔴 Mongoose connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      console.log('🟡 Mongoose disconnected from MongoDB');
    });

    // Close the Mongoose connection when the Node process ends
    process.on('SIGINT', async () => {
      try {
        await mongoose.connection.close();
        console.log('🟡 MongoDB connection closed through app termination');
        process.exit(0);
      } catch (err) {
        console.error('🔴 Error closing MongoDB connection:', err);
        process.exit(1);
      }
    });

    return conn;
  } catch (error) {
    console.error('🔴 Database connection error:', error);
    
    // More detailed error logging
    if (error.name === 'MongoNetworkError') {
      console.error('🔴 Network error: Could not connect to MongoDB cluster');
      console.error('💡 Please check:');
      console.error('   - Internet connection');
      console.error('   - MongoDB Atlas IP whitelist');
      console.error('   - MongoDB cluster status');
    } else if (error.name === 'MongoServerError') {
      console.error('🔴 MongoDB server error:', error.message);
    } else if (error.name === 'MongooseError') {
      console.error('🔴 Mongoose error:', error.message);
    }
    
    process.exit(1);
  }
};

// Database health check function
const checkDBHealth = async () => {
  try {
    const dbState = mongoose.connection.readyState;
    const states = {
      0: 'disconnected',
      1: 'connected',
      2: 'connecting',
      3: 'disconnecting'
    };
    
    console.log(`📊 Database connection state: ${states[dbState]}`);
    
    if (dbState === 1) {
      // Test database operations
      const adminDb = mongoose.connection.db.admin();
      const serverStatus = await adminDb.ping();
      console.log('🟢 Database ping successful:', serverStatus);
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('🔴 Database health check failed:', error);
    return false;
  }
};

// Function to gracefully close database connection
const closeDB = async () => {
  try {
    await mongoose.connection.close();
    console.log('🟡 MongoDB connection closed gracefully');
    return true;
  } catch (error) {
    console.error('🔴 Error closing database connection:', error);
    return false;
  }
};

// Database statistics function
const getDBStats = async () => {
  try {
    if (mongoose.connection.readyState !== 1) {
      throw new Error('Database not connected');
    }

    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();
    
    const stats = {
      collections: collections.map(col => col.name),
      connectionState: mongoose.connection.readyState,
      host: mongoose.connection.host,
      port: mongoose.connection.port,
      name: mongoose.connection.name,
    };

    // Get counts for main collections
    const collectionCounts = {};
    for (const collection of ['users', 'teams', 'surveytemplates', 'surveyresponses']) {
      try {
        collectionCounts[collection] = await db.collection(collection).countDocuments();
      } catch (err) {
        collectionCounts[collection] = 'Collection does not exist';
      }
    }

    stats.collectionCounts = collectionCounts;
    return stats;
  } catch (error) {
    console.error('Error getting database stats:', error);
    return { error: error.message };
  }
};

module.exports = {
  connectDB,
  checkDBHealth,
  closeDB,
  getDBStats,
  mongoose
};