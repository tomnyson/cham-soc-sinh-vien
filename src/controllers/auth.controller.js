const jwt = require('jsonwebtoken');
const User = require('../models/user.model');

/**
 * Authentication Controller
 */

/**
 * Generate JWT token
 */
const generateToken = (user) => {
    return jwt.sign(
        {
            id: user._id,
            email: user.email,
            role: user.role
        },
        process.env.JWT_SECRET || 'your-secret-key-change-in-production',
        { expiresIn: '7d' }
    );
};

/**
 * Handle successful Google OAuth callback
 */
exports.googleCallback = async (req, res) => {
    try {
        // User is already authenticated via passport
        const user = req.user;

        // Generate JWT token
        const token = generateToken(user);

        // Set cookie with token
        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
        });

        // Redirect to frontend with success
        res.redirect('/?login=success');
    } catch (error) {
        console.error('Google callback error:', error);
        res.redirect('/?login=error');
    }
};

/**
 * Get current user
 */
exports.getCurrentUser = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Not authenticated'
            });
        }

        res.json({
            success: true,
            user: {
                id: req.user._id,
                name: req.user.name,
                email: req.user.email,
                picture: req.user.picture,
                role: req.user.role
            }
        });
    } catch (error) {
        console.error('Get current user error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};

/**
 * Logout user
 */
exports.logout = (req, res) => {
    try {
        // Clear cookie
        res.clearCookie('token');

        // Logout from passport session
        req.logout((err) => {
            if (err) {
                console.error('Logout error:', err);
            }
            res.json({
                success: true,
                message: 'Logged out successfully'
            });
        });
    } catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};

/**
 * Check authentication status
 */
exports.checkAuth = (req, res) => {
    res.json({
        success: true,
        authenticated: !!req.user,
        user: req.user ? {
            id: req.user._id,
            name: req.user.name,
            email: req.user.email,
            picture: req.user.picture,
            role: req.user.role
        } : null
    });
};
