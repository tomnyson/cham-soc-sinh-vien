/**
 * Layout Manager
 * Handles sidebar, navigation, and common UI interactions
 */

(function() {
    'use strict';

    // Initialize layout when DOM is ready
    document.addEventListener('DOMContentLoaded', function() {
        initializeSidebar();
        initializeNavigation();
        initializeModals();
        initializeAuth();
    });

    /**
     * Initialize sidebar toggle
     */
    function initializeSidebar() {
        const toggleBtn = document.getElementById('toggleSidebar');
        const sidebar = document.getElementById('sidebar');

        if (toggleBtn && sidebar) {
            toggleBtn.addEventListener('click', function() {
                const isMobile = window.innerWidth < 768;
                
                if (isMobile) {
                    sidebar.classList.toggle('show');
                } else {
                    sidebar.classList.toggle('collapsed');
                }
            });

            // Close sidebar when clicking outside on mobile
            document.addEventListener('click', function(event) {
                const isMobile = window.innerWidth < 768;
                
                if (isMobile && sidebar.classList.contains('show')) {
                    if (!sidebar.contains(event.target) && !toggleBtn.contains(event.target)) {
                        sidebar.classList.remove('show');
                    }
                }
            });
        }
    }

    /**
     * Initialize navigation active states
     */
    function initializeNavigation() {
        window.addEventListener('popstate', updateActiveNavigation);
        updateActiveNavigation();
    }

    /**
     * Update active navigation items
     */
    function updateActiveNavigation() {
        const path = window.location.pathname || '/grade-check';
        
        // Update sidebar nav items
        document.querySelectorAll('.sidebar .nav-item').forEach(item => {
            const route = item.getAttribute('data-route');
            if (route === path || (path === '/' && route === '/grade-check')) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });

        // Update mobile bottom nav items
        document.querySelectorAll('.mobile-nav-item').forEach(item => {
            const route = item.getAttribute('data-route');
            if (route === path || (path === '/' && route === '/grade-check')) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });
    }

    /**
     * Initialize modal helpers
     */
    function initializeModals() {
        // Profile Modal helpers
        window.closeProfileModal = function() {
            const modal = bootstrap.Modal.getInstance(document.getElementById('profileModal'));
            if (modal) modal.hide();
        };

        window.showProfileModal = function() {
            const modal = new bootstrap.Modal(document.getElementById('profileModal'));
            modal.show();
        };

        // Class Modal helpers
        window.closeClassModal = function() {
            const modal = bootstrap.Modal.getInstance(document.getElementById('classModal'));
            if (modal) modal.hide();
        };

        window.showClassModal = function() {
            const modal = new bootstrap.Modal(document.getElementById('classModal'));
            modal.show();
        };
    }

    /**
     * Initialize authentication
     */
    async function initializeAuth() {
        try {
            // Initialize authentication first
            await AuthModule.init();

            // Only initialize other modules if authenticated
            if (AuthModule.isAuthenticated) {
                // Initialize modules
                GradeCheckModule.init();
                ProfilesModule.init();
                ClassesModule.init();
                TemplateModule.init();

                // Wait for init.js to load data, then initialize routes
                setTimeout(() => {
                    if (typeof initializeRoutes === 'function') {
                        initializeRoutes();
                    }
                }, 100);
            }
        } catch (error) {
            console.error('Layout initialization error:', error);
        }
    }

    /**
     * Update mobile nav (backward compatibility)
     */
    window.updateMobileNav = function(tabName) {
        const routeMap = {
            'grade-check': '/grade-check',
            'profiles': '/profiles',
            'classes': '/classes',
            'template': '/template'
        };

        const route = routeMap[tabName] || '/grade-check';
        if (typeof navigateTo === 'function') {
            navigateTo(route);
        } else {
            window.location.href = route;
        }
    };

})();
