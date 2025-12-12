/**
 * Class Detail Page logic
 */

const serverData = window.__INITIAL_SERVER_DATA__ || {};
const classData = JSON.parse(JSON.stringify(serverData.classDetail || {}));
const profiles = serverData.profiles || {};

const state = {
    classData,
    profiles,
    currentProfileId: serverData.currentProfile ||
        classData?.grades?.profileId ||
        Object.keys(profiles)[0] ||
        '',
    grades: JSON.parse(JSON.stringify(classData?.grades?.students || {})),
    original: {
        profileId: (classData?.grades?.profileId) || '',
        grades: JSON.parse(JSON.stringify(classData?.grades?.students || {}))
    },
    isDirty: false,
    isSaving: false,
    hiddenColumns: new Set(), // Track which columns are hidden
    // Lucky wheel state
    wheel: {
        isSpinning: false,
        currentAngle: 0,
        students: [],
        history: [],
        allShuffled: [],
        // Wheelofnames.com style colors
        colors: ['#E53935', '#1E88E5', '#43A047', '#FDD835', '#FB8C00', '#E53935', '#1E88E5', '#43A047', '#FDD835', '#FB8C00', '#E53935', '#1E88E5']
    }
};

const elements = {
    profileSelect: document.getElementById('classDetailProfileSelect'),
    saveBtn: document.getElementById('classDetailSaveBtn'),
    resetBtn: document.getElementById('classDetailResetBtn'),
    importBtn: document.getElementById('classDetailImportBtn'),
    importInput: document.getElementById('classDetailImportInput'),
    importStatus: document.getElementById('classDetailImportStatus'),
    tableHeader: document.getElementById('classDetailTableHeader'),
    tableBody: document.getElementById('classDetailTableBody'),
    emptyState: document.getElementById('classDetailEmptyState'),
    tableWrapper: document.getElementById('classDetailTableWrapper'),
    profileSummary: document.getElementById('classDetailProfileSummary'),
    profileName: document.getElementById('classDetailProfileName'),
    passRate: document.getElementById('classDetailPassRate'),
    studentCount: document.getElementById('classDetailStudentCount'),
    // Quick import elements
    quickImportColumn: document.getElementById('quickImportColumn'),
    quickImportText: document.getElementById('quickImportText'),
    quickImportBtn: document.getElementById('quickImportBtn'),
    quickImportStatus: document.getElementById('quickImportStatus'),
    // Multi-quiz import elements
    multiQuizImportBtn: document.getElementById('multiQuizImportBtn'),
    multiQuizImportInput: document.getElementById('multiQuizImportInput'),
    // Column visibility elements
    columnVisibilityOptions: document.getElementById('columnVisibilityOptions'),
    showAllColumnsBtn: document.getElementById('showAllColumnsBtn'),
    hideAllColumnsBtn: document.getElementById('hideAllColumnsBtn'),
    // Share link elements
    shareGradesBtn: document.getElementById('shareGradesBtn'),
    copyShareLinkBtn: document.getElementById('copyShareLinkBtn'),
    openShareLinkBtn: document.getElementById('openShareLinkBtn'),
    // Lucky wheel elements
    wheelCanvas: document.getElementById('wheelCanvas'),
    spinWheelBtn: document.getElementById('spinWheelBtn'),
    wheelWinner: document.getElementById('wheelWinner'),
    winnerName: document.getElementById('winnerName'),
    winnerMssv: document.getElementById('winnerMssv'),
    shuffleWheelBtn: document.getElementById('shuffleWheelBtn'),
    wheelHistory: document.getElementById('wheelHistory'),
    clearHistoryBtn: document.getElementById('clearHistoryBtn'),
    shuffledStudentsList: document.getElementById('shuffledStudentsList'),
    shuffledCount: document.getElementById('shuffledCount'),
    // Team grouping elements
    teamGroupCount: document.getElementById('teamGroupCount'),
    teamMemberCount: document.getElementById('teamMemberCount'),
    teamPickLeader: document.getElementById('teamPickLeader'),
    generateTeamsBtn: document.getElementById('generateTeamsBtn'),
    teamGroupResults: document.getElementById('teamGroupResults'),
    copyTeamsBtn: document.getElementById('copyTeamsBtn')
};

function init() {
    // Only run on class detail page
    if (!document.getElementById('classDetailPage')) {
        return;
    }

    if (!classData || !classData.classId) {
        // Data not available (possibly auth issue or wrong page)
        return;
    }

    bindEvents();
    ensureProfileSelection();
    renderGradesTable();
    updateSummary();
}

function bindEvents() {
    if (elements.profileSelect) {
        elements.profileSelect.addEventListener('change', handleProfileChange);
    }

    if (elements.tableBody) {
        elements.tableBody.addEventListener('input', handleGradeInput);
    }

    // Copy column scores binding (event delegation on table header)
    if (elements.tableHeader) {
        elements.tableHeader.addEventListener('click', handleCopyColumnClick);
        elements.tableHeader.addEventListener('click', handleChartColumnClick);
    }

    // Export chart button
    const exportChartBtn = document.getElementById('exportChartBtn');
    if (exportChartBtn) {
        exportChartBtn.addEventListener('click', exportChartToImage);
    }

    // Chart type change
    document.querySelectorAll('input[name="chartType"]').forEach(radio => {
        radio.addEventListener('change', handleChartTypeChange);
    });

    if (elements.saveBtn) {
        elements.saveBtn.addEventListener('click', saveGrades);
    }

    if (elements.resetBtn) {
        elements.resetBtn.addEventListener('click', resetChanges);
    }

    if (elements.importBtn && elements.importInput) {
        elements.importBtn.addEventListener('click', () => elements.importInput.click());
        elements.importInput.addEventListener('change', handleImportGrades);
    }

    // Quick import bindings
    if (elements.quickImportBtn) {
        elements.quickImportBtn.addEventListener('click', handleQuickImport);
    }

    // Multi-quiz import bindings
    if (elements.multiQuizImportBtn && elements.multiQuizImportInput) {
        elements.multiQuizImportBtn.addEventListener('click', () => elements.multiQuizImportInput.click());
        elements.multiQuizImportInput.addEventListener('change', handleMultiQuizImport);
    }

    // Column visibility bindings
    if (elements.columnVisibilityOptions) {
        elements.columnVisibilityOptions.addEventListener('change', handleColumnVisibilityChange);
    }
    if (elements.showAllColumnsBtn) {
        elements.showAllColumnsBtn.addEventListener('click', showAllColumns);
    }
    if (elements.hideAllColumnsBtn) {
        elements.hideAllColumnsBtn.addEventListener('click', hideAllColumns);
    }

    // Share link bindings
    if (elements.shareGradesBtn) {
        elements.shareGradesBtn.addEventListener('click', copyShareLink);
    }
    if (elements.copyShareLinkBtn) {
        elements.copyShareLinkBtn.addEventListener('click', (e) => {
            e.preventDefault();
            copyShareLink();
        });
    }
    if (elements.openShareLinkBtn) {
        elements.openShareLinkBtn.addEventListener('click', (e) => {
            e.preventDefault();
            openSharePage();
        });
    }

    // Lucky wheel bindings
    if (elements.spinWheelBtn) {
        elements.spinWheelBtn.addEventListener('click', spinWheel);
    }
    if (elements.shuffleWheelBtn) {
        elements.shuffleWheelBtn.addEventListener('click', shuffleWheelStudents);
    }
    if (elements.clearHistoryBtn) {
        elements.clearHistoryBtn.addEventListener('click', clearWheelHistory);
    }

    // Initialize wheel when modal opens
    const wheelModal = document.getElementById('luckyWheelModal');
    if (wheelModal) {
        wheelModal.addEventListener('show.bs.modal', initializeWheel);
    }

    // Team grouping bindings
    if (elements.generateTeamsBtn) {
        elements.generateTeamsBtn.addEventListener('click', generateTeams);
    }
    if (elements.copyTeamsBtn) {
        elements.copyTeamsBtn.addEventListener('click', copyTeamsResult);
    }
}

