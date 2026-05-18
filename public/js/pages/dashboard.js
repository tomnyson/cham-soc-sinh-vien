/**
 * Grade Entry Dashboard - client logic
 *
 * Responsibilities:
 *   1. Class switcher: re-fetch dashboard data and re-render the table.
 *   2. Inline grade editing: PUT each change to the API with debounce.
 *   3. Status filtering: hide/show rows based on the selected status.
 */
(function () {
    'use strict';

    var page = document.getElementById('dashboardPage');
    if (!page) return;

    var classSelect = document.getElementById('dashboardClassSelect');
    var tableContainer = document.getElementById('dashboardTableContainer');
    var classNameEl = document.getElementById('dashboardClassName');
    var statTotalEl = document.getElementById('dashboardStatTotal');
    var statPassedEl = document.getElementById('dashboardStatPassed');
    var statAtRiskEl = document.getElementById('dashboardStatAtRisk');
    var statFailedEl = document.getElementById('dashboardStatFailed');
    var saveIndicator = document.getElementById('dashboardSaveIndicator');
    var saveMessage = document.getElementById('dashboardSaveMessage');

    var saveTimers = {};

    function getAuthHeaders() {
        var headers = { 'Content-Type': 'application/json' };
        // Cookie-based auth is handled by the browser; nothing else needed.
        return headers;
    }

    function showSaveIndicator(text, type) {
        if (!saveIndicator || !saveMessage) return;
        saveIndicator.classList.remove('alert-success', 'alert-danger');
        saveIndicator.classList.add(type === 'error' ? 'alert-danger' : 'alert-success');
        saveMessage.textContent = text;
        saveIndicator.classList.remove('d-none');
        clearTimeout(showSaveIndicator._t);
        showSaveIndicator._t = setTimeout(function () {
            saveIndicator.classList.add('d-none');
        }, 2000);
    }

    function applyFilter(value) {
        var rows = tableContainer.querySelectorAll('.dashboard-student-row');
        rows.forEach(function (row) {
            var status = row.getAttribute('data-status');
            row.style.display = (value === 'all' || status === value) ? '' : 'none';
        });
    }

    function bindFilterButtons() {
        var radios = document.querySelectorAll('input[name="dashboardFilter"]');
        radios.forEach(function (radio) {
            radio.addEventListener('change', function () {
                if (radio.checked) applyFilter(radio.value);
            });
        });
    }

    function updateStats(summary) {
        if (!summary) return;
        if (statTotalEl) statTotalEl.textContent = summary.total || 0;
        if (statPassedEl) statPassedEl.textContent = summary.passed || 0;
        if (statAtRiskEl) statAtRiskEl.textContent = summary.atRisk || 0;
        if (statFailedEl) statFailedEl.textContent = summary.failed || 0;
    }

    function rebuildRowFromData(student, columns) {
        var row = tableContainer.querySelector('.dashboard-student-row[data-mssv="' + cssEscape(student.mssv) + '"]');
        if (!row) return;
        row.setAttribute('data-status', student.status);
        var totalCell = row.querySelector('.dashboard-final-total');
        if (totalCell) {
            var v = (typeof student.finalTotal === 'number' ? student.finalTotal : student.totalScore) || 0;
            totalCell.textContent = Number(v).toFixed(2);
        }
        var badge = row.querySelector('.dashboard-status-badge');
        if (badge) {
            badge.classList.remove('badge-pass', 'badge-fail', 'bg-warning', 'text-dark');
            if (student.status === 'passed') {
                badge.classList.add('badge-pass');
                badge.textContent = '✓ Đạt';
            } else if (student.status === 'at-risk') {
                badge.classList.add('bg-warning', 'text-dark');
                badge.textContent = '⚠ Nguy cơ';
            } else {
                badge.classList.add('badge-fail');
                badge.textContent = '✗ Chưa đạt';
            }
        }
    }

    function cssEscape(value) {
        if (window.CSS && CSS.escape) return CSS.escape(value);
        return String(value).replace(/[^a-zA-Z0-9_-]/g, '\\$&');
    }

    function persistGrade(classId, mssv, assessment, score) {
        var key = mssv + '::' + assessment;
        clearTimeout(saveTimers[key]);
        saveTimers[key] = setTimeout(function () {
            fetch('/api/classes/' + encodeURIComponent(classId) + '/student/' + encodeURIComponent(mssv) + '/grade', {
                method: 'PUT',
                credentials: 'same-origin',
                headers: getAuthHeaders(),
                body: JSON.stringify({ assessment: assessment, score: score })
            })
                .then(function (res) {
                    return res.json().then(function (body) { return { ok: res.ok, body: body }; });
                })
                .then(function (result) {
                    if (!result.ok || !result.body || !result.body.success) {
                        var err = (result.body && (result.body.error || result.body.message)) || 'Lưu thất bại';
                        showSaveIndicator(err, 'error');
                        return;
                    }
                    rebuildRowFromData(result.body.data || {});
                    refreshSummaryFromTable();
                    showSaveIndicator('Đã lưu điểm cho ' + mssv, 'success');
                })
                .catch(function (err) {
                    console.error('Failed to update grade:', err);
                    showSaveIndicator('Lỗi kết nối khi lưu điểm', 'error');
                });
        }, 350);
    }

    function refreshSummaryFromTable() {
        var rows = tableContainer.querySelectorAll('.dashboard-student-row');
        var total = 0, passed = 0, atRisk = 0, failed = 0;
        rows.forEach(function (row) {
            total += 1;
            var status = row.getAttribute('data-status');
            if (status === 'passed') passed += 1;
            else if (status === 'at-risk') atRisk += 1;
            else failed += 1;
        });
        updateStats({ total: total, passed: passed, atRisk: atRisk, failed: failed });
    }

    function bindGradeInputs() {
        var inputs = tableContainer.querySelectorAll('.grade-input');
        inputs.forEach(function (input) {
            input.addEventListener('input', handleInputLive);
            input.addEventListener('change', handleInputCommit);
            input.addEventListener('blur', handleInputCommit);
        });
    }

    /**
     * Validate the raw input value against the [0, 10] range.
     * Returns { state: 'empty' | 'valid' | 'invalid', value: number | null }.
     */
    function validateGradeValue(raw) {
        if (raw === '' || raw == null) {
            return { state: 'empty', value: null };
        }
        var num = Number(raw);
        if (!isFinite(num) || num < 0 || num > 10) {
            return { state: 'invalid', value: null };
        }
        return { state: 'valid', value: num };
    }

    function setInvalidState(input, isInvalid) {
        if (isInvalid) {
            input.classList.add('is-invalid');
            input.setAttribute('aria-invalid', 'true');
        } else {
            input.classList.remove('is-invalid');
            input.removeAttribute('aria-invalid');
        }
    }

    /**
     * Live validation as the user types. Toggles the invalid state without
     * persisting; persistence happens on commit (change/blur).
     */
    function handleInputLive(ev) {
        var input = ev.target;
        var result = validateGradeValue(input.value);
        setInvalidState(input, result.state === 'invalid');
    }

    /**
     * Commit handler: persists when the value is valid, clears invalid state,
     * and surfaces an error message when the value is out of range.
     */
    function handleInputCommit(ev) {
        var input = ev.target;
        var table = tableContainer.querySelector('#dashboardStudentTable');
        var classId = table ? table.getAttribute('data-class-id') : null;
        var mssv = input.getAttribute('data-mssv');
        var column = input.getAttribute('data-column');

        if (!classId || !mssv || !column) return;

        var result = validateGradeValue(input.value);

        if (result.state === 'empty') {
            setInvalidState(input, false);
            return;
        }

        if (result.state === 'invalid') {
            setInvalidState(input, true);
            showSaveIndicator('Điểm phải nằm trong khoảng 0-10', 'error');
            return;
        }

        setInvalidState(input, false);
        persistGrade(classId, mssv, column, result.value);
    }

    function renderDashboardData(dashboard) {
        if (!dashboard) {
            tableContainer.innerHTML =
                '<div class="alert alert-info m-3 mb-0">' +
                '<i class="bi bi-info-circle me-2"></i>Lớp này chưa có dữ liệu.</div>';
            updateStats({ total: 0, passed: 0, atRisk: 0, failed: 0 });
            if (classNameEl) classNameEl.textContent = 'Chưa chọn lớp';
            return;
        }

        if (classNameEl && dashboard.classData) {
            classNameEl.textContent = dashboard.classData.name;
        }
        updateStats(dashboard.summary);

        var profile = dashboard.profile || { weights: {} };
        var weights = profile.weights || {};
        var columns = Object.keys(weights);

        var html = buildTableHtml(dashboard, columns, weights);
        tableContainer.innerHTML = html;

        bindGradeInputs();
        var checked = document.querySelector('input[name="dashboardFilter"]:checked');
        applyFilter(checked ? checked.value : 'all');
    }

    function escapeHtml(str) {
        return String(str == null ? '' : str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function buildTableHtml(dashboard, columns, weights) {
        if (!dashboard.students || dashboard.students.length === 0) {
            return '<div class="alert alert-warning m-3 mb-0">' +
                '<i class="bi bi-exclamation-triangle me-2"></i>Lớp ' +
                '<strong>' + escapeHtml(dashboard.classData.name) + '</strong> chưa có sinh viên nào.' +
                '</div>';
        }

        var thead = '<thead class="table-light"><tr>' +
            '<th style="width: 48px;">#</th>' +
            '<th>MSSV</th>' +
            '<th>Họ và tên</th>' +
            columns.map(function (c) {
                return '<th class="text-center" data-column="' + escapeHtml(c) + '">' +
                    escapeHtml(c) +
                    '<small class="text-muted d-block">Trọng số ' + escapeHtml(weights[c]) + '%</small>' +
                    '</th>';
            }).join('') +
            '<th class="text-center">Tổng</th>' +
            '<th class="text-center">Trạng thái</th>' +
            '</tr></thead>';

        var rowsHtml = dashboard.students.map(function (student, idx) {
            var inputs = columns.map(function (c) {
                var v = student.grades && student.grades[c] != null ? student.grades[c] : '';
                return '<td class="text-center">' +
                    '<input type="number" min="0" max="10" step="0.01" ' +
                    'class="form-control form-control-sm grade-input mx-auto" ' +
                    'style="max-width: 90px;" ' +
                    'data-mssv="' + escapeHtml(student.mssv) + '" ' +
                    'data-column="' + escapeHtml(c) + '" ' +
                    'value="' + escapeHtml(v) + '" ' +
                    'aria-label="' + escapeHtml(c) + ' của ' + escapeHtml(student.name) + '">' +
                    '</td>';
            }).join('');

            var badge;
            if (student.status === 'passed') {
                badge = '<span class="badge badge-pass dashboard-status-badge">✓ Đạt</span>';
            } else if (student.status === 'at-risk') {
                badge = '<span class="badge bg-warning text-dark dashboard-status-badge">⚠ Nguy cơ</span>';
            } else {
                badge = '<span class="badge badge-fail dashboard-status-badge">✗ Chưa đạt</span>';
            }

            var total = (typeof student.finalTotal === 'number' ? student.finalTotal : student.totalScore) || 0;

            return '<tr class="dashboard-student-row" data-mssv="' + escapeHtml(student.mssv) +
                '" data-status="' + escapeHtml(student.status) + '">' +
                '<td>' + (idx + 1) + '</td>' +
                '<td><strong>' + escapeHtml(student.mssv) + '</strong></td>' +
                '<td>' + escapeHtml(student.name) +
                (student.email ? '<small class="text-muted d-block">' + escapeHtml(student.email) + '</small>' : '') +
                '</td>' +
                inputs +
                '<td class="text-center fw-bold dashboard-final-total">' + Number(total).toFixed(2) + '</td>' +
                '<td class="text-center">' + badge + '</td>' +
                '</tr>';
        }).join('');

        return '<div class="table-responsive"><table class="table table-striped table-hover align-middle mb-0" ' +
            'id="dashboardStudentTable" data-class-id="' + escapeHtml(dashboard.classData.classId) + '">' +
            thead +
            '<tbody>' + rowsHtml + '</tbody>' +
            '</table></div>';
    }

    function fetchClassDashboard(classId) {
        if (!classId) {
            renderDashboardData(null);
            return;
        }
        fetch('/api/classes/' + encodeURIComponent(classId) + '/grades', {
            credentials: 'same-origin',
            headers: getAuthHeaders()
        })
            .then(function (res) {
                return res.json().then(function (body) { return { ok: res.ok, body: body }; });
            })
            .then(function (result) {
                if (!result.ok || !result.body || !result.body.success) {
                    var err = (result.body && (result.body.error || result.body.message)) || 'Tải dữ liệu thất bại';
                    showSaveIndicator(err, 'error');
                    return;
                }
                renderDashboardData(result.body.data);
            })
            .catch(function (err) {
                console.error('Failed to fetch class grades:', err);
                showSaveIndicator('Lỗi kết nối khi tải dữ liệu', 'error');
            });
    }

    if (classSelect) {
        classSelect.addEventListener('change', function () {
            var classId = classSelect.value;
            page.setAttribute('data-selected-class', classId || '');
            fetchClassDashboard(classId);
        });
    }

    bindFilterButtons();
    bindGradeInputs();
})();
