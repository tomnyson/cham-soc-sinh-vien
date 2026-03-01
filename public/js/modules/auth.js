/**
 * Authentication Module
 * Handles Google OAuth authentication and user session management
 */

const AuthModule = {
    currentUser: null,
    isAuthenticated: false,
    defaultBranding: {
        logoDataUrl: 'https://caodang.fpt.edu.vn/wp-content/uploads/logo-3.png',
        subtext: 'FPT Polytechnic'
    },

    /**
     * Initialize authentication
     */
    async init() {
        await this.checkAuthStatus();
        this.setupEventListeners();
    },

    /**
     * Check if user is authenticated
     */
    async checkAuthStatus() {
        try {
            const response = await fetch('/api/auth/check', {
                credentials: 'include'
            });
            const data = await response.json();

            if (data.success && data.authenticated) {
                this.isAuthenticated = true;
                this.currentUser = data.user;
                this.updateUI();
                return true;
            } else {
                this.isAuthenticated = false;
                this.currentUser = null;
                this.showLoginPage();
                return false;
            }
        } catch (error) {
            console.error('Error checking auth status:', error);
            this.showLoginPage();
            return false;
        }
    },

    /**
     * Get current user
     */
    async getCurrentUser() {
        if (!this.isAuthenticated) {
            return null;
        }

        try {
            const response = await fetch('/api/auth/me', {
                credentials: 'include'
            });
            const data = await response.json();

            if (data.success) {
                this.currentUser = data.user;
                return data.user;
            }
            return null;
        } catch (error) {
            console.error('Error getting current user:', error);
            return null;
        }
    },

    /**
     * Login with Google
     */
    loginWithGoogle() {
        window.location.href = '/api/auth/google';
    },

    /**
     * Logout
     */
    async logout() {
        try {
            const response = await fetch('/api/auth/logout', {
                method: 'POST',
                credentials: 'include'
            });

            if (response.ok) {
                this.isAuthenticated = false;
                this.currentUser = null;
                this.showLoginPage();
            }
        } catch (error) {
            console.error('Error logging out:', error);
        }
    },

    /**
     * Update UI with user information
     */
    updateUI() {
        if (!this.currentUser) return;

        // Update user name in header
        const userNameElements = document.querySelectorAll('.user-name');
        userNameElements.forEach(el => {
            el.textContent = this.currentUser.name;
        });

        // Update user email
        const userEmailElements = document.querySelectorAll('.user-email');
        userEmailElements.forEach(el => {
            el.textContent = this.currentUser.email;
        });

        // Update user picture
        const userPictureElements = document.querySelectorAll('.user-picture');
        const defaultIcons = document.querySelectorAll('.user-icon-default');

        if (this.currentUser.picture) {
            // Show picture, hide default icon
            userPictureElements.forEach(el => {
                el.src = this.currentUser.picture;
                el.style.display = 'inline-block';
            });
            defaultIcons.forEach(icon => {
                icon.style.display = 'none';
            });
        } else {
            // Hide picture, show default icon
            userPictureElements.forEach(el => {
                el.style.display = 'none';
            });
            defaultIcons.forEach(icon => {
                icon.style.display = 'inline-block';
            });
        }

        // Show main content
        const mainContent = document.querySelector('.main-content');
        const sidebar = document.querySelector('.sidebar');
        const mobileNav = document.querySelector('.mobile-bottom-nav');
        if (mainContent) mainContent.style.display = 'block';
        if (sidebar) sidebar.style.display = 'block';
        if (mobileNav) mobileNav.style.display = 'flex';

        // Hide login page
        const loginPage = document.getElementById('login-page');
        if (loginPage) loginPage.style.display = 'none';
    },

    /**
     * Show login page
     */
    showLoginPage() {
        const mainContent = document.querySelector('.main-content');
        const sidebar = document.querySelector('.sidebar');
        const mobileNav = document.querySelector('.mobile-bottom-nav');
        if (mainContent) mainContent.style.display = 'none';
        if (sidebar) sidebar.style.display = 'none';
        if (mobileNav) mobileNav.style.display = 'none';

        let loginPage = document.getElementById('login-page');
        if (!loginPage) {
            loginPage = this.createLoginPage();
            document.body.appendChild(loginPage);
        }
        loginPage.style.display = 'flex';
    },

    getBranding() {
        const source = window.__APP_BRANDING__ || {};
        const logoDataUrl = String(source.logoDataUrl || this.defaultBranding.logoDataUrl).trim() || this.defaultBranding.logoDataUrl;
        const subtext = String(source.subtext || this.defaultBranding.subtext).trim() || this.defaultBranding.subtext;
        return { logoDataUrl, subtext };
    },

    /**
     * Create login page HTML
     */
    createLoginPage() {
        const branding = this.getBranding();
        const loginPage = document.createElement('div');
        loginPage.id = 'login-page';
        loginPage.className = 'login-page';
        loginPage.innerHTML = `
            <div class="login-container">
                <div class="login-card">
                    <div class="login-header">
                        <img src="${branding.logoDataUrl}" alt="${branding.subtext}" class="login-logo">
                        <h1>Hệ thống quản lý điểm</h1>
                        <p class="text-muted">${branding.subtext}</p>
                    </div>
                    <div class="login-body">
                        <p class="login-message">Vui lòng đăng nhập để tiếp tục</p>
                        <button id="google-login-btn" class="btn-google-login">
                            <svg width="18" height="18" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
                                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                                <path fill="none" d="M0 0h48v48H0z"/>
                            </svg>
                            Đăng nhập với Google
                        </button>
                        <div class="login-footer">
                            <small class="text-muted">Sử dụng tài khoản Google của bạn để đăng nhập</small>
                        </div>
                    </div>
                </div>
            </div>
        `;
        return loginPage;
    },

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Listen for login button click
        document.addEventListener('click', (e) => {
            if (e.target.id === 'google-login-btn' || e.target.closest('#google-login-btn')) {
                this.loginWithGoogle();
            }

            // Logout button
            if (e.target.classList.contains('btn-logout') || e.target.closest('.btn-logout')) {
                e.preventDefault();
                this.logout();
            }
        });

        // Listen for authentication errors from API
        window.addEventListener('auth-required', () => {
            console.log('Authentication required - showing login page');
            this.isAuthenticated = false;
            this.currentUser = null;
            this.showLoginPage();
        });

        // Check for login success/error in URL
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('login') === 'success') {
            this.checkAuthStatus();
            // Clean URL
            window.history.replaceState({}, document.title, window.location.pathname);
        } else if (urlParams.get('login') === 'error' || urlParams.get('login') === 'failed') {
            alert('Đăng nhập thất bại. Vui lòng thử lại.');
            // Clean URL
            window.history.replaceState({}, document.title, window.location.pathname);
        }
    },

    /**
     * Make authenticated API request
     */
    async fetchWithAuth(url, options = {}) {
        const defaultOptions = {
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            }
        };

        const response = await fetch(url, { ...defaultOptions, ...options });

        // If unauthorized, redirect to login
        if (response.status === 401) {
            this.isAuthenticated = false;
            this.currentUser = null;
            this.showLoginPage();
            throw new Error('Unauthorized');
        }

        return response;
    }
};

// Export for use in other modules
window.AuthModule = AuthModule;