function ensureProfileSelection() {
    if (!state.currentProfileId && elements.profileSelect) {
        state.currentProfileId = elements.profileSelect.value || Object.keys(profiles)[0] || '';
    }

    if (elements.profileSelect) {
        elements.profileSelect.value = state.currentProfileId;
    }
}

function getCurrentProfile() {
    return state.currentProfileId ? profiles[state.currentProfileId] : null;
}

function handleProfileChange(event) {
    state.currentProfileId = event.target.value;
    markDirty();
    renderGradesTable();
    updateSummary();
}

function handleGradeInput(event) {
    const target = event.target;
    if (!target.classList.contains('grade-input')) return;

    const mssv = target.dataset.mssv;
    const column = target.dataset.column;
    if (!mssv || !column) return;

    let value = parseFloat(target.value);
    if (Number.isNaN(value)) {
        value = '';
    } else {
        value = Math.min(Math.max(value, 0), 100);
    }

    target.value = value === '' ? '' : value;

    ensureStudentGrade(mssv);
    state.grades[mssv][column] = value === '' ? undefined : value;
    markDirty();
    updateRowSummary(mssv);
}

function ensureStudentGrade(mssv) {
    if (!state.grades[mssv]) {
        state.grades[mssv] = {};
    }
}

function sortColumns(profile) {
    if (!profile || !profile.weights) return [];
    return Object.keys(profile.weights).sort((a, b) => {
        const getOrder = (key) => {
            if (key.includes('Lab')) return 1;
            if (key.includes('Quiz')) return 2;
            if (key.includes('GD')) return 3;
            return 4;
        };
        const diff = getOrder(a) - getOrder(b);
        if (diff !== 0) return diff;
        const numA = parseInt(a.match(/\d+/)?.[0] || 0, 10);
        const numB = parseInt(b.match(/\d+/)?.[0] || 0, 10);
        return numA - numB;
    });
}

function renderGradesTable() {
    const profile = getCurrentProfile();

    if (!profile || !profile.weights || Object.keys(profile.weights).length === 0) {
        showEmptyState(true, 'Vui lòng chọn một profile có cấu hình trọng số để xem bảng điểm.');
        return;
    }

    if (!classData.students || classData.students.length === 0) {
        showEmptyState(true, 'Lớp chưa có sinh viên nào.');
        return;
    }

    showEmptyState(false);

    const allColumns = sortColumns(profile);
    // Filter out hidden columns for display
    const visibleColumns = allColumns.filter(col => !state.hiddenColumns.has(col));

    elements.tableHeader.innerHTML = `
        <tr>
            <th style="width:60px;" class="text-center">STT</th>
            <th style="width:120px;">MSSV</th>
            <th style="min-width:200px;">Họ và tên</th>
            ${visibleColumns.map(col => `
                <th class="text-center align-middle" data-column="${col}">
                    <div class="d-flex align-items-center justify-content-center gap-1">
                        <span>${col}</span>
                        <button class="btn btn-link btn-sm p-0 copy-column-btn" 
                                data-column="${col}" 
                                title="Copy điểm (MSSV điểm)"
                                style="font-size: 0.75rem; line-height: 1;">
                            <i class="bi bi-clipboard"></i>
                        </button>
                        <button class="btn btn-link btn-sm p-0 chart-column-btn" 
                                data-column="${col}" 
                                title="Xem biểu đồ điểm"
                                style="font-size: 0.75rem; line-height: 1;">
                            <i class="bi bi-bar-chart"></i>
                        </button>
                    </div>
                    <div class="text-muted small">${profile.weights[col]}%</div>
                </th>
            `).join('')}
            <th style="width:120px;" class="text-center">Tổng</th>
            <th style="width:140px;" class="text-center">Trạng thái</th>
        </tr>
    `;

    elements.tableBody.innerHTML = classData.students.map((student, index) => {
        ensureStudentGrade(student.mssv);
        const studentGrades = state.grades[student.mssv];
        const total = calculateTotal(studentGrades, profile.weights);
        const passed = total >= (profile.passThreshold || 0);

        return `
            <tr>
                <td class="text-center">${index + 1}</td>
                <td><span class="badge bg-primary">${student.mssv}</span></td>
                <td>${student.name}</td>
                ${visibleColumns.map(column => `
                    <td class="text-center" data-column="${column}">
                        <input
                            type="number"
                            class="form-control form-control-sm grade-input"
                            data-mssv="${student.mssv}"
                            data-column="${column}"
                            min="0"
                            max="10"
                            step="0.1"
                            value="${studentGrades[column] ?? ''}"
                            placeholder="0"
                        />
                    </td>
                `).join('')}
                <td class="text-center fw-bold" data-total-mssv="${student.mssv}">
                    ${total.toFixed(2)}
                </td>
                <td class="text-center" data-status-mssv="${student.mssv}">
                    <span class="badge ${passed ? 'bg-success' : 'bg-danger'}">
                        ${passed ? '✓ Đạt' : '✗ Chưa đạt'}
                    </span>
                </td>
            </tr>
        `;
    }).join('');

    updateSummary();
    updateQuickImportColumns();
    updateColumnVisibilityOptions(allColumns);
}

function showEmptyState(show, message) {
    if (!elements.emptyState || !elements.tableWrapper) return;

    elements.emptyState.style.display = show ? 'block' : 'none';
    elements.tableWrapper.style.display = show ? 'none' : 'block';
    if (show && message) {
        elements.emptyState.innerHTML = `
            <i class="bi bi-info-circle fs-1 d-block mb-3"></i>
            ${message}
        `;
    }
}

function calculateTotal(studentGrades = {}, weights = {}) {
    return Object.entries(weights).reduce((sum, [column, weight]) => {
        const score = parseFloat(studentGrades[column]) || 0;
        return sum + (score / 100) * weight;
    }, 0);
}

