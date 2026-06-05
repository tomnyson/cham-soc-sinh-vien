const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const ejs = require('ejs');
const session = require('express-session');
const passport = require('passport');
const cookieParser = require('cookie-parser');
const config = require('../config/app.config');
const profileService = require('./services/profile.service');
const classService = require('./services/class.service');
const brandingService = require('./services/branding.service');

// Middleware
const { notFoundHandler, errorHandler } = require('./middleware/error.middleware');
const { optionalAuth, evaluateLecturerAccess } = require('./middleware/auth.middleware');

// Controllers
const dashboardController = require('./controllers/dashboard.controller');

// Routes
const apiRoutes = require('./routes/api.routes');

// Initialize app
const app = express();
const fsPromises = fs.promises;

function hashAssetTree() {
    const explicitVersion = process.env.ASSET_VERSION
        || process.env.BUILD_VERSION
        || process.env.GIT_COMMIT
        || process.env.RENDER_GIT_COMMIT
        || process.env.SOURCE_VERSION;

    if (explicitVersion) {
        return String(explicitVersion).replace(/[^a-zA-Z0-9_.-]/g, '').slice(0, 32) || 'dev';
    }

    const hash = crypto.createHash('sha1');
    const roots = [
        path.join(__dirname, '../public/css'),
        path.join(__dirname, '../public/js'),
        path.join(__dirname, '../views')
    ];
    const allowedExts = new Set(['.css', '.js', '.ejs']);

    function walk(dir) {
        if (!fs.existsSync(dir)) return;
        fs.readdirSync(dir, { withFileTypes: true })
            .sort((a, b) => a.name.localeCompare(b.name))
            .forEach(entry => {
                const fullPath = path.join(dir, entry.name);
                if (entry.isDirectory()) {
                    walk(fullPath);
                    return;
                }
                if (!allowedExts.has(path.extname(entry.name))) return;
                hash.update(path.relative(__dirname, fullPath));
                hash.update(fs.readFileSync(fullPath));
            });
    }

    roots.forEach(walk);
    return hash.digest('hex').slice(0, 12);
}

const assetVersion = hashAssetTree();

