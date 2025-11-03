// ========================================
// ROUTES CONFIGURATION
// ========================================

function initializeRoutes() {
    // Home / Grade Check
    router.register('/', {
        handler: () => {
            GradeCheckModule.show();
        },
        cleanup: () => {
            GradeCheckModule.cleanup();
        }
    });

    router.register('/grade-check', {
        handler: () => {
            GradeCheckModule.show();
        },
        cleanup: () => {
            GradeCheckModule.cleanup();
        }
    });

    // Profiles
    router.register('/profiles', {
        handler: () => {
            ProfilesModule.show();
        },
        cleanup: () => {
            ProfilesModule.cleanup();
        }
    });

    // Classes List
    router.register('/classes', {
        handler: () => {
            ClassesModule.showList();
        },
        cleanup: () => {
            ClassesModule.cleanup();
        }
    });

    // Class Detail
    router.register('/classes/detail', {
        handler: (params) => {
            if (params.classId) {
                ClassesModule.showDetail(params.classId);
            } else {
                ClassesModule.showList();
            }
        },
        cleanup: () => {
            ClassesModule.cleanup();
        }
    });

    // Template
    router.register('/template', {
        handler: () => {
            TemplateModule.show();
        },
        cleanup: () => {
            TemplateModule.cleanup();
        }
    });

    // Initialize router
    router.init();
}

// Helper function to navigate (replaces old switchTab)
function navigateTo(route, params = {}) {
    router.navigate(route, params);
}

// Backward compatibility: Update old switchTab function to use router
function switchTab(tabName) {
    const routeMap = {
        'grade-check': '/grade-check',
        'profiles': '/profiles',
        'classes': '/classes',
        'template': '/template'
    };

    const route = routeMap[tabName] || '/';
    navigateTo(route);
}

// Update global functions to use router and modules
function showClassDetailView(classId) {
    navigateTo('/classes/detail', { classId });
}

function showClassesList() {
    navigateTo('/classes');
}

function editCurrentClass() {
    if (window.ClassesModule && typeof ClassesModule.editClass === 'function') {
        ClassesModule.editClass();
    }
}

function removeStudentFromClass(mssv) {
    if (window.ClassesModule && typeof ClassesModule.removeStudent === 'function') {
        ClassesModule.removeStudent(mssv);
    }
}

function exportClassStudents() {
    if (window.ClassesModule && typeof ClassesModule.exportGrades === 'function') {
        ClassesModule.exportGrades();
    }
}

// Backward compatibility for inline event handlers
function loadGradeProfile() {
    if (window.GradeCheckModule && typeof GradeCheckModule.loadGradeProfile === 'function') {
        GradeCheckModule.loadGradeProfile();
    }
}