function updateRowSummary(mssv) {
    const profile = getCurrentProfile();
    if (!profile) return;

    const studentGrades = state.grades[mssv] || {};
    const total = calculateTotal(studentGrades, profile.weights);
    const passed = total >= (profile.passThreshold || 0);

    const totalEl = document.querySelector(`[data-total-mssv="${mssv}"]`);
    const statusEl = document.querySelector(`[data-status-mssv="${mssv}"]`);

    if (totalEl) {
        totalEl.textContent = total.toFixed(2);
    }

    if (statusEl) {
        statusEl.innerHTML = `
            <span class="badge ${passed ? 'bg-success' : 'bg-danger'}">
                ${passed ? '✓ Đạt' : '✗ Chưa đạt'}
            </span>
        `;
    }

    updateSummary();
}

function updateSummary() {
    const profile = getCurrentProfile();

    if (elements.profileSummary) {
        elements.profileSummary.textContent = profile
            ? `${profile.name} • Tổng trọng số ${Object.values(profile.weights || {}).reduce((s, w) => s + w, 0)}%`
            : 'Chưa chọn profile';
    }

    if (elements.profileName) {
        elements.profileName.textContent = profile ? profile.name : 'Chưa chọn';
    }

    if (!profile || !classData.students || classData.students.length === 0) {
        if (elements.passRate) elements.passRate.textContent = '0%';
        return;
    }

    let passedCount = 0;
    classData.students.forEach(student => {
        const grades = state.grades[student.mssv] || {};
        const total = calculateTotal(grades, profile.weights);
        if (total >= (profile.passThreshold || 0)) {
            passedCount += 1;
        }
    });

    const rate = classData.students.length > 0
        ? Math.round((passedCount / classData.students.length) * 100)
        : 0;

    if (elements.passRate) {
        elements.passRate.textContent = `${rate}%`;
    }

    if (elements.studentCount) {
        elements.studentCount.textContent = classData.students.length;
    }
}

function markDirty() {
    state.isDirty = true;
    updateSaveButtonState();
}

function resetChanges() {
    state.currentProfileId = state.original.profileId || Object.keys(profiles)[0] || '';
    state.grades = JSON.parse(JSON.stringify(state.original.grades || {}));
    state.isDirty = false;
    ensureProfileSelection();
    renderGradesTable();
    updateSummary();
    updateSaveButtonState();
}

async function handleImportGrades(event) {
    const file = event.target.files[0];
    event.target.value = '';

    if (!file) return;

    const profile = getCurrentProfile();
    if (!profile || !state.currentProfileId) {
        setImportStatus('Vui lòng chọn profile điểm trước khi nhập điểm.', 'warning');
        return;
    }

    if (!classData.students || classData.students.length === 0) {
        setImportStatus('Lớp chưa có sinh viên để nhập điểm.', 'warning');
        return;
    }

    try {
        setImportStatus(`Đang đọc file "${file.name}"...`, 'info');
        const rows = await readExcelFile(file);

        if (!rows || rows.length < 2) {
            throw new Error('File không chứa dữ liệu hợp lệ.');
        }

        const headers = rows[0];
        const mssvIndex = findMssvColumnIndex(headers);

        if (mssvIndex === -1) {
            throw new Error('Không xác định được cột MSSV trong file.');
        }

        const { mapping, missing } = mapGradeColumns(headers, profile);

        if (Object.keys(mapping).length === 0) {
            throw new Error('Không tìm thấy cột điểm nào khớp với profile hiện tại.');
        }

        if (missing.length > 0) {
            setImportStatus(
                `⚠️ Không tìm thấy các cột: ${missing.join(', ')}. Vẫn tiếp tục với các cột còn lại.`,
                'warning'
            );
        } else {
            setImportStatus(`Đang nhập điểm từ file "${file.name}"...`, 'info');
        }

        let updatedCount = 0;
        let skippedCount = 0;

        rows.slice(1).forEach(row => {
            if (!row) return;
            const rawMssv = row[mssvIndex];
            if (!rawMssv) {
                skippedCount += 1;
                return;
            }

            const mssv = rawMssv.toString().trim();
            const student = classData.students.find(s => (s.mssv || '').toString().trim() === mssv);

            if (!student) {
                skippedCount += 1;
                return;
            }

            ensureStudentGrade(student.mssv);
            let hasValue = false;

            Object.entries(mapping).forEach(([column, index]) => {
                const rawValue = row[index];
                const parsed = parseFloat(rawValue);

                if (!Number.isNaN(parsed)) {
                    const value = Math.min(Math.max(parsed, 0), 100);
                    state.grades[student.mssv][column] = value;
                    hasValue = true;
                }
            });

            if (hasValue) {
                updatedCount += 1;
            } else {
                skippedCount += 1;
            }
        });

        if (updatedCount === 0) {
            throw new Error('Không có dòng dữ liệu nào được nhập. Vui lòng kiểm tra lại file.');
        }

        markDirty();
        renderGradesTable();
        updateSummary();

        setImportStatus(
            `Đã nhập điểm cho ${updatedCount} sinh viên. ${skippedCount > 0 ? `Bỏ qua ${skippedCount} dòng (không khớp MSSV hoặc thiếu dữ liệu).` : ''}`,
            'success'
        );
    } catch (error) {
        console.error('Import grades error:', error);
        setImportStatus(`❌ Lỗi nhập điểm: ${error.message}`, 'error');
    }
}

function findMssvColumnIndex(headers = []) {
    const normalizedHeaders = headers.map(normalizeHeader);
    const candidates = [
        'mssv',
        'masv',
        'masinhvien',
        'studentid',
        'id'
    ];

    for (const candidate of candidates) {
        const index = normalizedHeaders.findIndex(header => header.includes(candidate));
        if (index !== -1) return index;
    }

    return -1;
}

function mapGradeColumns(headers = [], profile = {}) {
    const normalizedHeaders = headers.map(normalizeHeader);
    const mapping = {};
    const missing = [];

    Object.keys(profile.weights || {}).forEach(column => {
        const normalizedColumn = normalizeHeader(column);

        let index = normalizedHeaders.findIndex(header => header === normalizedColumn);
        if (index === -1) {
            index = normalizedHeaders.findIndex(header =>
                header.includes(normalizedColumn) || normalizedColumn.includes(header)
            );
        }

        if (index !== -1) {
            mapping[column] = index;
        } else {
            missing.push(column);
        }
    });

    return { mapping, missing };
}

function normalizeHeader(value = '') {
    return value
        .toString()
        .trim()
        .toLowerCase()
        .replace(/[\s\-_]+/g, '')
        .replace(/[().]/g, '');
}

function readExcelFile(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                const firstSheet = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheet];
                const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
                resolve(rows);
            } catch (err) {
                reject(err);
            }
        };
        reader.onerror = reject;
        reader.readAsArrayBuffer(file);
    });
}

function setImportStatus(message, type = 'info') {
    if (!elements.importStatus) return;

    const colorClass = {
        success: 'text-success',
        error: 'text-danger',
        warning: 'text-warning',
        info: 'text-muted'
    }[type] || 'text-muted';

    elements.importStatus.className = `${colorClass} small`;
    elements.importStatus.textContent = message;
}

