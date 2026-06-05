// Report Tool Logic for Teacher Dashboard
// This script handles the "Quản lý Báo Cáo Bài Học" modal on the class-detail page.

(function () {
    'use strict';

    let classId = '';
    let reportFields = [];

    document.addEventListener('DOMContentLoaded', initReportTool);

    function initReportTool() {
        // Get classId from the page element or server data
        const pageEl = document.getElementById('classDetailPage');
        const serverData = window.__INITIAL_SERVER_DATA__ || {};
        const classDetail = serverData.classDetail || {};

        classId = classDetail.classId
            || (pageEl && pageEl.getAttribute('data-class-id'))
            || '';

        console.log('[report-tool] init, classId =', classId);

        if (!classId) {
            console.warn('[report-tool] No classId found, aborting init.');
            return;
        }

        // Listen for the modal open event
        const reportToolModalEl = document.getElementById('reportToolModal');
        if (reportToolModalEl) {
            reportToolModalEl.addEventListener('shown.bs.modal', onReportModalOpen);
            console.log('[report-tool] Modal listener attached (shown.bs.modal).');
        } else {
            console.warn('[report-tool] #reportToolModal not found in DOM.');
        }

        // Bind static button events
        const btnLoad = document.getElementById('btnLoadReports');
        const btnAdd = document.getElementById('btnAddReportField');
        const btnSave = document.getElementById('btnSaveReportTemplate');

        if (btnLoad) btnLoad.addEventListener('click', loadReports);
        if (btnAdd) btnAdd.addEventListener('click', addReportField);
        if (btnSave) btnSave.addEventListener('click', saveReportTemplate);

        // Set default filter date to today
        const dateInput = document.getElementById('reportFilterDate');
        if (dateInput) {
            dateInput.valueAsDate = new Date();
        }
    }

    async function onReportModalOpen() {
        console.log('[report-tool] Modal opened, loading data...');
        try {
            await loadReportTemplate();
            await loadReports();
        } catch (err) {
            console.error('[report-tool] Error in onReportModalOpen:', err);
        }
    }

    // ─────────────────────────────────────
    //  VIEW REPORTS
    // ─────────────────────────────────────

    async function loadReports() {
        const date = document.getElementById('reportFilterDate')?.value || '';
        const tbody = document.getElementById('reportListBody');
        if (!tbody) return;

        tbody.innerHTML = `
            <tr>
                <td colspan="4" class="text-center py-4">
                    <div class="spinner-border spinner-border-sm text-primary" role="status"></div>
                    <div class="text-muted mt-1">Đang tải dữ liệu...</div>
                </td>
            </tr>`;

        try {
            const url = `/api/reports?classId=${encodeURIComponent(classId)}&date=${encodeURIComponent(date)}`;
            console.log('[report-tool] GET', url);

            const response = await fetch(url, { credentials: 'include' });
            const result = await response.json();

            console.log('[report-tool] reports response:', result);

            if (result.success) {
                renderReports(result.data);
            } else {
                tbody.innerHTML = `<tr><td colspan="4" class="text-center text-danger py-4">Lỗi: ${result.message}</td></tr>`;
            }
        } catch (error) {
            console.error('[report-tool] Error loading reports:', error);
            tbody.innerHTML = '<tr><td colspan="4" class="text-center text-danger py-4">Lỗi kết nối.</td></tr>';
        }
    }

    function renderReports(reports) {
        const tbody = document.getElementById('reportListBody');
        if (!reports || reports.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="4" class="text-center py-5 text-muted">
                        <i class="bi bi-inbox fs-1 d-block mb-2 opacity-50"></i>
                        Không có báo cáo nào.
                    </td>
                </tr>`;
            return;
        }

        let html = '';
        reports.forEach(report => {
            let answersHtml = '<ul class="report-answer-list">';
            if (report.answers && typeof report.answers === 'object') {
                for (const [qId, ans] of Object.entries(report.answers)) {
                    const field = reportFields.find(f => f._id === qId);
                    const questionText = field ? field.questionText : `Câu hỏi`;
                    answersHtml += `
                        <li>
                            <strong>${escapeHtml(questionText)}</strong>
                            <span>${escapeHtml(ans || '(trống)')}</span>
                        </li>`;
                }
            }
            answersHtml += '</ul>';

            html += `
                <tr class="report-row">
                    <td data-label="Ngày" class="report-date-cell">${escapeHtml(report.date || '')}</td>
                    <td data-label="MSSV" class="report-code-cell">${escapeHtml(report.mssv || '')}</td>
                    <td data-label="Tên sinh viên" class="report-name-cell">${escapeHtml(report.studentName || '')}</td>
                    <td data-label="Nội dung báo cáo" class="report-answer-cell">${answersHtml}</td>
                </tr>`;
        });

        tbody.innerHTML = html;
    }

    // ─────────────────────────────────────
    //  CONFIG TEMPLATE
    // ─────────────────────────────────────

    async function loadReportTemplate() {
        const container = document.getElementById('reportFieldsContainer');
        if (!container) return;

        container.innerHTML = `
            <div class="text-center py-4 text-muted">
                <div class="spinner-border spinner-border-sm text-primary mb-2" role="status"></div>
                <div>Đang tải cấu hình...</div>
            </div>`;

        try {
            const url = `/api/report-template?classId=${encodeURIComponent(classId)}`;
            console.log('[report-tool] GET', url);

            const response = await fetch(url, { credentials: 'include' });
            const result = await response.json();

            console.log('[report-tool] template response:', result);

            if (result.success && result.data && result.data.fields) {
                reportFields = result.data.fields;
            } else {
                // Default fields when no template configured yet
                reportFields = [
                    { _id: 'default_1', questionText: 'Nội dung bài học hôm nay là gì?', isRequired: true, order: 1 },
                    { _id: 'default_2', questionText: 'Bạn gặp khó khăn gì không?', isRequired: false, order: 2 }
                ];
            }
            renderReportFields();
        } catch (error) {
            console.error('[report-tool] Error loading template:', error);
            container.innerHTML = '<div class="alert alert-danger m-3">Lỗi kết nối khi tải biểu mẫu.</div>';
        }
    }

    function renderReportFields() {
        const container = document.getElementById('reportFieldsContainer');
        if (!container) return;

        container.innerHTML = '';

        if (reportFields.length === 0) {
            container.innerHTML = `
                <div class="text-center py-5 text-muted">
                    <i class="bi bi-clipboard-plus fs-1 d-block mb-2 opacity-50"></i>
                    Chưa có câu hỏi nào. Bấm "Thêm câu hỏi" để bắt đầu.
                </div>`;
            return;
        }

        reportFields.sort((a, b) => (a.order || 0) - (b.order || 0)).forEach((field, index) => {
            const div = document.createElement('div');
            div.className = 'report-field-card';
            div.innerHTML = `
                <div class="report-field-index">Câu hỏi ${index + 1}</div>
                <div class="report-field-main">
                    <label class="form-label">Nội dung câu hỏi</label>
                    <input type="text" class="form-control report-question-input"
                           data-index="${index}" value="${escapeHtml(field.questionText)}" placeholder="Nhập nội dung câu hỏi...">
                    <div class="form-check form-switch report-required-control">
                        <input class="form-check-input report-required-toggle" type="checkbox" role="switch"
                               id="reqSwitch_${index}" data-index="${index}" ${field.isRequired ? 'checked' : ''}>
                        <label class="form-check-label" for="reqSwitch_${index}">Bắt buộc trả lời</label>
                    </div>
                </div>
                <div class="report-field-actions">
                    <button class="btn btn-light text-danger btn-remove-field"
                            data-index="${index}" title="Xóa câu hỏi" aria-label="Xóa câu hỏi ${index + 1}">
                        <i class="bi bi-trash-fill"></i>
                    </button>
                </div>`;

            container.appendChild(div);
        });

        // Bind dynamic events on question inputs
        container.querySelectorAll('.report-question-input').forEach(el => {
            el.addEventListener('input', (e) => {
                const idx = parseInt(e.target.getAttribute('data-index'), 10);
                if (reportFields[idx]) reportFields[idx].questionText = e.target.value;
            });
        });

        // Bind dynamic events on required toggles
        container.querySelectorAll('.report-required-toggle').forEach(el => {
            el.addEventListener('change', (e) => {
                const idx = parseInt(e.target.getAttribute('data-index'), 10);
                if (reportFields[idx]) reportFields[idx].isRequired = e.target.checked;
            });
        });

        // Bind delete buttons
        container.querySelectorAll('.btn-remove-field').forEach(el => {
            el.addEventListener('click', (e) => {
                const idx = parseInt(e.currentTarget.getAttribute('data-index'), 10);
                reportFields.splice(idx, 1);
                reportFields.forEach((f, i) => { f.order = i + 1; });
                renderReportFields();
            });
        });
    }

    function addReportField() {
        reportFields.push({
            _id: 'q_' + Math.random().toString(36).substr(2, 9),
            questionText: '',
            isRequired: false,
            order: reportFields.length + 1
        });
        renderReportFields();

        // Focus the newly added input
        setTimeout(() => {
            const inputs = document.querySelectorAll('.report-question-input');
            if (inputs.length > 0) {
                inputs[inputs.length - 1].focus();
            }
        }, 100);
    }

    async function saveReportTemplate() {
        const btn = document.getElementById('btnSaveReportTemplate');
        if (!btn) return;

        const originalText = btn.innerHTML;
        btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Đang lưu...';
        btn.disabled = true;

        try {
            const response = await fetch('/api/report-template', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    classId,
                    fields: reportFields
                })
            });

            const result = await response.json();
            console.log('[report-tool] save template response:', result);

            if (result.success) {
                showToast('Lưu cấu hình thành công!', 'success');
            } else {
                showToast('Lỗi: ' + result.message, 'danger');
            }
        } catch (error) {
            console.error('[report-tool] Error saving template:', error);
            showToast('Lỗi kết nối khi lưu cấu hình.', 'danger');
        } finally {
            btn.innerHTML = originalText;
            btn.disabled = false;
        }
    }

    // ─────────────────────────────────────
    //  HELPERS
    // ─────────────────────────────────────

    function escapeHtml(str) {
        if (!str) return '';
        return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    function showToast(message, type) {
        // Try to use the app's existing toast, fall back to alert
        if (typeof window.showAppToast === 'function') {
            window.showAppToast(message, type);
        } else {
            alert(message);
        }
    }

})();
