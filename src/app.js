const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const ejs = require('ejs');
const session = require('express-session');
const passport = require('passport');
const cookieParser = require('cookie-parser');
const config = require('../config/app.config');
const profileService = require('./services/profile.service');
const classService = require('./services/class.service');

// Middleware
const { notFoundHandler, errorHandler } = require('./middleware/error.middleware');
const { optionalAuth } = require('./middleware/auth.middleware');

// Routes
const apiRoutes = require('./routes/api.routes');

// Initialize app
const app = express();
const fsPromises = fs.promises;

/**
 * Render a page inside the master layout
 */
async function renderLayoutPage(req, res, viewName, {
    title = 'FPT Polytechnic - Hệ thống quản lý điểm',
    currentRoute = '/',
    pageData = {},
    initialData = null
} = {}) {
    console.log(`Rendering page: ${viewName} | Route: ${currentRoute}`);
    const safeInitialData = initialData ? { ...initialData } : null;
    const userData = req?.user ? {
        id: req.user._id?.toString?.() || req.user._id,
        name: req.user.name || '',
        email: req.user.email || '',
        picture: req.user.picture || '',
        role: req.user.role || 'user'
    } : null;

    if (safeInitialData && userData) {
        safeInitialData.currentUser = userData;
    }

    const viewPath = path.join(__dirname, '../views/pages', `${viewName}.ejs`);
    const template = await fsPromises.readFile(viewPath, 'utf8');
    const body = ejs.render(template, pageData, { filename: viewPath });

    res.render('layouts/master', {
        title,
        currentRoute,
        body,
        initialData: safeInitialData,
        user: userData
    });
}

/**
 * Normalize profile data for views/scripts
 */
function serializeProfile(profileDoc = {}) {
    const weightsMap = profileDoc.weights instanceof Map
        ? profileDoc.weights
        : new Map(Object.entries(profileDoc.weights || {}));

    return {
        profileId: profileDoc.profileId || '',
        name: profileDoc.name || 'Chưa đặt tên',
        passThreshold: typeof profileDoc.passThreshold === 'number' ? profileDoc.passThreshold : 3,
        weights: Object.fromEntries(weightsMap),
        isDefault: Boolean(profileDoc.isDefault)
    };
}

/**
 * Normalize class data for views/scripts
 */
function serializeClass(classDoc = {}) {
    const students = Array.isArray(classDoc.students) ? classDoc.students : [];
    const gradesDoc = classDoc.grades || null;
    let normalizedGrades = null;

    if (gradesDoc) {
        const studentEntries = gradesDoc.students instanceof Map
            ? Array.from(gradesDoc.students.entries())
            : Object.entries(gradesDoc.students || {});

        normalizedGrades = {
            profileId: gradesDoc.profileId || '',
            students: studentEntries.reduce((acc, [key, value]) => {
                acc[key] = value || {};
                return acc;
            }, {})
        };
    }

    return {
        classId: classDoc.classId || '',
        name: classDoc.name || 'Chưa đặt tên',
        description: classDoc.description || '',
        students: students.map(student => ({
            mssv: student.mssv || '',
            name: student.name || ''
        })),
        grades: normalizedGrades,
        createdAt: classDoc.createdAt,
        updatedAt: classDoc.updatedAt
    };
}

// View engine setup - EJS
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '../views'));

// Register view helpers
const { registerHelpers } = require('./helpers/view.helper');
registerHelpers(app);

// CORS - must be configured before other middleware
app.use(cors({
    ...config.cors,
    credentials: true,
    origin: process.env.CORS_ORIGIN === '*' ? true : process.env.CORS_ORIGIN
}));

// Body parser
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Cookie parser
app.use(cookieParser());

// Express session
app.use(session({
    secret: process.env.SESSION_SECRET || 'your-session-secret-change-in-production',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
}));

// Passport initialization
app.use(passport.initialize());
app.use(passport.session());

// Passport configuration
require('../config/passport.config')(passport);

// Static files
app.use(express.static(path.join(__dirname, '../public')));

// API routes (must be before page routes)
app.use('/api', apiRoutes);

// Page routes - Server-side rendering with EJS
app.get('/', (req, res) => {
    res.redirect('/grade-check');
});

app.get('/grade-check', optionalAuth, async (req, res, next) => {
    try {
        await renderLayoutPage(req, res, 'grade-check', {
            title: 'Kiểm tra điểm - FPT Polytechnic',
            currentRoute: '/grade-check'
        });
    } catch (error) {
        console.error('Error rendering grade-check:', error);
        next(error);
    }
});

app.get('/profiles', optionalAuth, async (req, res, next) => {
    try {
        await renderLayoutPage(req, res, 'profiles', {
            title: 'Quản lý Profile - FPT Polytechnic',
            currentRoute: '/profiles'
        });
    } catch (error) {
        console.error('Error rendering profiles:', error);
        next(error);
    }
});