app.locals.assetVersion = assetVersion;
app.locals.assetPath = function assetPath(assetUrl) {
    const separator = assetUrl.includes('?') ? '&' : '?';
    return `${assetUrl}${separator}v=${assetVersion}`;
};

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
    const branding = await brandingService.getGlobalBranding();

    res.render('layouts/master', {
        title,
        currentRoute,
        body,
        initialData: safeInitialData,
        user: userData,
        branding
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
    const normalizedStudents = students.map(student => ({
        mssv: String(student?.mssv || '').trim(),
        name: String(student?.name || '').trim(),
        phone: String(student?.phone || '').trim(),
        email: String(student?.email || '').trim().toLowerCase()
    }));

    const gradesDoc = classDoc.grades || null;
    let normalizedGrades = null;

    if (gradesDoc && typeof gradesDoc === 'object') {
        const rawGradeStudents = (() => {
            if (gradesDoc.students instanceof Map) {
                return Object.fromEntries(gradesDoc.students.entries());
            }

            if (gradesDoc.students && typeof gradesDoc.students === 'object' && !Array.isArray(gradesDoc.students)) {
                return gradesDoc.students;
            }

            // Legacy compatibility: grades stored directly by MSSV (without grades.students wrapper)
            if (!Object.prototype.hasOwnProperty.call(gradesDoc, 'students') && !Array.isArray(gradesDoc)) {
                return Object.entries(gradesDoc).reduce((acc, [key, value]) => {
                    if (key === 'profileId') return acc;
                    acc[key] = value;
                    return acc;
                }, {});
            }

            return {};
        })();

        const studentEntries = rawGradeStudents instanceof Map
            ? Array.from(rawGradeStudents.entries())
            : Object.entries(rawGradeStudents || {});

        normalizedGrades = {
            profileId: String(gradesDoc.profileId || '').trim(),
            students: studentEntries.reduce((acc, [key, value]) => {
                const mssv = String(key || '').trim();
                if (!mssv) return acc;

                if (value instanceof Map) {
                    acc[mssv] = Object.fromEntries(value.entries());
                    return acc;
                }

                acc[mssv] = (value && typeof value === 'object' && !Array.isArray(value))
                    ? { ...value }
                    : {};
                return acc;
            }, {})
        };
    }

    return {
        classId: classDoc.classId || '',
        name: classDoc.name || 'Chưa đặt tên',
        description: classDoc.description || '',
        students: normalizedStudents,
        grades: normalizedGrades,
        year: typeof classDoc.year === 'number' ? classDoc.year : null,
        block: classDoc.block === 1 || classDoc.block === 2 ? classDoc.block : null,
        semester: classDoc.semester || '',
        instructorCode: classDoc.instructorCode || '',
        isArchived: Boolean(classDoc.isArchived),
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

// Static assets only. Keep "/" on the server-rendered route instead of the
// legacy public/index.html shell, whose menu can drift from the EJS layout.
app.use(express.static(path.join(__dirname, '../public'), {
    index: false,
    setHeaders(res, filePath) {
        if (path.extname(filePath) === '.html') {
            res.setHeader('Cache-Control', 'no-store, must-revalidate');
        }
    }
}));

// API routes (must be before page routes)
app.use('/api', apiRoutes);

/**
 * Page-level guard for internal lecturer features.
 *
 * Enforces:
 *   - User must be logged in (redirects to login when missing).
 *   - Account must be active and not expired (renders the account-status
 *     page otherwise so the user understands why they cannot proceed).
 *
 * Super admins always pass through.
 */
function ensureLecturerAccess(req, res) {
    if (!req.user) {
        res.redirect('/?login=required');
        return false;
    }
    const verdict = evaluateLecturerAccess(req.user);
    if (verdict.allowed) return true;

    renderLayoutPage(req, res, 'account-status', {
        title: 'Tài khoản chưa được duyệt - FPT Polytechnic',
        currentRoute: req.path,
        pageData: {
            accessState: verdict,
            serviceExpiresAt: req.user.serviceExpiresAt || null
        }
    }).catch(error => {
        console.error('Failed to render account-status page:', error);
        res.status(500).send('Internal Server Error');
    });
    return false;
}

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

// Grade Entry Dashboard (lecturer) - requires authentication, controller handles layout.
app.get('/dashboard', optionalAuth, (req, res, next) => {
    if (!ensureLecturerAccess(req, res)) return;
    return dashboardController.renderDashboard(req, res, next);
});

// Student Care - lists students from active classes that need follow-up.
const studentCareController = require('./controllers/student-care.controller');
app.get('/student-care', optionalAuth, async (req, res, next) => {
    try {
        if (!ensureLecturerAccess(req, res)) return;
        const filters = studentCareController.normalizeFilters(req.query);
        const careData = await studentCareController.buildStudentCareList(req.user._id, filters);
        await renderLayoutPage(req, res, 'student-care', {
            title: 'Chăm sóc sinh viên - FPT Polytechnic',
            currentRoute: '/student-care',
            pageData: { careData }
        });
    } catch (error) {
        console.error('Error rendering student-care:', error);
        next(error);
    }
});

app.get('/profiles', optionalAuth, async (req, res, next) => {
    try {
        if (!ensureLecturerAccess(req, res)) return;
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
        if (!ensureLecturerAccess(req, res)) return;
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
    if (!ensureLecturerAccess(req, res)) return;

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

app.get('/classes/:classId/note', optionalAuth, async (req, res, next) => {
    if (!ensureLecturerAccess(req, res)) return;

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

        const noteClassData = {
            classId: classDoc.classId || classId,
            name: classDoc.name || 'Chưa đặt tên',
            description: classDoc.description || '',
            updatedAt: classDoc.updatedAt || null
        };

        await renderLayoutPage(req, res, 'class-note', {
            title: `Note bảng ${noteClassData.name} - FPT Polytechnic`,
            currentRoute: '/classes',
            pageData: {
                classData: noteClassData
            },
            initialData: {
                classNote: {
                    classId: noteClassData.classId,
                    name: noteClassData.name
                }
            }
        });
    } catch (error) {
        console.error('Error rendering class note:', error);
        next(error);
    }
});

app.get('/branding', optionalAuth, async (req, res, next) => {
    if (!req.user) {
        return res.redirect('/?login=required');
    }
    if (req.user.role !== 'admin') {
        return renderLayoutPage(req, res, 'forbidden', {
            title: 'Không có quyền truy cập - FPT Polytechnic',
            currentRoute: '/branding',
            pageData: {
                title: 'Không có quyền truy cập',
                message: 'Trang này chỉ dành cho super admin.',
                backUrl: '/dashboard'
            }
        });
    }

    try {
        await renderLayoutPage(req, res, 'branding', {
            title: 'settings',
            currentRoute: '/branding',
            initialData: {
                brandingDefault: brandingService.getDefaultBranding()
            }
        });
    } catch (error) {
        console.error('Error rendering branding page:', error);
        next(error);
    }
});

app.get('/template', optionalAuth, async (req, res, next) => {
    try {
        if (!ensureLecturerAccess(req, res)) return;
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

// Admin: Lecturer management (super admin only)
app.get('/admin/lecturers', optionalAuth, async (req, res, next) => {
    if (!req.user) {
        return res.redirect('/?login=required');
    }
    if (req.user.role !== 'admin') {
        return renderLayoutPage(req, res, 'forbidden', {
            title: 'Không có quyền truy cập - FPT Polytechnic',
            currentRoute: '/admin/lecturers',
            pageData: {
                title: 'Không có quyền truy cập',
                message: 'Trang này chỉ dành cho super admin.',
                backUrl: '/dashboard'
            }
        });
    }
    try {
        await renderLayoutPage(req, res, 'admin-lecturers', {
            title: 'Quản lý giảng viên - FPT Polytechnic',
            currentRoute: '/admin/lecturers'
        });
    } catch (error) {
        console.error('Error rendering admin-lecturers:', error);
        next(error);
    }
});

// 404 handler
app.use(notFoundHandler);

// Error handler
app.use(errorHandler);

module.exports = app;