// ========================================
// QUICK IMPORT FUNCTIONS
// ========================================

/**
 * Set status message for quick import section
 */
function setQuickImportStatus(message, type = 'info') {
    if (!elements.quickImportStatus) return;

    const colorClass = {
        success: 'text-success',
        error: 'text-danger',
        warning: 'text-warning',
        info: 'text-muted'
    }[type] || 'text-muted';

    elements.quickImportStatus.className = `${colorClass} small`;
    elements.quickImportStatus.textContent = message;
}

/**
 * Update quick import column selector based on current profile
 */
function updateQuickImportColumns() {
    if (!elements.quickImportColumn) return;

    const profile = getCurrentProfile();

    if (!profile || !profile.weights) {
        elements.quickImportColumn.innerHTML = '<option value="">-- Chọn profile trước --</option>';
        return;
    }

    const columns = sortColumns(profile);
    elements.quickImportColumn.innerHTML = `
        <option value="">-- Chọn cột điểm --</option>
        ${columns.map(col => `
            <option value="${col}">${col} (${profile.weights[col]}%)</option>
        `).join('')}
    `;
}

// ========================================
// COLUMN VISIBILITY FUNCTIONS
// ========================================

/**
 * Update column visibility options based on current profile
 */
function updateColumnVisibilityOptions(columns) {
    if (!elements.columnVisibilityOptions || !columns) return;

    const profile = getCurrentProfile();
    if (!profile) return;

    elements.columnVisibilityOptions.innerHTML = columns.map(col => `
        <div class="form-check">
            <input class="form-check-input" type="checkbox" 
                   id="colVis_${col}" value="${col}" 
                   ${!state.hiddenColumns.has(col) ? 'checked' : ''}>
            <label class="form-check-label small" for="colVis_${col}">
                ${col} <span class="text-muted">(${profile.weights[col]}%)</span>
            </label>
        </div>
    `).join('');
}

/**
 * Handle column visibility checkbox change
 */
function handleColumnVisibilityChange(event) {
    const checkbox = event.target;
    if (!checkbox.classList.contains('form-check-input')) return;

    const column = checkbox.value;

    if (checkbox.checked) {
        state.hiddenColumns.delete(column);
    } else {
        state.hiddenColumns.add(column);
    }

    renderGradesTable();
}

/**
 * Show all columns
 */
function showAllColumns() {
    state.hiddenColumns.clear();
    renderGradesTable();
}

/**
 * Hide all columns (except keep at least one visible)
 */
function hideAllColumns() {
    const profile = getCurrentProfile();
    if (!profile || !profile.weights) return;

    const columns = Object.keys(profile.weights);
    columns.forEach(col => state.hiddenColumns.add(col));
    renderGradesTable();
}

// ========================================
// SHARE LINK FUNCTIONS
// ========================================

/**
 * Get share link URL for student grade lookup
 */
function getShareLink() {
    const classId = classData?.classId || '';
    if (!classId) return '';
    return `${window.location.origin}/student.html?class=${classId}`;
}

/**
 * Copy share link to clipboard
 */
function copyShareLink() {
    const shareUrl = getShareLink();

    if (!shareUrl) {
        alert('Không tìm thấy mã lớp!');
        return;
    }

    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(shareUrl).then(() => {
            alert(`Đã copy link tra cứu điểm!\n\nLink: ${shareUrl}\n\nSinh viên nhập MSSV để xem điểm.`);
        }).catch(() => {
            fallbackCopyToClipboard(shareUrl);
        });
    } else {
        fallbackCopyToClipboard(shareUrl);
    }
}

/**
 * Fallback copy method for older browsers
 */
function fallbackCopyToClipboard(text) {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-9999px';
    document.body.appendChild(textArea);
    textArea.select();
    try {
        document.execCommand('copy');
        alert(`Đã copy link tra cứu điểm!\n\nLink: ${text}\n\nSinh viên nhập MSSV để xem điểm.`);
    } catch (err) {
        alert(`Link tra cứu điểm:\n\n${text}`);
    }
    document.body.removeChild(textArea);
}

/**
 * Open share page in new tab
 */
function openSharePage() {
    const shareUrl = getShareLink();
    if (!shareUrl) {
        alert('Không tìm thấy mã lớp!');
        return;
    }
    window.open(shareUrl, '_blank');
}

// ========================================
// COPY COLUMN SCORES FUNCTIONS
// ========================================

/**
 * Handle click on copy column button
 * Copies all scores for that column in "MSSV score" format
 */
function handleCopyColumnClick(event) {
    const btn = event.target.closest('.copy-column-btn');
    if (!btn) return;

    event.preventDefault();
    event.stopPropagation();

    const column = btn.dataset.column;
    if (!column) return;

    copyColumnScores(column);
}

/**
 * Copy all scores for a specific column in "MSSV score" format
 * Example output: PK04071 8
 */
function copyColumnScores(column) {
    if (!classData.students || classData.students.length === 0) {
        alert('Không có sinh viên nào trong lớp.');
        return;
    }

    const lines = [];

    classData.students.forEach(student => {
        const studentGrades = state.grades[student.mssv] || {};
        const score = studentGrades[column];

        // Only include students who have a score for this column
        if (score !== undefined && score !== null && score !== '') {
            lines.push(`${student.mssv} ${score}`);
        }
    });

    if (lines.length === 0) {
        alert(`Không có điểm nào cho cột "${column}".`);
        return;
    }

    const text = lines.join('\n');

    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(() => {
            showCopySuccess(column, lines.length);
        }).catch(() => {
            fallbackCopyColumnScores(text, column, lines.length);
        });
    } else {
        fallbackCopyColumnScores(text, column, lines.length);
    }
}

/**
 * Fallback copy method for column scores
 */
function fallbackCopyColumnScores(text, column, count) {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-9999px';
    document.body.appendChild(textArea);
    textArea.select();
    try {
        document.execCommand('copy');
        showCopySuccess(column, count);
    } catch (err) {
        alert(`Không thể copy. Dữ liệu:\n\n${text}`);
    }
    document.body.removeChild(textArea);
}

/**
 * Show success message after copying column scores
 */
