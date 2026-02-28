// ========================================
// ROUTES CONFIGURATION
// ========================================

function initializeRoutes() {
    // Home / Grade Check
    router.register('/', {
        partial: '/partials/grade-check.html',
        handler: () => {
            // Wait for DOM to be ready, then populate
            setTimeout(() => {
                if (typeof updateProfileSelect === 'function') updateProfileSelect();
                GradeCheckModule.show();
            }, 50);
        },
        cleanup: () => {
            GradeCheckModule.cleanup();
        }
    });

    router.register('/grade-check', {
        partial: '/partials/grade-check.html',
        handler: () => {
            setTimeout(() => {
                if (typeof updateProfileSelect === 'function') updateProfileSelect();
                GradeCheckModule.show();
            }, 50);
        },
        cleanup: () => {
            GradeCheckModule.cleanup();
        }
    });

    // Profiles
    router.register('/profiles', {
        partial: '/partials/profiles.html',
        handler: () => {
            ProfilesModule.show();
        },
        cleanup: () => {
            ProfilesModule.cleanup();
        }
    });

    // Classes List
    router.register('/classes', {
        partial: '/partials/classes.html',
        handler: () => {
            ClassesModule.showList();
        },
        cleanup: () => {
            ClassesModule.cleanup();
        }
    });

    // Class Detail
    router.register('/classes/detail', {
        partial: '/partials/classes.html',
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
        partial: '/partials/template.html',
        handler: () => {
            setTimeout(() => {
                if (typeof updateProfileSelect === 'function') updateProfileSelect();
                if (typeof updateClassSelect === 'function') updateClassSelect();
                if (typeof TemplateModule !== 'undefined') {
                    TemplateModule.show();
                }
            }, 50);
        },
        cleanup: () => {
            if (typeof TemplateModule !== 'undefined') {
                TemplateModule.cleanup();
            }
        }
    });

    // Timer
    router.register('/timer', {
        partial: '/partials/timer.html',
        handler: () => {
            setTimeout(() => {
                if (typeof TimerModule !== 'undefined') {
                    TimerModule.init();
                    TimerModule.updateUI();
                }
            }, 50);
        },
        cleanup: () => {
            // Timer continues running in background
        }
    });

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
        'template': '/template',
        'timer': '/timer'
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
