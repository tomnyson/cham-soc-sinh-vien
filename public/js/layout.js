/**
 * Layout Manager
 * Handles sidebar, navigation, and common UI interactions
 */

(function() {
    'use strict';

    // Initialize layout when DOM is ready
    document.addEventListener('DOMContentLoaded', function() {
        initializeThemeMode();
        initializeSidebar();
        initializeNavigation();
        initializeModals();
        initializeAuth();
    });

    /**
     * Initialize light/dark theme mode.
     */
    function initializeThemeMode() {
        const storageKey = 'studentCareTheme';
        const root = document.documentElement;
        const toggle = document.getElementById('themeModeToggle');
        const mediaQuery = window.matchMedia
            ? window.matchMedia('(prefers-color-scheme: dark)')
            : null;

        const getSavedTheme = () => {
            try {
                const savedTheme = localStorage.getItem(storageKey);
                return savedTheme === 'light' || savedTheme === 'dark' ? savedTheme : null;
            } catch (error) {
                return null;
            }
        };

        const getPreferredTheme = () => {
            const savedTheme = getSavedTheme();
            if (savedTheme) return savedTheme;
            return mediaQuery && mediaQuery.matches ? 'dark' : 'light';
        };

        const updateToggle = (theme) => {
            if (!toggle) return;
            const isDark = theme === 'dark';
            toggle.dataset.themeMode = theme;
            toggle.classList.toggle('is-dark', isDark);
            toggle.classList.toggle('is-light', !isDark);
            toggle.querySelectorAll('[data-theme-choice]').forEach((option) => {
                const isActive = option.dataset.themeChoice === theme;
                option.classList.toggle('active', isActive);
                option.setAttribute('aria-pressed', String(isActive));
            });
            toggle.setAttribute(
                'aria-label',
                isDark ? 'Đang dùng giao diện tối' : 'Đang dùng giao diện sáng'
            );
            toggle.setAttribute(
                'title',
                isDark ? 'Đang dùng giao diện tối' : 'Đang dùng giao diện sáng'
            );
        };

        const applyTheme = (theme) => {
            root.dataset.theme = theme;
            updateToggle(theme);
        };

        applyTheme(getPreferredTheme());

        if (toggle) {
            toggle.addEventListener('click', (event) => {
                const choice = event.target.closest('[data-theme-choice]');
                const nextTheme = choice
                    ? choice.dataset.themeChoice
                    : (root.dataset.theme === 'dark' ? 'light' : 'dark');
                if (nextTheme !== 'light' && nextTheme !== 'dark') return;
                try {
                    localStorage.setItem(storageKey, nextTheme);
                } catch (error) {
                    // Theme still applies for this page view when storage is unavailable.
                }
                applyTheme(nextTheme);
            });
        }

        if (mediaQuery) {
            const onSystemThemeChange = (event) => {
                if (getSavedTheme()) return;
                applyTheme(event.matches ? 'dark' : 'light');
            };

            if (typeof mediaQuery.addEventListener === 'function') {
                mediaQuery.addEventListener('change', onSystemThemeChange);
            } else if (typeof mediaQuery.addListener === 'function') {
                mediaQuery.addListener(onSystemThemeChange);
            }
        }
    }

    /**
     * Initialize sidebar toggle
     */
    function initializeSidebar() {
        const toggleBtn = document.getElementById('toggleSidebar');
        const sidebar = document.getElementById('sidebar');
        const backdrop = document.getElementById('sidebarBackdrop');

        const isMobileViewport = () => window.innerWidth < 768;
        const closeSidebar = () => {
            if (!sidebar) return;
            sidebar.classList.remove('show');
            if (backdrop) {
                backdrop.classList.remove('show');
            }
        };

        const toggleSidebar = () => {
            if (!sidebar) return;

            if (isMobileViewport()) {
                const willShow = !sidebar.classList.contains('show');
                sidebar.classList.toggle('show', willShow);
                if (backdrop) {
                    backdrop.classList.toggle('show', willShow);
                }
            } else {
                sidebar.classList.toggle('collapsed');
            }
        };

        if (toggleBtn && sidebar) {
            toggleBtn.addEventListener('click', function() {
                toggleSidebar();
            });

            if (backdrop) {
                backdrop.addEventListener('click', closeSidebar);
            }

            // Close sidebar when clicking outside on mobile
            document.addEventListener('click', function(event) {
                if (isMobileViewport() && sidebar.classList.contains('show')) {
                    if (!sidebar.contains(event.target) && !toggleBtn.contains(event.target)) {
                        closeSidebar();
                    }
                }
            });

            // Close mobile sidebar when selecting a menu item
            sidebar.querySelectorAll('.nav-item').forEach((item) => {
                item.addEventListener('click', () => {
                    if (isMobileViewport()) {
                        closeSidebar();
                    }
                });
            });

            // Reset mobile state when resizing to desktop
            window.addEventListener('resize', () => {
                if (!isMobileViewport()) {
                    if (backdrop) {
                        backdrop.classList.remove('show');
                    }
                    sidebar.classList.remove('show');
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
        const isRouteActive = (route, currentPath) => {
            if (!route || !currentPath) return false;
            if (route === currentPath) return true;
            if (currentPath === '/' && route === '/grade-check') return true;
            if (route !== '/' && currentPath.startsWith(`${route}/`)) return true;
            return false;
        };
        
        // Update sidebar nav items
        document.querySelectorAll('.sidebar .nav-item').forEach(item => {
            const route = item.getAttribute('data-route');
            if (isRouteActive(route, path)) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });

        // Update mobile bottom nav items
        document.querySelectorAll('.mobile-nav-item').forEach(item => {
            const route = item.getAttribute('data-route');
            if (isRouteActive(route, path)) {
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
