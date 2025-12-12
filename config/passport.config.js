const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../src/models/user.model');
const Profile = require('../src/models/profile.model');
const {
    DEFAULT_PROFILE_ID,
    DEFAULT_PROFILE_NAME,
    DEFAULT_PASS_THRESHOLD,
    DEFAULT_WEIGHTS
} = require('../src/constants/profile.constants');

/**
 * Passport Google OAuth Configuration
 */
module.exports = function(passport) {
    // Serialize user for session
    passport.serializeUser((user, done) => {
        done(null, user.id);
    });

    // Deserialize user from session
    passport.deserializeUser(async (id, done) => {
        try {
            const user = await User.findById(id);
            done(null, user);
        } catch (error) {
            done(error, null);
        }
    });

    // Google OAuth Strategy
    passport.use(new GoogleStrategy({
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: process.env.GOOGLE_CALLBACK_URL || '/api/auth/google/callback'
    },
    async (accessToken, refreshToken, profile, done) => {
        try {
            // Check if user already exists
            let user = await User.findOne({ googleId: profile.id });

            if (user) {
                // Update last login
                user.lastLogin = new Date();
                await user.save();
                return done(null, user);
            }

            // Create new user
            user = await User.create({
                googleId: profile.id,
                email: profile.emails[0].value,
                name: profile.displayName,
                picture: profile.photos[0]?.value,
                lastLogin: new Date()
            });

            // Create default profile for new user
            await Profile.create({
                profileId: DEFAULT_PROFILE_ID,
                name: DEFAULT_PROFILE_NAME,
                passThreshold: DEFAULT_PASS_THRESHOLD,
                userId: user._id,
                isDefault: true,
                weights: new Map(DEFAULT_WEIGHTS)
            });

            console.log(`✅ Created default profile for new user: ${user.email}`);

            done(null, user);
        } catch (error) {
            done(error, null);
        }
    }));
};
