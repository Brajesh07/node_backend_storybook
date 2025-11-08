import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { configService } from './config';
import routes from './routes';

// Create Express app
const app = express();

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://checkout.razorpay.com"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https://api.razorpay.com", "https://lumberjack.razorpay.com"],
    },
  },
}));

// CORS configuration
app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://localhost:3002', 
    configService.config.corsOrigin
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: configService.isDevelopment ? 1000 : 100, // Limit each IP to 100 requests per windowMs in production
  message: {
    success: false,
    error: 'Too many requests from this IP, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static file serving for test pages
app.use('/public', express.static(path.join(__dirname, '../public')));

// API routes
app.use('/api', routes);

// Checkout test page
app.get('/checkout-test', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/checkout-test.html'));
});

// Health check endpoint
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Storybook Backend API is running!',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    links: {
      checkoutTest: `http://localhost:${configService.config.port}/checkout-test`,
      api: `http://localhost:${configService.config.port}/api`,
      health: `http://localhost:${configService.config.port}/api/health`
    }
  });
});

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({
      success: false,
      error: 'File too large. Maximum size is 5MB.'
    });
  }
  
  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    return res.status(400).json({
      success: false,
      error: 'Unexpected file field.'
    });
  }
  
  return res.status(500).json({
    success: false,
    error: configService.isDevelopment ? err.message : 'Internal server error'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found'
  });
});

// Start server
const server = app.listen(configService.config.port, () => {
  console.log(`🚀 Storybook Backend API running on port ${configService.config.port}`);
  console.log(`📊 Environment: ${configService.config.nodeEnv}`);
  console.log(`🎨 Replicate Enabled: ${configService.config.replicateEnabled}`);
  console.log(`🌐 CORS Origin: ${configService.config.corsOrigin}`);
  console.log(`📱 Access API at: http://localhost:${configService.config.port}`);
  console.log(`💳 Test Checkout at: http://localhost:${configService.config.port}/checkout-test`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received. Shutting down gracefully...');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('🛑 SIGINT received. Shutting down gracefully...');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

export default app;