app.get('/classes', optionalAuth, async (req, res, next) => {
    try {
        const userId = req.user?._id || null;

        // Preload profiles/classes so the client can render immediately without an extra round-trip
        let profiles = [];
        let classes = [];

        if (userId) {
            const [profilesResult, classesResult] = await Promise.allSettled([
                profileService.getAllProfiles(userId),
                classService.getAllClasses(userId)
            ]);

            if (profilesResult.status === 'fulfilled') {
                profiles = profilesResult.value || [];
            } else {
                console.warn('Unable to preload profiles for /classes:', profilesResult.reason?.message || profilesResult.reason);
            }

            if (classesResult.status === 'fulfilled') {
                classes = classesResult.value || [];
            } else {
                console.warn('Unable to preload classes for /classes:', classesResult.reason?.message || classesResult.reason);
            }
        }

        const serializedProfiles = profiles.map(serializeProfile);
        const serializedClasses = classes.map(serializeClass);

        const profilesById = serializedProfiles.reduce((acc, profile) => {
            if (profile.profileId) {
                acc[profile.profileId] = profile;
            }
            return acc;
        }, {});

        const classesById = serializedClasses.reduce((acc, cls) => {
            if (cls.classId) {
                acc[cls.classId] = cls;
            }
            return acc;
        }, {});

        const selectedProfileId =
            serializedProfiles.find(profile => profile.isDefault)?.profileId ||
            serializedProfiles[0]?.profileId ||
            '';

        const selectedClassId = serializedClasses[0]?.classId || '';

        await renderLayoutPage(req, res, 'classes', {
            title: 'Quản lý Lớp học - FPT Polytechnic',
            currentRoute: '/classes',
            pageData: {
                profiles: serializedProfiles,
                classes: serializedClasses,
                selectedProfileId,
                selectedClassId
            },
            initialData: Object.keys(profilesById).length || Object.keys(classesById).length ? {
                profiles: profilesById,
                classes: classesById,
                currentProfile: selectedProfileId,
                currentClass: selectedClassId
            } : null
        });
    } catch (error) {
        console.error('Error rendering classes:', error);
        next(error);
    }
});

app.get('/classes/:classId', optionalAuth, async (req, res, next) => {
    if (!req.user) {
        return res.redirect('/?login=required');
    }

    const userId = req.user._id;

    try {
        const classId = req.params.classId;
        let classDoc;

        try {
            classDoc = await classService.getClassById(classId, userId);
        } catch (err) {
            if (err.message.includes('Class not found')) {
                return renderLayoutPage(req, res, 'class-not-found', {
                    title: 'Không tìm thấy lớp - FPT Polytechnic',
                    currentRoute: '/classes',
                    pageData: { classId }
                });
            }
            throw err;
        }

        const profileDocs = await profileService.getAllProfiles(userId);

        const classData = serializeClass(classDoc);
        const profiles = (profileDocs || []).map(serializeProfile);

        const profilesById = profiles.reduce((acc, profile) => {
            if (profile.profileId) {
                acc[profile.profileId] = profile;
            }
            return acc;
        }, {});

        const selectedProfileId =
            classData.grades?.profileId ||
            profiles.find(profile => profile.isDefault)?.profileId ||
            profiles[0]?.profileId ||
            '';

        if (!classData.grades) {
            classData.grades = {
                profileId: selectedProfileId,
                students: {}
            };
        } else if (!classData.grades.profileId) {
            classData.grades.profileId = selectedProfileId;
        }

        await renderLayoutPage(req, res, 'class-detail', {
            title: `Chi tiết lớp ${classData.name} - FPT Polytechnic`,
            currentRoute: '/classes',
            pageData: {
                classData,
                profiles,
                selectedProfileId
            },
            initialData: {
                classDetail: classData,
                profiles: profilesById,
                currentProfile: selectedProfileId
            }
        });
    } catch (error) {
        console.error('Error rendering class detail:', error);
        next(error);
    }
});

app.get('/template', async (req, res, next) => {
    try {
        const userId = req.user?._id || 'default';
        const [profilesResult, classesResult] = await Promise.allSettled([
            profileService.getAllProfiles(userId),
            classService.getAllClasses(userId)
        ]);

        if (profilesResult.status === 'rejected') {
            console.warn('Unable to load profiles for template page:', profilesResult.reason?.message || profilesResult.reason);
        }

        if (classesResult.status === 'rejected') {
            console.warn('Unable to load classes for template page:', classesResult.reason?.message || classesResult.reason);
        }

        const profilesData = profilesResult.status === 'fulfilled' ? profilesResult.value : [];
        const classesData = classesResult.status === 'fulfilled' ? classesResult.value : [];

        const profiles = (profilesData || []).map(serializeProfile);
        const classes = (classesData || []).map(serializeClass);

        const profilesById = profiles.reduce((acc, profile) => {
            if (profile.profileId) {
                acc[profile.profileId] = profile;
            }
            return acc;
        }, {});

        const classesById = classes.reduce((acc, classItem) => {
            if (classItem.classId) {
                acc[classItem.classId] = classItem;
            }
            return acc;
        }, {});

        const selectedProfileId =
            profiles.find(profile => profile.isDefault)?.profileId ||
            profiles[0]?.profileId ||
            '';

        const selectedClassId = classes[0]?.classId || '';

        await renderLayoutPage(req, res, 'template', {
            title: 'Tạo Template - FPT Polytechnic',
            currentRoute: '/template',
            pageData: {
                profiles,
                classes,
                selectedProfileId,
                selectedClassId
            },
            initialData: {
                profiles: profilesById,
                classes: classesById,
                currentProfile: selectedProfileId,
                currentClass: selectedClassId
            }
        });
    } catch (error) {
        console.error('Error rendering template:', error);
        next(error);
    }
});

// 404 handler
app.use(notFoundHandler);

// Error handler
app.use(errorHandler);

module.exports = app;
