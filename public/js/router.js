// ========================================
// SIMPLE CLIENT-SIDE ROUTER WITH PARTIALS
// ========================================

class Router {
    constructor() {
        this.routes = {};
        this.currentRoute = null;
        this.params = {};
        this.contentContainer = null;
        this.handlePopState = this.handlePopState.bind(this);
        this.handleLinkClick = this.handleLinkClick.bind(this);
    }

    normalizePath(path = '/') {
        if (!path) return '/';
        let normalized = path.trim();

        if (normalized.startsWith('#')) {
            normalized = normalized.slice(1);
        }

        if (!normalized.startsWith('/')) {
            normalized = '/' + normalized;
        }

        // Remove trailing slash except root
        if (normalized.length > 1 && normalized.endsWith('/')) {
            normalized = normalized.slice(0, -1);
        }

        return normalized;
    }

    // Set content container
    setContentContainer(selector) {
        this.contentContainer = document.querySelector(selector);
    }

    // Load HTML partial
    async loadPartial(partialPath) {
        try {
            const response = await fetch(partialPath);
            if (!response.ok) {
                throw new Error(`Failed to load partial: ${partialPath}`);
            }
            return await response.text();
        } catch (error) {
            console.error('Error loading partial:', error);
            return `<div class="alert alert-danger">Error loading content</div>`;
        }
    }

    // Register a route
    register(path, config) {
        this.routes[path] = config;
    }

    // Navigate to a route
    async navigate(path, params = {}, options = {}) {
        const { replace = false, silent = false } = options;
        const normalizedPath = this.normalizePath(path);
        this.params = params;

        const route = this.routes[normalizedPath];

        if (route) {
            // Call the previous route's cleanup if exists
            if (this.currentRoute && this.routes[this.currentRoute].cleanup) {
                this.routes[this.currentRoute].cleanup();
            }

            this.currentRoute = normalizedPath;

            if (!silent) {
                const state = { path: normalizedPath, params };
                if (replace) {
                    window.history.replaceState(state, '', normalizedPath);
                } else {
                    window.history.pushState(state, '', normalizedPath);
                }
            }

            // Update navigation active states
            this.updateNavigation(normalizedPath);

            // If route has a partial path, load it
            if (route.partial && this.contentContainer) {
                const html = await this.loadPartial(route.partial);
                this.contentContainer.innerHTML = html;
            }

            // Call route handler
            if (route.handler) {
                route.handler(params);
            }
        } else {
            console.error(`❌ Route not found: ${path}`);
        }
    }

    // Update navigation active states
    updateNavigation(path) {
        const isRouteActive = (route, currentPath) => {
            if (!route || !currentPath) return false;
            if (route === currentPath) return true;
            if (currentPath === '/' && route === '/grade-check') return true;
            if (route !== '/' && currentPath.startsWith(`${route}/`)) return true;
            return false;
        };

        // Update sidebar nav items
        document.querySelectorAll('.nav-item').forEach(item => {
            const route = item.getAttribute('data-route');
            if (isRouteActive(route, path)) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });

        // Update mobile nav items
        document.querySelectorAll('.mobile-nav-item').forEach(item => {
            const route = item.getAttribute('data-route');
            if (isRouteActive(route, path)) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });

        // Close sidebar on mobile
        const sidebar = document.getElementById('sidebar');
        const sidebarBackdrop = document.getElementById('sidebarBackdrop');
        const isMobile = window.innerWidth < 768;
        if (isMobile && sidebar) {
            sidebar.classList.remove('show');
            if (sidebarBackdrop) {
                sidebarBackdrop.classList.remove('show');
            }
        }
    }

    // Get current route
    getCurrentRoute() {
        return this.currentRoute;
    }

    // Get route params
    getParams() {
        return this.params;
    }

    // Initialize router
    init() {
        console.log('🔧 Router initialized');
        console.log('📋 Registered routes:', Object.keys(this.routes));

        // Set default content container
        if (!this.contentContainer) {
            this.setContentContainer('#page-content');
        }

        document.addEventListener('click', this.handleLinkClick);
        window.addEventListener('popstate', this.handlePopState);

        const initialPath = this.normalizePath(window.location.pathname || '/');
        if (this.routes[initialPath]) {
            this.navigate(initialPath, {}, { replace: true, silent: true });
        } else if (this.routes['/']) {
            this.navigate('/', {}, { replace: true, silent: true });
        }
    }

    async handlePopState(event) {
        const path = this.normalizePath(event.state?.path || window.location.pathname || '/');
        const params = event.state?.params || {};
        if (this.routes[path]) {
            await this.navigate(path, params, { replace: true, silent: true });
        } else {
            console.warn(`⚠️ No route registered for path: ${path}`);
        }
    }

    handleLinkClick(event) {
        const link = event.target.closest('a[data-route]');
        if (!link) return;

        const route = link.getAttribute('data-route');
        if (!route) return;

        const normalizedRoute = this.normalizePath(route);
        if (!this.routes[normalizedRoute]) return;

        const isModifiedClick = event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0;
        if (isModifiedClick) return;

        event.preventDefault();
        this.navigate(normalizedRoute);
    }
}

// Create global router instance
const router = new Router();
