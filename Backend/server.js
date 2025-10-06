const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const { connectDB, checkDBHealth, getDBStats } = require('./config/database');
const errorHandler = require('./middleware/errorHandler');

// Route imports
const authRoutes = require('./routes/auth');
const surveyTemplateRoutes = require('./routes/surveyTemplates');
const surveyResponseRoutes = require('./routes/surveyResponses');

// Connect to database
connectDB();

const app = express();

// Security middleware
app.use(helmet());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // limit each IP to 1000 requests per windowMs
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.'
  }
});
app.use(limiter);

// CORS configuration
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Compression middleware
app.use(compression());

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path} - ${new Date().toISOString()}`);
  next();
});

// Enhanced health check route with database status
app.get('/api/health', async (req, res) => {
  try {
    const dbHealth = await checkDBHealth();
    
    res.json({
      success: true,
      message: 'Server is running',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      database: {
        status: dbHealth ? 'connected' : 'disconnected',
        host: process.env.MONGODB_URI ? process.env.MONGODB_URI.split('@')[1]?.split('/')[0] : 'unknown'
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Health check failed',
      error: error.message
    });
  }
});

// Database statistics route (protected in production)
app.get('/api/admin/db-stats', async (req, res) => {
  try {
    if (process.env.NODE_ENV === 'production' && !req.headers['admin-key']) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const stats = await getDBStats();
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get database statistics',
      error: error.message
    });
  }
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/survey-templates', surveyTemplateRoutes);
app.use('/api/survey-responses', surveyResponseRoutes);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`
  });
});

// Error handling middleware (must be last)
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log(`🚀 Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
});

// Enhanced unhandled rejection handler
process.on('unhandledRejection', (err, promise) => {
  console.log('🔴 Unhandled Rejection at:', promise, 'reason:', err);
  console.log('💡 Closing server gracefully...');
  
  server.close(() => {
    console.log('🟡 HTTP server closed');
    process.exit(1);
  });
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('🟡 SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('🟡 HTTP server closed');
    process.exit(0);
  });
});

module.exports = app;