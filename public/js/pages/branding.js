const pageEl = document.getElementById('brandingPage');

if (pageEl) {
    const serverData = window.__INITIAL_SERVER_DATA__ || {};
    const defaults = {
        logoDataUrl: serverData.brandingDefault?.logoDataUrl || 'https://caodang.fpt.edu.vn/wp-content/uploads/logo-3.png',
        subtext: serverData.brandingDefault?.subtext || 'FPT Polytechnic',
        primaryColor: serverData.brandingDefault?.primaryColor || '#FF6C00'
    };

    const MAX_LOGO_BYTES = 500 * 1024;
    const HEX_COLOR_REGEX = /^#[0-9a-fA-F]{6}$/;

    const elements = {
        logoInput: document.getElementById('brandingLogoInput'),
        logoPreview: document.getElementById('brandingLogoPreview'),
        subtextInput: document.getElementById('brandingSubtextInput'),
        subtextPreview: document.getElementById('brandingSubtextPreview'),
        colorPicker: document.getElementById('brandingPrimaryColorPicker'),
        colorInput: document.getElementById('brandingPrimaryColorInput'),
        saveBtn: document.getElementById('brandingSaveBtn'),
        resetBtn: document.getElementById('brandingResetBtn'),
        status: document.getElementById('brandingStatus'),
        preview: document.getElementById('brandingPreview')
    };

    const state = {
        logoDataUrl: defaults.logoDataUrl,
        subtext: defaults.subtext,
        primaryColor: defaults.primaryColor,
        isSubmitting: false
    };

    init();

    function init() {
        bindEvents();
        loadBranding();
        renderPreview();
    }

    function bindEvents() {
        elements.logoInput?.addEventListener('change', handleLogoInputChange);

        elements.subtextInput?.addEventListener('input', () => {
            state.subtext = String(elements.subtextInput.value || '').trimStart().slice(0, 80);
            renderPreview();
        });

        elements.colorPicker?.addEventListener('input', () => {
            const color = normalizeColor(elements.colorPicker.value, state.primaryColor);
            state.primaryColor = color;
            if (elements.colorInput) {
                elements.colorInput.value = color;
            }
            renderPreview();
        });

        elements.colorInput?.addEventListener('input', () => {
            const raw = String(elements.colorInput.value || '').toUpperCase();
            elements.colorInput.value = raw;
            if (HEX_COLOR_REGEX.test(raw)) {
                state.primaryColor = raw;
                if (elements.colorPicker) {
                    elements.colorPicker.value = raw;
                }
                renderPreview();
            }
        });

        elements.saveBtn?.addEventListener('click', saveBranding);
        elements.resetBtn?.addEventListener('click', resetBranding);
    }

    async function loadBranding() {
        try {
            setStatus('Đang tải cấu hình branding...', 'info');
            const response = await fetch('/api/branding', {
                credentials: 'include'
            });

            const result = await response.json().catch(() => ({}));
            if (!response.ok || !result.success) {
                throw new Error(result.error || result.message || 'Không thể tải branding');
            }

            applyBrandingToState(result.data || {});
            setStatus('Đã tải cấu hình branding.', 'success');
        } catch (error) {
            applyBrandingToState(defaults);
            setStatus(`Không tải được branding hiện tại: ${error.message}`, 'warning');
        }
    }

    function applyBrandingToState(data) {
        state.logoDataUrl = String(data.logoDataUrl || defaults.logoDataUrl).trim();
        state.subtext = String(data.subtext || defaults.subtext).trim();
        state.primaryColor = normalizeColor(data.primaryColor, defaults.primaryColor);

        if (elements.subtextInput) {
            elements.subtextInput.value = state.subtext;
        }
        if (elements.colorInput) {
            elements.colorInput.value = state.primaryColor;
        }
        if (elements.colorPicker) {
            elements.colorPicker.value = state.primaryColor;
        }

        renderPreview();
    }

    async function handleLogoInputChange(event) {
        const file = event.target.files?.[0];
        if (!file) return;

        const mimeType = String(file.type || '').toLowerCase();
        if (!['image/png', 'image/jpeg', 'image/webp'].includes(mimeType)) {
            setStatus('Logo chỉ nhận PNG/JPG/WEBP.', 'error');
            event.target.value = '';
            return;
        }

        if (file.size > MAX_LOGO_BYTES) {
            setStatus('Logo vượt quá 500KB.', 'error');
            event.target.value = '';
            return;
        }

        try {
            const dataUrl = await readFileAsDataURL(file);
            state.logoDataUrl = dataUrl;
            renderPreview();
            setStatus('Đã cập nhật logo preview.', 'success');
        } catch (error) {
            setStatus(`Không đọc được file logo: ${error.message}`, 'error');
        }
    }

    async function saveBranding() {
        if (state.isSubmitting) return;

        const payload = buildPayload();
        if (!payload) return;

        try {
            state.isSubmitting = true;
            updateButtonsState();
            setStatus('Đang lưu branding...', 'info');

            const response = await fetch('/api/branding', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify(payload)
            });

            const result = await response.json().catch(() => ({}));
            if (!response.ok || !result.success) {
                throw new Error(result.error || result.message || 'Không thể lưu branding');
            }

            applyBrandingToState(result.data || payload);
            setStatus('Lưu branding thành công.', 'success');
        } catch (error) {
            setStatus(`Lỗi lưu branding: ${error.message}`, 'error');
        } finally {
            state.isSubmitting = false;
            updateButtonsState();
        }
    }

    async function resetBranding() {
        if (state.isSubmitting) return;
        const confirmed = window.confirm('Bạn có chắc muốn reset branding về mặc định FPT?');
        if (!confirmed) return;

        try {
            state.isSubmitting = true;
            updateButtonsState();
            setStatus('Đang reset branding...', 'info');

            const response = await fetch('/api/branding/reset', {
                method: 'POST',
                credentials: 'include'
            });

            const result = await response.json().catch(() => ({}));
            if (!response.ok || !result.success) {
                throw new Error(result.error || result.message || 'Không thể reset branding');
            }

            applyBrandingToState(result.data || defaults);
            if (elements.logoInput) {
                elements.logoInput.value = '';
            }
            setStatus('Đã reset branding về mặc định.', 'success');
        } catch (error) {
            setStatus(`Lỗi reset branding: ${error.message}`, 'error');
        } finally {
            state.isSubmitting = false;
            updateButtonsState();
        }
    }

    function buildPayload() {
        const subtext = String(state.subtext || '').trim();
        if (!subtext || subtext.length > 80) {
            setStatus('Subtext phải từ 1 đến 80 ký tự.', 'error');
            return null;
        }

        const primaryColor = normalizeColor(state.primaryColor, '');
        if (!HEX_COLOR_REGEX.test(primaryColor)) {
            setStatus('Mã màu phải có định dạng #RRGGBB.', 'error');
            return null;
        }

        const logoDataUrl = String(state.logoDataUrl || '').trim();
        if (!logoDataUrl) {
            setStatus('Vui lòng chọn logo.', 'error');
            return null;
        }

        return {
            logoDataUrl,
            subtext,
            primaryColor
        };
    }

    function updateButtonsState() {
        if (elements.saveBtn) {
            elements.saveBtn.disabled = state.isSubmitting;
            elements.saveBtn.innerHTML = state.isSubmitting
                ? '<span class="spinner-border spinner-border-sm me-1"></span>Đang lưu...'
                : '<i class="bi bi-save me-1"></i> Lưu Branding';
        }
        if (elements.resetBtn) {
            elements.resetBtn.disabled = state.isSubmitting;
        }
    }

    function renderPreview() {
        if (elements.logoPreview) {
            elements.logoPreview.src = state.logoDataUrl || defaults.logoDataUrl;
        }
        if (elements.subtextPreview) {
            elements.subtextPreview.textContent = state.subtext || defaults.subtext;
        }
        if (elements.preview) {
            elements.preview.style.setProperty('--branding-preview-color', state.primaryColor || defaults.primaryColor);
        }
    }

    function setStatus(message, type = 'info') {
        if (!elements.status) return;

        elements.status.textContent = message;
        elements.status.className = `branding-status branding-status--${type}`;
    }

    function normalizeColor(value, fallback) {
        const color = String(value || '').trim().toUpperCase();
        if (HEX_COLOR_REGEX.test(color)) {
            return color;
        }
        return fallback;
    }

    function readFileAsDataURL(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(String(reader.result || ''));
            reader.onerror = () => reject(reader.error || new Error('Không thể đọc file'));
            reader.readAsDataURL(file);
        });
    }
}