function showCopySuccess(column, count) {
    // Create a toast-like notification
    const toast = document.createElement('div');
    toast.className = 'copy-toast';
    toast.innerHTML = `<i class="bi bi-check-circle me-1"></i> Đã copy ${count} điểm ${column}`;
    toast.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: #198754;
        color: white;
        padding: 12px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 9999;
        animation: slideIn 0.3s ease;
    `;

    document.body.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 2000);
}

// ========================================
// SCORE CHART FUNCTIONS
// ========================================

// Store chart instance and current column for reference
let scoreChartInstance = null;
let currentChartColumn = null;

/**
 * Handle click on chart column button
 */
function handleChartColumnClick(event) {
    const btn = event.target.closest('.chart-column-btn');
    if (!btn) return;

    event.preventDefault();
    event.stopPropagation();

    const column = btn.dataset.column;
    if (!column) return;

    showColumnChart(column);
}

/**
 * Show chart modal for a specific column
 */
function showColumnChart(column) {
    currentChartColumn = column;

    // Update modal title
    const chartColumnName = document.getElementById('chartColumnName');
    if (chartColumnName) {
        chartColumnName.textContent = column;
    }

    // Get scores for this column
    const scores = [];
    const labels = [];

    classData.students.forEach(student => {
        const studentGrades = state.grades[student.mssv] || {};
        const score = studentGrades[column];

        if (score !== undefined && score !== null && score !== '') {
            scores.push(parseFloat(score));
            labels.push(student.mssv);
        }
    });

    if (scores.length === 0) {
        alert(`Không có điểm nào cho cột "${column}".`);
        return;
    }

    // Calculate statistics
    const max = Math.max(...scores);
    const min = Math.min(...scores);
    const avg = (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(2);
    const count = scores.length;

    // Update statistics display
    document.getElementById('chartMax').textContent = max;
    document.getElementById('chartMin').textContent = min;
    document.getElementById('chartAvg').textContent = avg;
    document.getElementById('chartCount').textContent = count;

    // Get selected chart type
    const chartType = document.querySelector('input[name="chartType"]:checked')?.value || 'bar';

    // Render chart
    renderScoreChart(labels, scores, column, chartType);

    // Show modal
    const modal = new bootstrap.Modal(document.getElementById('scoreChartModal'));
    modal.show();
}

/**
 * Render score chart using Chart.js
 */
function renderScoreChart(labels, scores, column, chartType = 'bar') {
    const ctx = document.getElementById('scoreChart');
    if (!ctx) return;

    // Destroy existing chart if any
    if (scoreChartInstance) {
        scoreChartInstance.destroy();
    }

    // Color configuration based on score
    const backgroundColors = scores.map(score => {
        if (score >= 8) return 'rgba(25, 135, 84, 0.7)';  // Green for high
        if (score >= 5) return 'rgba(13, 110, 253, 0.7)'; // Blue for medium
        return 'rgba(220, 53, 69, 0.7)';                   // Red for low
    });

    const borderColors = scores.map(score => {
        if (score >= 8) return 'rgb(25, 135, 84)';
        if (score >= 5) return 'rgb(13, 110, 253)';
        return 'rgb(220, 53, 69)';
    });

    const chartConfig = {
        type: chartType,
        data: {
            labels: labels,
            datasets: [{
                label: `Điểm ${column}`,
                data: scores,
                backgroundColor: chartType === 'line' ? 'rgba(102, 126, 234, 0.2)' : backgroundColors,
                borderColor: chartType === 'line' ? 'rgb(102, 126, 234)' : borderColors,
                borderWidth: chartType === 'line' ? 3 : 1,
                fill: chartType === 'line',
                tension: 0.3,
                pointRadius: chartType === 'line' ? 4 : 0,
                pointBackgroundColor: chartType === 'line' ? 'rgb(102, 126, 234)' : undefined,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                },
                title: {
                    display: true,
                    text: `Phân bố điểm ${column}`,
                    font: {
                        size: 16,
                        weight: 'bold'
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function (context) {
                            return `Điểm: ${context.raw}`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    max: 10,
                    title: {
                        display: true,
                        text: 'Điểm'
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'MSSV'
                    },
                    ticks: {
                        maxRotation: 45,
                        minRotation: 45
                    }
                }
            }
        }
    };

    scoreChartInstance = new Chart(ctx, chartConfig);
}

/**
 * Handle chart type change (bar/line)
 */
function handleChartTypeChange(event) {
    if (!currentChartColumn || !scoreChartInstance) return;

    const chartType = event.target.value;

    // Get current data from chart
    const labels = scoreChartInstance.data.labels;
    const scores = scoreChartInstance.data.datasets[0].data;

    // Re-render with new chart type
    renderScoreChart(labels, scores, currentChartColumn, chartType);
}

/**
 * Export chart to PNG image
 */
function exportChartToImage() {
    if (!scoreChartInstance) {
        alert('Không có biểu đồ để xuất.');
        return;
    }

    const canvas = document.getElementById('scoreChart');
    if (!canvas) return;

    // Create a temporary canvas with white background
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');

    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;

    // Fill white background
    tempCtx.fillStyle = 'white';
    tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);

    // Draw chart on top
    tempCtx.drawImage(canvas, 0, 0);

    // Create download link
    const link = document.createElement('a');
    const className = classData?.name || 'class';
    const timestamp = new Date().toISOString().slice(0, 10);
    link.download = `chart_${currentChartColumn}_${className}_${timestamp}.png`;
    link.href = tempCanvas.toDataURL('image/png');
    link.click();

    // Show success toast
    showCopySuccess(`Đã tải ảnh biểu đồ ${currentChartColumn}`, 1);
}

// ========================================
// LUCKY WHEEL FUNCTIONS
// ========================================

/**
 * Initialize the lucky wheel with students
 */
function initializeWheel() {
    if (!classData.students || classData.students.length === 0) {
        return;
    }

    // Shuffle ALL students
    const shuffled = [...classData.students].sort(() => Math.random() - 0.5);
    state.wheel.allShuffled = shuffled;

    // Use up to 10 students for the wheel display (for readability)
    state.wheel.students = shuffled.slice(0, Math.min(10, shuffled.length));

    // Reset winner display
    if (elements.wheelWinner) {
        elements.wheelWinner.classList.add('d-none');
    }

    drawWheel();
    updateShuffledList();
}

/**
 * Draw the wheel on canvas - Wheelofnames.com style
 */
function drawWheel() {
    const canvas = elements.wheelCanvas;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = Math.min(centerX, centerY) - 5;

    const students = state.wheel.students;
    if (students.length === 0) return;

    const sliceAngle = (2 * Math.PI) / students.length;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw shadow under the wheel
    ctx.beginPath();
    ctx.arc(centerX + 3, centerY + 3, radius, 0, 2 * Math.PI);
    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    ctx.fill();

    // Draw slices
    students.forEach((student, index) => {
        const startAngle = state.wheel.currentAngle + (index * sliceAngle);
        const endAngle = startAngle + sliceAngle;

        // Draw slice
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.arc(centerX, centerY, radius, startAngle, endAngle);
        ctx.closePath();
        ctx.fillStyle = state.wheel.colors[index % state.wheel.colors.length];
        ctx.fill();

        // Thin white border between slices
        ctx.strokeStyle = 'rgba(255,255,255,0.4)';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Draw text along the slice
        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.rotate(startAngle + sliceAngle / 2);

        // Text style
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 13px Inter, Arial, sans-serif';

        // Text shadow for better readability
        ctx.shadowColor = 'rgba(0,0,0,0.4)';
        ctx.shadowBlur = 3;
        ctx.shadowOffsetX = 1;
        ctx.shadowOffsetY = 1;

        // Truncate name if too long
        let displayName = student.name;
        const maxLen = students.length > 8 ? 10 : 14;
        if (displayName.length > maxLen) {
            displayName = displayName.substring(0, maxLen) + '...';
        }

        ctx.fillText(displayName, radius - 12, 0);
        ctx.restore();
    });

    // Draw outer ring
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
    ctx.strokeStyle = 'rgba(255,255,255,0.6)';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Draw center circle
    const centerRadius = 35;
    ctx.beginPath();
    ctx.arc(centerX, centerY, centerRadius, 0, 2 * Math.PI);
    ctx.fillStyle = '#fff';
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.1)';
    ctx.lineWidth = 2;
    ctx.stroke();
}

/**
 * Spin the wheel
 */
function spinWheel() {
    if (state.wheel.isSpinning || state.wheel.students.length === 0) return;

    state.wheel.isSpinning = true;
    elements.spinWheelBtn.disabled = true;
    elements.spinWheelBtn.innerHTML = '...';

    // Hide previous winner
    if (elements.wheelWinner) {
        elements.wheelWinner.classList.add('d-none');
    }

    // Random spin parameters
    const spinTime = 4000 + Math.random() * 2000; // 4-6 seconds
    const totalRotation = (5 + Math.random() * 5) * 2 * Math.PI; // 5-10 full rotations
    const startTime = Date.now();
    const startAngle = state.wheel.currentAngle;

    function animate() {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / spinTime, 1);

        // Ease out cubic
        const easeOut = 1 - Math.pow(1 - progress, 3);

        state.wheel.currentAngle = startAngle + totalRotation * easeOut;
        drawWheel();

        if (progress < 1) {
            requestAnimationFrame(animate);
        } else {
            // Spin complete - determine winner
            state.wheel.isSpinning = false;
            elements.spinWheelBtn.disabled = false;
            elements.spinWheelBtn.innerHTML = 'Click<br>to spin';

            // Calculate winner based on angle at top (pointer at 270 degrees / -PI/2)
            const normalizedAngle = ((state.wheel.currentAngle % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
            const pointerAngle = (3 * Math.PI / 2 - normalizedAngle + 2 * Math.PI) % (2 * Math.PI);
            const sliceAngle = (2 * Math.PI) / state.wheel.students.length;
            const winnerIndex = Math.floor(pointerAngle / sliceAngle) % state.wheel.students.length;

            const winner = state.wheel.students[winnerIndex];

            // Show winner
            if (elements.wheelWinner && elements.winnerName && elements.winnerMssv) {
                elements.winnerName.textContent = winner.name;
                elements.winnerMssv.textContent = winner.mssv;
                elements.wheelWinner.classList.remove('d-none');
            }

            // Add to history
            state.wheel.history.unshift({
                name: winner.name,
                mssv: winner.mssv,
                time: new Date().toLocaleTimeString('vi-VN')
            });

            updateWheelHistory();
        }
    }

    requestAnimationFrame(animate);
}

/**
 * Shuffle wheel students
 */
function shuffleWheelStudents() {
    initializeWheel();
}

/**
 * Clear wheel history
 */
function clearWheelHistory() {
    state.wheel.history = [];
    updateWheelHistory();
}

/**
 * Update wheel history display
 */
function updateWheelHistory() {
    if (!elements.wheelHistory) return;

    if (state.wheel.history.length === 0) {
        elements.wheelHistory.innerHTML = '<div class="text-muted small text-center py-2">Chưa có lịch sử</div>';
        return;
    }

    elements.wheelHistory.innerHTML = state.wheel.history.slice(0, 10).map((item, index) => `
        <div class="list-group-item py-1 px-2 d-flex justify-content-between align-items-center">
            <div>
                <small class="fw-bold">${index + 1}. ${item.name}</small>
                <span class="badge bg-secondary ms-1" style="font-size: 0.65rem;">${item.mssv}</span>
            </div>
            <small class="text-muted">${item.time}</small>
        </div>
    `).join('');
}

/**
 * Update shuffled students list display
 */
function updateShuffledList() {
    if (!elements.shuffledStudentsList) return;

    const shuffled = state.wheel.allShuffled || [];

    if (shuffled.length === 0) {
        elements.shuffledStudentsList.innerHTML = '<div class="text-muted small text-center py-3">Nhấn "Xáo trộn" để random thứ tự</div>';
        if (elements.shuffledCount) elements.shuffledCount.textContent = '0';
        return;
    }

    // Update count badge
    if (elements.shuffledCount) {
        elements.shuffledCount.textContent = shuffled.length;
    }

    // Render shuffled list with numbered positions
    elements.shuffledStudentsList.innerHTML = shuffled.map((student, index) => {
        const bgColor = index === 0 ? 'bg-success text-white' :
            index === 1 ? 'bg-warning' :
                index === 2 ? 'bg-info text-white' : '';
        const medal = index === 0 ? '[1st]' : index === 1 ? '[2nd]' : index === 2 ? '[3rd]' : '';

        return `
            <div class="list-group-item py-2 px-3 d-flex align-items-center ${bgColor}">
                <span class="badge ${index < 3 ? 'bg-dark' : 'bg-secondary'} me-2" style="min-width: 28px;">${index + 1}</span>
                <div class="flex-grow-1">
                    <span class="fw-semibold">${medal} ${student.name}</span>
                </div>
                <span class="badge bg-primary-subtle text-primary">${student.mssv}</span>
            </div>
        `;
    }).join('');
}

// ========================================
// TEAM GROUPING FUNCTIONS
// ========================================

// Team colors for display
const teamColors = [
    { bg: '#E53935', border: '#C62828', text: '#fff' },  // Red
    { bg: '#43A047', border: '#2E7D32', text: '#fff' },  // Green
    { bg: '#1E88E5', border: '#1565C0', text: '#fff' },  // Blue
    { bg: '#FDD835', border: '#F9A825', text: '#333' },  // Yellow
    { bg: '#FB8C00', border: '#EF6C00', text: '#fff' },  // Orange
    { bg: '#8E24AA', border: '#6A1B9A', text: '#fff' },  // Purple
    { bg: '#00ACC1', border: '#00838F', text: '#fff' },  // Cyan
    { bg: '#D81B60', border: '#AD1457', text: '#fff' },  // Pink
    { bg: '#5E35B1', border: '#4527A0', text: '#fff' },  // Deep Purple
    { bg: '#00897B', border: '#00695C', text: '#fff' },  // Teal
];

// Store generated teams for copying
let generatedTeams = [];

/**
 * Generate random teams from class students
 */
function generateTeams() {
    if (!classData.students || classData.students.length === 0) {
        alert('Không có sinh viên trong lớp!');
        return;
    }

    const groupCount = parseInt(elements.teamGroupCount?.value) || 4;
    const memberCount = parseInt(elements.teamMemberCount?.value) || 0;
    const pickLeader = elements.teamPickLeader?.checked || false;

    // Shuffle students
    const shuffled = [...classData.students].sort(() => Math.random() - 0.5);

    // Calculate number of teams
    let numTeams;
    if (memberCount > 0) {
        numTeams = Math.ceil(shuffled.length / memberCount);
    } else {
        numTeams = Math.min(groupCount, shuffled.length);
    }

    // Create empty teams
    generatedTeams = Array.from({ length: numTeams }, (_, i) => ({
        name: `Team ${i + 1}`,
        members: [],
        leader: null
    }));

    // Distribute students evenly
    shuffled.forEach((student, index) => {
        const teamIndex = index % numTeams;
        generatedTeams[teamIndex].members.push(student);
    });

    // Pick leaders if enabled
    if (pickLeader) {
        generatedTeams.forEach(team => {
            if (team.members.length > 0) {
                team.leader = team.members[0];
            }
        });
    }

    // Render results
    renderTeamResults();

    // Enable copy button
    if (elements.copyTeamsBtn) {
        elements.copyTeamsBtn.disabled = false;
    }
}

/**
 * Render team results in the modal
 */
function renderTeamResults() {
    if (!elements.teamGroupResults) return;

    const colClass = generatedTeams.length <= 4 ? 'col-md-6' : 'col-md-4';

    elements.teamGroupResults.innerHTML = generatedTeams.map((team, index) => {
        const color = teamColors[index % teamColors.length];

        return `
            <div class="${colClass}">
                <div class="card h-100" style="border: 3px solid ${color.border}; border-top: 8px solid ${color.bg};">
                    <div class="card-header py-2" style="background: ${color.bg}; color: ${color.text};">
                        <strong>${team.name}</strong>
                        <span class="badge bg-light text-dark float-end">${team.members.length}</span>
                    </div>
                    <div class="card-body p-2">
                        <ul class="list-unstyled mb-0 small">
                            ${team.members.map((member, mIndex) => {
            const isLeader = team.leader && team.leader.mssv === member.mssv;
            return `
                                    <li class="py-1 ${mIndex > 0 ? 'border-top' : ''} ${isLeader ? 'fw-bold' : ''}">
                                        ${isLeader ? '<i class="bi bi-star-fill text-warning"></i> ' : ''}${member.name}
                                        <span class="text-muted">(${member.mssv})</span>
                                    </li>
                                `;
        }).join('')}
                        </ul>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

/**
 * Copy teams result to clipboard
 */
function copyTeamsResult() {
    if (generatedTeams.length === 0) {
        alert('Chưa có kết quả chia nhóm!');
        return;
    }

    const text = generatedTeams.map(team => {
        const leader = team.leader ? ` (Nhóm trưởng: ${team.leader.name})` : '';
        const members = team.members.map((m, i) => `  ${i + 1}. ${m.name} - ${m.mssv}`).join('\n');
        return `[Team] ${team.name}${leader}\n${members}`;
    }).join('\n\n');

    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(() => {
            alert('Đã copy kết quả chia nhóm!');
        });
    } else {
        // Fallback
        const textArea = document.createElement('textarea');
        textArea.value = text;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        alert('Đã copy kết quả chia nhóm!');
    }
}

