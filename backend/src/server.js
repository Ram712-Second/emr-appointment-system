import dotenv from 'dotenv';
import app from './app.js';
import { connectDB } from './config/database.js';

// Load environment variables
dotenv.config();

const PORT = process.env.PORT || 5000;

/**
 * Start Server
 * Connects to database and starts listening for requests
 */
const startServer = async () => {
  try {
    // Connect to database
    await connectDB();

    // Start listening
    const server = app.listen(PORT, () => {
      console.log(`
╔═══════════════════════════════════════════════════════╗
║                                                       ║
║   EMR Appointment Management System                  ║
║                                                       ║
║   Server running on port ${PORT}                       ║
║   Environment: ${process.env.NODE_ENV}                    ║
║   Time: ${new Date().toLocaleString()}                  ║
║                                                       ║
╚═══════════════════════════════════════════════════════╝
      `);
    });

    // Graceful shutdown
    process.on('SIGTERM', async () => {
      console.log('SIGTERM received. Shutting down gracefully...');
      server.close(async () => {
        const { disconnectDB } = await import('./config/database.js');
        await disconnectDB();
        process.exit(0);
      });
    });

    process.on('SIGINT', async () => {
      console.log('\\nSIGINT received. Shutting down gracefully...');
      server.close(async () => {
        const { disconnectDB } = await import('./config/database.js');
        await disconnectDB();
        process.exit(0);
      });
    });

  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
