const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../src/models/user.model');
const Profile = require('../src/models/profile.model');
const { isSuperAdminEmail } = require('../src/utils/super-admin.util');
const {
    DEFAULT_PROFILE_ID,
    DEFAULT_PROFILE_NAME,
    DEFAULT_PASS_THRESHOLD,
    DEFAULT_WEIGHTS
} = require('../src/constants/profile.constants');

/**
 * Passport Google OAuth Configuration
 *
 * On login:
 *   - If the email is in SUPER_ADMIN_EMAILS, the user is force-promoted to
 *     `admin` with status `active` (no expiration).
 *   - New users are created with role `lecturer` and status `pending`. They
 *     can sign in but internal pages are gated until a super admin approves.
 *   - Existing accounts have their `lastLogin` refreshed and their super-admin
 *     state re-synchronized in case env settings changed.
 */
module.exports = function (passport) {
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
                const email = profile.emails?.[0]?.value || '';
                const isSuperAdmin = isSuperAdminEmail(email);

                let user = await User.findOne({ googleId: profile.id });

                if (user) {
                    // Re-sync super admin status on every login so env changes
                    // take effect without manual DB intervention.
                    if (isSuperAdmin) {
                        user.role = 'admin';
                        user.status = 'active';
                        user.serviceExpiresAt = null;
                    }
                    user.lastLogin = new Date();
                    if (profile.photos?.[0]?.value) {
                        user.picture = profile.photos[0].value;
                    }
                    await user.save();
                    return done(null, user);
                }

                // Create new user. Super admins are immediately active. All
                // other accounts start as pending lecturers awaiting approval.
                user = await User.create({
                    googleId: profile.id,
                    email,
                    name: profile.displayName,
                    picture: profile.photos?.[0]?.value || '',
                    role: isSuperAdmin ? 'admin' : 'lecturer',
                    status: isSuperAdmin ? 'active' : 'pending',
                    serviceExpiresAt: null,
                    lastLogin: new Date()
                });

                // Create default profile for the new user (only useful once
                // they have access, but harmless to create up-front).
                await Profile.create({
                    profileId: DEFAULT_PROFILE_ID,
                    name: DEFAULT_PROFILE_NAME,
                    passThreshold: DEFAULT_PASS_THRESHOLD,
                    userId: user._id,
                    isDefault: true,
                    weights: new Map(DEFAULT_WEIGHTS)
                });

                console.log(`✅ Created ${user.role} account for ${user.email} (status: ${user.status})`);

                done(null, user);
            } catch (error) {
                done(error, null);
            }
        }));
};