/**
 * Handle quick import from text input
 * Supports formats: "MSSV score", "MSSV, score", "MSSV    score"
 */
async function handleQuickImport() {
    const column = elements.quickImportColumn?.value;
    const text = elements.quickImportText?.value?.trim();

    if (!column) {
        setQuickImportStatus('⚠️ Vui lòng chọn cột điểm!', 'warning');
        return;
    }

    if (!text) {
        setQuickImportStatus('⚠️ Vui lòng nhập dữ liệu điểm!', 'warning');
        return;
    }

    const profile = getCurrentProfile();
    if (!profile) {
        setQuickImportStatus('⚠️ Vui lòng chọn profile điểm!', 'warning');
        return;
    }

    if (!classData.students || classData.students.length === 0) {
        setQuickImportStatus('⚠️ Lớp chưa có sinh viên!', 'warning');
        return;
    }

    // Parse the text input
    const lines = text.split('\n').filter(line => line.trim());
    let updatedCount = 0;
    let skippedCount = 0;
    const notFoundMssvs = [];

    lines.forEach(line => {
        // Support multiple separators: space, comma, tab
        const parts = line.trim().split(/[\s,\t]+/).filter(p => p);

        if (parts.length < 2) {
            skippedCount++;
            return;
        }

        // First part is MSSV, last part is score (to handle names in between if any)
        const mssv = parts[0].toUpperCase().trim();
        const scoreStr = parts[parts.length - 1];
        const score = parseFloat(scoreStr);

        if (Number.isNaN(score)) {
            skippedCount++;
            return;
        }

        // Find student by MSSV (case insensitive)
        const student = classData.students.find(s =>
            (s.mssv || '').toString().trim().toUpperCase() === mssv
        );

        if (!student) {
            notFoundMssvs.push(mssv);
            skippedCount++;
            return;
        }

        // Apply score (clamp to 0-100)
        const clampedScore = Math.min(Math.max(score, 0), 100);
        ensureStudentGrade(student.mssv);
        state.grades[student.mssv][column] = clampedScore;
        updatedCount++;
    });

    if (updatedCount === 0) {
        setQuickImportStatus(
            `❌ Không nhập được dữ liệu nào. Kiểm tra lại định dạng (MSSV điểm)` +
            (notFoundMssvs.length > 0 ? ` - Không tìm thấy: ${notFoundMssvs.slice(0, 5).join(', ')}${notFoundMssvs.length > 5 ? '...' : ''}` : ''),
            'error'
        );
        return;
    }

    // Mark dirty and re-render
    markDirty();
    renderGradesTable();
    updateSummary();

    // Clear the text input
    if (elements.quickImportText) {
        elements.quickImportText.value = '';
    }

    // Show success message
    let statusMsg = `Đã nhập điểm ${column} cho ${updatedCount} sinh viên.`;
    if (skippedCount > 0) {
        statusMsg += ` Bỏ qua ${skippedCount} dòng.`;
    }
    if (notFoundMssvs.length > 0 && notFoundMssvs.length <= 5) {
        statusMsg += ` Không tìm thấy: ${notFoundMssvs.join(', ')}`;
    }
    setQuickImportStatus(statusMsg, 'success');

    // Auto-save after quick import to prevent data loss
    if (confirm(`Đã nhập điểm ${column} cho ${updatedCount} sinh viên. Bạn có muốn lưu ngay không?`)) {
        await saveGrades();
    }
}

