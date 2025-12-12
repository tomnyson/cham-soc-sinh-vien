const mongoose = require('mongoose');

/**
 * User Schema
 * Stores user information for Google OAuth authentication
 */
const userSchema = new mongoose.Schema({
    googleId: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },
    name: {
        type: String,
        required: true,
        trim: true
    },
    picture: {
        type: String
    },
    role: {
        type: String,
        enum: ['user', 'admin'],
        default: 'user'
    },
    lastLogin: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// Indexes
userSchema.index({ email: 1 });
userSchema.index({ googleId: 1 });

// Methods
userSchema.methods.toJSON = function() {
    const user = this.toObject();
    delete user.__v;
    return user;
};

const User = mongoose.model('User', userSchema);

module.exports = User;
