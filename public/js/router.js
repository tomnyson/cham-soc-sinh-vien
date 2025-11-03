// ========================================
// SIMPLE CLIENT-SIDE ROUTER
// ========================================

class Router {
    constructor() {
        this.routes = {};
        this.currentRoute = null;
        this.params = {};
    }

    // Register a route
    register(path, handler) {
        this.routes[path] = handler;
    }

    // Navigate to a route
    navigate(path, params = {}) {
        this.params = params;
        
        // Find matching route
        const route = this.routes[path];
        
        if (route) {
            // Call the previous route's cleanup if exists
            if (this.currentRoute && this.routes[this.currentRoute].cleanup) {
                this.routes[this.currentRoute].cleanup();
            }
            
            this.currentRoute = path;
            
            // Update URL hash without reload
            window.location.hash = path;
            
            // Update navigation active states
            this.updateNavigation(path);
            
            // Call route handler
            route.handler(params);
        } else {
            console.error(`Route not found: ${path}`);
        }
    }

    // Update navigation active states
    updateNavigation(path) {
        // Update sidebar nav items
        document.querySelectorAll('.nav-item').forEach(item => {
            const route = item.getAttribute('data-route');
            if (route === path) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });

        // Update mobile nav items
        document.querySelectorAll('.mobile-nav-item').forEach(item => {
            const route = item.getAttribute('data-route');
            if (route === path) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });

        // Close sidebar on mobile
        const sidebar = document.getElementById('sidebar');
        const isMobile = window.innerWidth < 768;
        if (isMobile && sidebar) {
            sidebar.classList.remove('show');
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
        // Handle browser back/forward
        window.addEventListener('hashchange', () => {
            const hash = window.location.hash.slice(1) || '/';
            if (this.routes[hash]) {
                this.navigate(hash);
            }
        });

        // Load initial route
        const initialHash = window.location.hash.slice(1) || '/';
        this.navigate(initialHash);
    }
}

// Create global router instance
const router = new Router();