// ========================================
// MULTI-QUIZ IMPORT FUNCTIONS
// ========================================

/**
 * Handle import from Excel file with multiple Quiz/Lab sheets
 * Sheet names like "Quiz 1", "Quiz 2", "Lab 1" will be mapped to columns like "Quiz1", "Quiz2", "Lab1"
 * Expected format: Column "Đăng nhập" for MSSV, column "Đạt điểm" for score
 */
async function handleMultiQuizImport(event) {
    const file = event.target.files[0];
    event.target.value = '';

    if (!file) return;

    const profile = getCurrentProfile();
    if (!profile || !state.currentProfileId) {
        setImportStatus('⚠️ Vui lòng chọn profile điểm trước khi nhập!', 'warning');
        return;
    }

    if (!classData.students || classData.students.length === 0) {
        setImportStatus('⚠️ Lớp chưa có sinh viên để nhập điểm!', 'warning');
        return;
    }

    try {
        setImportStatus(`📂 Đang đọc file "${file.name}"...`, 'info');

        const workbook = await readExcelWorkbook(file);
        const sheetNames = workbook.SheetNames;

        if (sheetNames.length === 0) {
            throw new Error('File không có sheet nào!');
        }

        // Map sheet names to profile columns
        const profileColumns = Object.keys(profile.weights || {});
        const sheetToColumnMap = {};
        const unmappedSheets = [];

        sheetNames.forEach(sheetName => {
            // Normalize sheet name: "Quiz 1" -> "quiz1", "Lab 2" -> "lab2"
            const normalizedSheet = sheetName.toLowerCase().replace(/\s+/g, '');

            // Find matching profile column
            const matchingColumn = profileColumns.find(col => {
                const normalizedCol = col.toLowerCase().replace(/\s+/g, '');
                return normalizedCol === normalizedSheet ||
                    normalizedSheet.includes(normalizedCol) ||
                    normalizedCol.includes(normalizedSheet);
            });

            if (matchingColumn) {
                sheetToColumnMap[sheetName] = matchingColumn;
            } else {
                unmappedSheets.push(sheetName);
            }
        });

        if (Object.keys(sheetToColumnMap).length === 0) {
            throw new Error(`Không tìm thấy sheet nào khớp với các cột trong profile (${profileColumns.join(', ')})`);
        }

        // Process each mapped sheet
        let totalUpdated = 0;
        let totalSkipped = 0;
        const processedColumns = [];
        const notFoundMssvs = new Set();

        for (const [sheetName, columnName] of Object.entries(sheetToColumnMap)) {
            const sheet = workbook.Sheets[sheetName];
            const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });

            if (rows.length < 2) continue;

            // Find MSSV column index (look for "Đăng nhập" or "MSSV")
            const headers = rows[0].map(h => (h || '').toString().toLowerCase().trim());
            let mssvIndex = headers.findIndex(h =>
                h.includes('đăng nhập') || h.includes('login') || h.includes('mssv') || h.includes('masv')
            );

            // If not found, try column index 1 (common position)
            if (mssvIndex === -1 && rows[0].length > 1) {
                mssvIndex = 1;
            }

            // Find score column index (look for "Đạt điểm" or score-related)
            let scoreIndex = headers.findIndex(h =>
                h.includes('đạt điểm') || h.includes('điểm') || h.includes('score') || h.includes('grade')
            );

            // If not found, try column index 2 (common position)
            if (scoreIndex === -1 && rows[0].length > 2) {
                scoreIndex = 2;
            }

            if (mssvIndex === -1 || scoreIndex === -1) continue;

            let sheetUpdated = 0;
            let sheetSkipped = 0;

            // Process data rows
            rows.slice(1).forEach(row => {
                if (!row || row.length === 0) return;

                const rawMssv = row[mssvIndex];
                const rawScore = row[scoreIndex];

                if (!rawMssv) {
                    sheetSkipped++;
                    return;
                }

                const mssv = rawMssv.toString().trim().toUpperCase();
                const score = parseFloat(rawScore);

                if (Number.isNaN(score)) {
                    sheetSkipped++;
                    return;
                }

                // Find student
                const student = classData.students.find(s =>
                    (s.mssv || '').toString().trim().toUpperCase() === mssv
                );

                if (!student) {
                    notFoundMssvs.add(mssv);
                    sheetSkipped++;
                    return;
                }

                // Apply score (clamp to 0-100)
                const clampedScore = Math.min(Math.max(score, 0), 100);
                ensureStudentGrade(student.mssv);
                state.grades[student.mssv][columnName] = clampedScore;
                sheetUpdated++;
            });

            totalUpdated += sheetUpdated;
            totalSkipped += sheetSkipped;

            if (sheetUpdated > 0) {
                processedColumns.push(`${columnName} (${sheetUpdated} SV)`);
            }
        }

        if (totalUpdated === 0) {
            throw new Error('Không nhập được dữ liệu nào. Kiểm tra lại định dạng file và MSSV.');
        }

        // Mark dirty and re-render
        markDirty();
        renderGradesTable();
        updateSummary();

        // Build status message
        let statusMsg = `Đã nhập điểm cho ${processedColumns.length} cột: ${processedColumns.join(', ')}`;
        if (unmappedSheets.length > 0) {
            statusMsg += ` | Bỏ qua sheet: ${unmappedSheets.join(', ')}`;
        }
        if (notFoundMssvs.size > 0) {
            const notFoundList = Array.from(notFoundMssvs).slice(0, 5);
            statusMsg += ` | MSSV không tìm thấy: ${notFoundList.join(', ')}${notFoundMssvs.size > 5 ? '...' : ''}`;
        }
        setImportStatus(statusMsg, 'success');

        // Auto-save after multi-quiz import
        if (confirm(`Đã nhập ${totalUpdated} điểm từ ${processedColumns.length} cột. Bạn có muốn lưu ngay không?`)) {
            await saveGrades();
        }

    } catch (error) {
        console.error('Multi-quiz import error:', error);
        setImportStatus(`❌ Lỗi nhập file: ${error.message}`, 'error');
    }
}

