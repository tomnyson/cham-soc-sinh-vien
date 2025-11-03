const mongoose = require('mongoose');

/**
 * Database Service - Quản lý kết nối MongoDB
 */
class DatabaseService {
    constructor() {
        this.isConnected = false;
        this.connectionRetries = 0;
        this.maxRetries = 5;
    }

    /**
     * Kết nối đến MongoDB
     */
    async connect(mongoUri, options = {}) {
        if (this.isConnected) {
            console.log('📊 Already connected to MongoDB');
            return;
        }

        const defaultOptions = {
            maxPoolSize: 10,
            minPoolSize: 2,
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
            ...options
        };

        try {
            await mongoose.connect(mongoUri, defaultOptions);
            this.isConnected = true;
            this.connectionRetries = 0;

            console.log('✅ MongoDB connected successfully');
            console.log(`📍 Database: ${mongoose.connection.db.databaseName}`);
            console.log(`🖥️  Host: ${mongoose.connection.host}`);

            // Setup event listeners
            this.setupEventListeners();

        } catch (error) {
            console.error('❌ MongoDB connection error:', error.message);

            // Retry logic
            if (this.connectionRetries < this.maxRetries) {
                this.connectionRetries++;
                const retryDelay = Math.min(1000 * Math.pow(2, this.connectionRetries), 10000);
                console.log(`🔄 Retrying connection in ${retryDelay}ms... (Attempt ${this.connectionRetries}/${this.maxRetries})`);

                await new Promise(resolve => setTimeout(resolve, retryDelay));
                return this.connect(mongoUri, options);
            } else {
                throw new Error(`Failed to connect to MongoDB after ${this.maxRetries} attempts`);
            }
        }
    }

    /**
     * Setup event listeners cho MongoDB connection
     */
    setupEventListeners() {
        mongoose.connection.on('connected', () => {
            console.log('🔗 Mongoose connected to MongoDB');
        });

        mongoose.connection.on('error', (err) => {
            console.error('❌ Mongoose connection error:', err);
            this.isConnected = false;
        });

        mongoose.connection.on('disconnected', () => {
            console.log('⚠️  Mongoose disconnected from MongoDB');
            this.isConnected = false;
        });

        // Graceful shutdown
        process.on('SIGINT', async () => {
            await this.disconnect();
            process.exit(0);
        });
    }

    /**
     * Ngắt kết nối MongoDB
     */
    async disconnect() {
        if (!this.isConnected) {
            return;
        }

        try {
            await mongoose.connection.close();
            this.isConnected = false;
            console.log('👋 MongoDB connection closed');
        } catch (error) {
            console.error('Error closing MongoDB connection:', error);
            throw error;
        }
    }

    /**
     * Kiểm tra trạng thái kết nối
     */
    getConnectionStatus() {
        return {
            isConnected: this.isConnected,
            readyState: mongoose.connection.readyState,
            host: mongoose.connection.host,
            name: mongoose.connection.name
        };
    }

    /**
     * Seed dữ liệu mặc định (nếu cần)
     */
    async seedDefaultData() {
        const Profile = require('../models/profile.model');

        try {
            // Kiểm tra xem đã có profile mặc định chưa
            const existingDefault = await Profile.findOne({ profileId: 'default' });

            if (!existingDefault) {
                const defaultProfile = new Profile({
                    profileId: 'default',
                    name: 'Mặc định (60%)',
                    passThreshold: 3,
                    userId: 'default',
                    isDefault: true,
                    weights: new Map([
                        ['Lab 1', 3.5],
                        ['Lab 2', 3.5],
                        ['Lab 3', 3.5],
                        ['Lab 4', 3.5],
                        ['Lab 5', 3.5],
                        ['Lab 6', 3.5],
                        ['Lab 7', 3.5],
                        ['Lab 8', 3.5],
                        ['Quiz 1', 1.5],
                        ['Quiz 2', 1.5],
                        ['Quiz 3', 1.5],
                        ['Quiz 4', 1.5],
                        ['Quiz 5', 1.5],
                        ['Quiz 6', 1.5],
                        ['Quiz 7', 1.5],
                        ['Quiz 8', 1.5],
                        ['GD 1', 10],
                        ['GD 2', 10]
                    ])
                });

                await defaultProfile.save();
                console.log('✅ Default profile seeded successfully');
            }
        } catch (error) {
            console.error('Error seeding default data:', error);
        }
    }
}

// Export singleton instance
module.exports = new DatabaseService();
