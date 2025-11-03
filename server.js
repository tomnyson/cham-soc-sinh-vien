/**
 * Grade Checker Application
 * Entry point for the Express server
 */

const app = require('./src/app');
const config = require('./config/app.config');
const databaseService = require('./src/services/database.service');

const PORT = config.port;
const MONGODB_URI = process.env.MONGODB_URI;

/**
 * Start server
 */
async function startServer() {
    try {
        // Connect to MongoDB
        if (MONGODB_URI) {
            console.log('🔌 Connecting to MongoDB...');
            await databaseService.connect(MONGODB_URI);

            // Seed default data if needed
            await databaseService.seedDefaultData();
        } else {
            console.warn('⚠️  MONGODB_URI not found in environment variables');
            console.warn('⚠️  Running without database connection (LocalStorage mode)');
        }

        // Start Express server
        const server = app.listen(PORT, () => {
            console.log('='.repeat(50));
            console.log(`🚀 Grade Checker Server`);
            console.log(`📡 Server running on: http://localhost:${PORT}`);
            console.log(`🌍 Environment: ${config.nodeEnv}`);
            console.log(`📊 API available at: http://localhost:${PORT}/api`);
            if (MONGODB_URI) {
                console.log(`💾 Database: Connected`);
            } else {
                console.log(`💾 Database: LocalStorage mode`);
            }
            console.log('='.repeat(50));
        });

        // Graceful shutdown
        process.on('SIGTERM', async () => {
            console.log('SIGTERM signal received: closing HTTP server');
            server.close(async () => {
                console.log('HTTP server closed');
                await databaseService.disconnect();
            });
        });

        process.on('SIGINT', async () => {
            console.log('\nSIGINT signal received: closing HTTP server');
            server.close(async () => {
                console.log('HTTP server closed');
                await databaseService.disconnect();
                process.exit(0);
            });
        });

    } catch (error) {
        console.error('❌ Failed to start server:', error.message);
        process.exit(1);
    }
}

// Start the server
startServer();
