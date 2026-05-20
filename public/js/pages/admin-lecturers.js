/**
 * Admin Lecturers Page
 *
 * Super-admin-only UI for managing lecturer accounts:
 *   - List/filter accounts by status
 *   - Approve pending accounts (with optional expiry date)
 *   - Suspend / reject / delete accounts
 *   - Edit fields (status, expiry, notes, name)
 */

(function () {
    const pageEl = document.getElementById('adminLecturersPage');
    if (!pageEl) return;

    const tbody = document.getElementById('adminLecturersTbody');
    const filterBar = document.getElementById('adminLecturersFilter');
    const searchInput = document.getElementById('adminLecturersSearch');
    const refreshBtn = document.getElementById('adminLecturersRefresh');
    const modalEl = document.getElementById('adminLecturerModal');
    const form = document.getElementById('adminLecturerForm');
    const modal = modalEl ? new bootstrap.Modal(modalEl) : null;

    const state = {
        items: [],
        filter: '',
        search: ''
    };

    const STATUS_LABEL = {
        pending: { text: 'Chờ duyệt', cls: 'bg-warning text-dark' },
        active: { text: 'Hoạt động', cls: 'bg-success' },
        suspended: { text: 'Tạm khoá', cls: 'bg-secondary' },
        rejected: { text: 'Từ chối', cls: 'bg-danger' }
    };

    init();

    function init() {
        bindEvents();
        load();
    }

    function bindEvents() {
        refreshBtn?.addEventListener('click', load);

        filterBar?.addEventListener('click', (e) => {
            const btn = e.target.closest('button[data-filter]');
            if (!btn) return;
            filterBar.querySelectorAll('button').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            state.filter = btn.dataset.filter || '';
            render();
        });

        searchInput?.addEventListener('input', () => {
            state.search = String(searchInput.value || '').trim().toLowerCase();
            render();
        });

        tbody?.addEventListener('click', handleTableClick);
        form?.addEventListener('submit', handleFormSubmit);

        const quickExpiry = document.getElementById('adminLecturerQuickExpiry');
        quickExpiry?.addEventListener('click', handleQuickExpiry);
    }

    async function load() {
        renderLoading();
        try {
            const url = state.filter
                ? `/api/admin/lecturers?status=${encodeURIComponent(state.filter)}`
                : '/api/admin/lecturers';
            const res = await fetch(url, { credentials: 'include' });
            const json = await res.json();
            if (!res.ok || !json.success) {
                throw new Error(json.message || 'Không tải được danh sách');
            }
            state.items = json.data || [];
            renderStats(json.stats || {});
            render();
        } catch (err) {
            console.error(err);
            renderError(err.message || 'Lỗi tải danh sách');
        }
    }

    function renderStats(stats) {
        ['pending', 'active', 'suspended', 'rejected'].forEach(key => {
            const el = pageEl.querySelector(`[data-stat="${key}"]`);
            if (el) el.textContent = stats[key] ?? 0;
        });
    }

    function render() {
        if (!tbody) return;
        const search = state.search;
        const items = state.items.filter(item => {
            if (!search) return true;
            return (
                (item.email || '').toLowerCase().includes(search) ||
                (item.name || '').toLowerCase().includes(search)
            );
        });

        if (items.length === 0) {
            tbody.innerHTML = `
                <tr><td colspan="6" class="text-center text-muted py-4">
                    Không có giảng viên nào.
                </td></tr>
            `;
            return;
        }

        tbody.innerHTML = items.map(renderRow).join('');
    }

    function renderRow(item) {
        const status = STATUS_LABEL[item.status] || { text: item.status, cls: 'bg-light text-dark' };
        const expiresText = item.serviceExpiresAt
            ? formatDateTime(item.serviceExpiresAt)
            : '<span class="text-muted">Không giới hạn</span>';
        const expiresClass = item.isExpired ? 'text-danger fw-semibold' : '';
        const lastLogin = item.lastLogin ? formatDateTime(item.lastLogin) : '<span class="text-muted">Chưa đăng nhập</span>';
        const avatar = item.picture
            ? `<img src="${escapeAttr(item.picture)}" alt="" class="rounded-circle me-2" width="32" height="32">`
            : '<i class="bi bi-person-circle fs-4 text-muted me-2"></i>';

        const isExpired = item.isExpired ? '<span class="badge bg-danger ms-1">Hết hạn</span>' : '';

        return `
            <tr data-id="${escapeAttr(item.id)}">
                <td>
                    <div class="d-flex align-items-center">
                        ${avatar}
                        <div>
                            <div class="fw-semibold">${escapeHtml(item.name || '(Chưa có tên)')}</div>
                            ${item.notes ? `<div class="small text-muted">${escapeHtml(item.notes)}</div>` : ''}
                        </div>
                    </div>
                </td>
                <td><span class="text-break">${escapeHtml(item.email)}</span></td>
                <td>
                    <span class="badge ${status.cls}">${status.text}</span>
                    ${isExpired}
                </td>
                <td class="${expiresClass}">${expiresText}</td>
                <td>${lastLogin}</td>
                <td class="text-end">
                    ${renderActions(item)}
                </td>
            </tr>
        `;
    }

    function renderActions(item) {
        const buttons = [];
        if (item.status === 'pending') {
            buttons.push(`
                <button class="btn btn-sm btn-success" data-action="approve" title="Duyệt">
                    <i class="bi bi-check2"></i>
                </button>
                <button class="btn btn-sm btn-outline-danger" data-action="reject" title="Từ chối">
                    <i class="bi bi-x"></i>
                </button>
            `);
        }
        if (item.status === 'active') {
            buttons.push(`
                <button class="btn btn-sm btn-outline-warning" data-action="suspend" title="Tạm khoá">
                    <i class="bi bi-pause"></i>
                </button>
            `);
        }
        if (item.status === 'suspended' || item.status === 'rejected') {
            buttons.push(`
                <button class="btn btn-sm btn-outline-success" data-action="approve" title="Kích hoạt lại">
                    <i class="bi bi-arrow-counterclockwise"></i>
                </button>
            `);
        }
        buttons.push(`
            <button class="btn btn-sm btn-outline-primary" data-action="edit" title="Chỉnh sửa">
                <i class="bi bi-pencil"></i>
            </button>
            <button class="btn btn-sm btn-outline-danger" data-action="delete" title="Xoá">
                <i class="bi bi-trash"></i>
            </button>
        `);
        return `<div class="btn-group btn-group-sm" role="group">${buttons.join('')}</div>`;
    }

    function renderLoading() {
        if (tbody) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted py-4">Đang tải...</td></tr>';
        }
    }

    function renderError(message) {
        if (tbody) {
            tbody.innerHTML = `<tr><td colspan="6" class="text-center text-danger py-4">${escapeHtml(message)}</td></tr>`;
        }
    }

    async function handleTableClick(e) {
        const btn = e.target.closest('button[data-action]');
        if (!btn) return;
        const tr = btn.closest('tr');
        const id = tr?.dataset.id;
        if (!id) return;
        const item = state.items.find(i => i.id === id);
        if (!item) return;

        const action = btn.dataset.action;
        try {
            if (action === 'approve') {
                openModal(item, { focusExpiry: true });
            } else if (action === 'edit') {
                openModal(item);
            } else if (action === 'reject') {
                if (!confirm(`Từ chối tài khoản "${item.email}"?`)) return;
                await callApi(`/api/admin/lecturers/${id}/reject`, 'POST');
                await load();
            } else if (action === 'suspend') {
                if (!confirm(`Tạm khoá tài khoản "${item.email}"?`)) return;
                await callApi(`/api/admin/lecturers/${id}/suspend`, 'POST');
                await load();
            } else if (action === 'delete') {
                if (!confirm(`Xoá vĩnh viễn tài khoản "${item.email}"? Hành động này không thể hoàn tác.`)) return;
                await callApi(`/api/admin/lecturers/${id}`, 'DELETE');
                await load();
            }
        } catch (err) {
            alert(err.message || 'Có lỗi xảy ra');
        }
    }

    function openModal(item, { focusExpiry = false } = {}) {
        if (!modal || !form) return;
        form.reset();
        form.querySelector('[name="id"]').value = item.id;
        form.querySelector('[data-field="email"]').textContent = item.email;
        form.querySelector('[name="name"]').value = item.name || '';
        form.querySelector('[name="status"]').value = focusExpiry ? 'active' : (item.status || 'active');
        form.querySelector('[name="notes"]').value = item.notes || '';
        const expiryInput = form.querySelector('[name="serviceExpiresAt"]');
        if (item.serviceExpiresAt) {
            const d = new Date(item.serviceExpiresAt);
            if (!Number.isNaN(d.getTime())) {
                expiryInput.value = d.toISOString().slice(0, 10);
            }
        } else {
            expiryInput.value = '';
        }
        modal.show();
        if (focusExpiry) {
            setTimeout(() => expiryInput.focus(), 200);
        }
    }

    function handleQuickExpiry(e) {
        const btn = e.target.closest('button[data-quick-expiry]');
        if (!btn) return;
        e.preventDefault();
        const expiryInput = form?.querySelector('[name="serviceExpiresAt"]');
        if (!expiryInput) return;

        const action = btn.dataset.quickExpiry;
        if (action === 'clear') {
            expiryInput.value = '';
            return;
        }

        const date = new Date();
        if (action === '1m') date.setMonth(date.getMonth() + 1);
        else if (action === '3m') date.setMonth(date.getMonth() + 3);
        else if (action === '6m') date.setMonth(date.getMonth() + 6);
        else if (action === '1y') date.setFullYear(date.getFullYear() + 1);
        else return;

        // Format YYYY-MM-DD in local time (avoids UTC off-by-one).
        const yyyy = date.getFullYear();
        const mm = String(date.getMonth() + 1).padStart(2, '0');
        const dd = String(date.getDate()).padStart(2, '0');
        expiryInput.value = `${yyyy}-${mm}-${dd}`;
    }

    async function handleFormSubmit(e) {
        e.preventDefault();
        const fd = new FormData(form);
        const id = fd.get('id');
        const expiryRaw = String(fd.get('serviceExpiresAt') || '').trim();
        const payload = {
            name: String(fd.get('name') || '').trim(),
            status: String(fd.get('status') || 'active'),
            notes: String(fd.get('notes') || ''),
            serviceExpiresAt: expiryRaw ? new Date(expiryRaw + 'T23:59:59').toISOString() : null
        };

        try {
            await callApi(`/api/admin/lecturers/${id}`, 'PUT', payload);
            modal.hide();
            await load();
        } catch (err) {
            alert(err.message || 'Lỗi cập nhật');
        }
    }

    async function callApi(url, method, body) {
        const res = await fetch(url, {
            method,
            credentials: 'include',
            headers: body ? { 'Content-Type': 'application/json' } : undefined,
            body: body ? JSON.stringify(body) : undefined
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok || !json.success) {
            throw new Error(json.message || `Request failed (${res.status})`);
        }
        return json;
    }

    function formatDateTime(value) {
        if (!value) return '';
        const d = new Date(value);
        if (Number.isNaN(d.getTime())) return '';
        return d.toLocaleString('vi-VN');
    }

    function escapeHtml(value) {
        return String(value == null ? '' : value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function escapeAttr(value) {
        return escapeHtml(value);
    }
})();