/**
 * Read Excel file and return workbook object
 */
function readExcelWorkbook(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                resolve(workbook);
            } catch (err) {
                reject(err);
            }
        };
        reader.onerror = reject;
        reader.readAsArrayBuffer(file);
    });
}

async function saveGrades() {
    if (!state.currentProfileId) {
        alert('Vui lòng chọn profile trước khi lưu.');
        return;
    }

    if (state.isSaving) return;

    try {
        state.isSaving = true;
        updateSaveButtonState(true);

        const payload = {
            classId: classData.classId,
            name: classData.name,
            description: classData.description,
            students: classData.students,
            grades: {
                profileId: state.currentProfileId,
                students: state.grades
            }
        };

        const response = await fetch(`/api/classes/${classData.classId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Không thể lưu lớp học');
        }

        const result = await response.json();
        if (result.success) {
            state.original.profileId = state.currentProfileId;
            state.original.grades = JSON.parse(JSON.stringify(state.grades));
            state.isDirty = false;
            alert('Đã lưu điểm thành công!');

            const updatedAtEl = document.getElementById('classDetailUpdatedAt');
            if (updatedAtEl) {
                updatedAtEl.textContent = new Date().toLocaleString('vi-VN');
            }
        } else {
            throw new Error(result.message || 'Không thể lưu lớp học');
        }
    } catch (error) {
        console.error('Error saving class detail:', error);
        alert('Lỗi lưu điểm: ' + error.message);
    } finally {
        state.isSaving = false;
        updateSaveButtonState();
    }
}

function updateSaveButtonState(isSaving = false) {
    if (!elements.saveBtn) return;
    elements.saveBtn.disabled = isSaving || !state.isDirty;
    elements.saveBtn.innerHTML = isSaving
        ? '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>Đang lưu...'
        : '<i class="bi bi-save me-1"></i> Lưu thay đổi';
}

document.addEventListener('DOMContentLoaded', init);
