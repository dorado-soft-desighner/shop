require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { runAutoMigrations } = require('./database/migrateSchema');

const authRoutes = require('./routes/auth');
const productRoutes = require('./routes/products');
const salesRoutes = require('./routes/sales');
const userRoutes = require('./routes/users');
const shiftRoutes = require('./routes/shifts');
const grnRoutes = require('./routes/grn');
const cashRoutes = require('./routes/cash');

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS for frontend development
app.use(cors({
  origin: '*', // Allow all origins for local networking setup
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Parse JSON request bodies
app.use(express.json());

// Logger middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Register API Routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/sales', salesRoutes);
app.use('/api/users', userRoutes);
app.use('/api/shifts', shiftRoutes);
app.use('/api/grn', grnRoutes);
app.use('/api/cash', cashRoutes);

// Root route
app.get('/', (req, res) => {
  res.json({
    message: 'Welcome to Dorado POS Decoupled API Server',
    status: 'Running',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      products: '/api/products',
      sales: '/api/sales',
      users: '/api/users'
    }
  });
});

// Start Express Server after running auto-migrations
runAutoMigrations().then(() => {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`=============================================`);
    console.log(` 🚀 DORADO POS SERVER IS RUNNING ONLINE 🚀   `);
    console.log(`=============================================`);
    console.log(`📡 Local Network IP: http://localhost:${PORT}`);
    console.log(`🔒 Authentication: Enabled (JWT)`);
    console.log(`💾 Database: MySQL Server (Online)`);
    console.log(`=============================================`);
  });
}).catch(err => {
  console.error('Migration failed, starting server anyway...', err);
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`=============================================`);
    console.log(` 🚀 DORADO POS SERVER IS RUNNING ONLINE 🚀   `);
    console.log(`=============================================`);
    console.log(`📡 Local Network IP: http://localhost:${PORT}`);
    console.log(`🔒 Authentication: Enabled (JWT)`);
    console.log(`💾 Database: MySQL Server (Online)`);
    console.log(`=============================================`);
  });
});
