// ========================================
// TAB MANAGEMENT
// ========================================
// Note: switchTab function is now defined at the end of the file with data loading

// ========================================
// UTILITY FUNCTIONS
// ========================================

// Safe DOM element getter
function getElement(id) {
    const element = document.getElementById(id);
    if (!element) {
        console.warn(`Element with id '${id}' not found`);
    }
    return element;
}

// Safe set innerHTML
function setHTML(id, html) {
    const element = getElement(id);
    if (element) element.innerHTML = html;
}

// Safe set textContent
function setText(id, text) {
    const element = getElement(id);
    if (element) element.textContent = text;
}

// Safe set value
function setValue(id, value) {
    const element = getElement(id);
    if (element) element.value = value;
}

// Safe get value
function getValue(id, defaultValue = '') {
    const element = getElement(id);
    return element ? element.value : defaultValue;
}

// ========================================
// API HELPERS
// ========================================

const API = {
    // Profile APIs
    async getProfiles() {
        const response = await fetch('/api/profiles');
        const data = await response.json();
        return data.success ? data.data : [];
    },

    async createProfile(profileData) {
        const response = await fetch('/api/profiles', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(profileData)
        });
        const data = await response.json();
        return data;
    },

    async updateProfile(profileId, profileData) {
        const response = await fetch(`/api/profiles/${profileId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(profileData)
        });
        const data = await response.json();
        return data;
    },

    async deleteProfile(profileId) {
        const response = await fetch(`/api/profiles/${profileId}`, {
            method: 'DELETE'
        });
        const data = await response.json();
        return data;
    },

    // Class APIs
    async getClasses() {
        const response = await fetch('/api/classes');
        const data = await response.json();
        return data.success ? data.data : [];
    },

    async createClass(classData) {
        const response = await fetch('/api/classes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(classData)
        });
        const data = await response.json();
        return data;
    },

    async updateClass(classId, classData) {
        const response = await fetch(`/api/classes/${classId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(classData)
        });
        const data = await response.json();
        return data;
    },

    async deleteClass(classId) {
        const response = await fetch(`/api/classes/${classId}`, {
            method: 'DELETE'
        });
        const data = await response.json();
        return data;
    }
};

// ========================================
// GLOBAL VARIABLES
// ========================================

// Quản lý profiles trọng số
let profiles = {};
let currentProfile = 'default';
let weights = {};
let passThreshold = 3;

let processedData = [];
let matchedColumns = {}; // Lưu các cột đã khớp để hiển thị
let classListData = []; // Lưu danh sách lớp để tạo template

// Quản lý lớp học
let classes = {};
let currentClass = '';

// Khởi tạo profiles mặc định
async function initDefaultProfiles() {
    try {
        // Load profiles from MongoDB API
        const apiProfiles = await API.getProfiles();

        if (apiProfiles && apiProfiles.length > 0) {
            // Convert array to object keyed by profileId
            profiles = {};
            apiProfiles.forEach(profile => {
                profiles[profile.profileId] = {
                    profileId: profile.profileId,
                    name: profile.name,
                    passThreshold: profile.passThreshold,
                    weights: profile.weights
                };
            });

            // Set default as current if not set
            if (!currentProfile && profiles['default']) {
                currentProfile = 'default';
            }
        }

        loadProfile();
        updateProfileSelect();
    } catch (error) {
        console.error('Error loading profiles from API:', error);
        // Fallback to localStorage if API fails
        const saved = localStorage.getItem('gradeProfiles');
        if (saved) {
            profiles = JSON.parse(saved);
            loadProfile();
            updateProfileSelect();
        }
    }
}

async function saveProfiles() {
    // Deprecated - profiles now saved via API
    console.warn('saveProfiles() is deprecated');
}

function loadProfile() {
    const select = document.getElementById('profileSelect');
    if (select && select.value) {
        currentProfile = select.value;
    }

    const profile = profiles[currentProfile];
    if (profile) {
        weights = { ...profile.weights };
        passThreshold = profile.passThreshold || 3;
        localStorage.setItem('currentProfile', currentProfile);
        updateWeightSummary();
    }
}

function updateProfileSelect() {
    // Update all profile select dropdowns in the interface
    const selects = [
        document.getElementById('profileSelect'),
        document.getElementById('gradeProfileSelect'),
        document.getElementById('templateProfileSelect')
    ];

    selects.forEach(select => {
        if (!select) return;

        select.innerHTML = '';
        for (const [key, profile] of Object.entries(profiles)) {
            const option = document.createElement('option');
            option.value = key;
            option.textContent = profile.name;
            if (key === currentProfile) {
                option.selected = true;
            }
            select.appendChild(option);
        }
    });
}

function updateWeightSummary() {
    const total = Object.values(weights).reduce((sum, w) => sum + w, 0);
    const profile = profiles[currentProfile];
    const element = document.getElementById('currentWeightSummary');
    if (element) {
        element.innerHTML =
            `Đang sử dụng: <strong>${profile.name}</strong> - Tổng: ${total.toFixed(1)}% - Qua môn: ≥${passThreshold} điểm`;
    }
}

// Chỉnh sửa trọng số
function openWeightEditor() {
    const profile = profiles[currentProfile];
    setValue('profileName', profile.name);
    setValue('passThreshold', profile.passThreshold || 3);

    // Populate dropdown sao chép profile
    populateCopyProfileDropdown();

    renderWeightEditor();
    document.getElementById('weightModal').classList.add('show');
}

function populateCopyProfileDropdown() {
    const select = document.getElementById('copyFromProfile');
    select.innerHTML = '<option value="">-- Chọn profile để sao chép --</option>';

    for (const [key, profile] of Object.entries(profiles)) {
        if (key !== currentProfile) {
            const option = document.createElement('option');
            option.value = key;
            option.textContent = profile.name;
            select.appendChild(option);
        }
    }
}

function copyFromProfile() {
    const select = document.getElementById('copyFromProfile');
    const sourceProfileId = select.value;

    if (!sourceProfileId) {
        alert('Vui lòng chọn profile để sao chép!');
        return;
    }

    const sourceProfile = profiles[sourceProfileId];
    if (!sourceProfile) {
        alert('Không tìm thấy profile!');
        return;
    }

    document.getElementById('passThreshold').value = sourceProfile.passThreshold || 3;

    const editor = document.getElementById('weightEditor');
    editor.innerHTML = '';

    for (const [key, value] of Object.entries(sourceProfile.weights)) {
        addWeightRowWithData(key, value);
    }

    calculateTotalWeight();
    select.value = '';
    alert(`Đã sao chép cấu hình từ "${sourceProfile.name}"!\nBạn có thể chỉnh sửa thêm trước khi lưu.`);
}

function closeWeightEditor() {
    document.getElementById('weightModal').classList.remove('show');
}

function renderWeightEditor() {
    const editor = document.getElementById('weightEditor');
    editor.innerHTML = '';

    const profile = profiles[currentProfile];
    for (const [key, value] of Object.entries(profile.weights)) {
        addWeightRowWithData(key, value);
    }
    calculateTotalWeight();
}

function addWeightRow() {
    addWeightRowWithData('', 0);
}

function addWeightRowWithData(name, weight) {
    const editor = document.getElementById('weightEditor');
    const row = document.createElement('div');
    row.className = 'weight-row';
    row.innerHTML = `
        <input type="text" placeholder="Tên cột (VD: Lab 1)" value="${name}" class="weight-name">
        <input type="number" placeholder="Trọng số (%)" value="${weight}" step="0.1" class="weight-value" oninput="calculateTotalWeight()">
        <button onclick="removeWeightRow(this)">Xóa</button>
    `;
    editor.appendChild(row);
    calculateTotalWeight();
}

function removeWeightRow(btn) {
    btn.parentElement.remove();
    calculateTotalWeight();
}

function calculateTotalWeight() {
    const rows = document.querySelectorAll('.weight-row');
    let total = 0;
    rows.forEach(row => {
        const value = parseFloat(row.querySelector('.weight-value').value) || 0;
        total += value;
    });
    setText('totalWeight', total.toFixed(1));
}

function saveWeightProfile() {
    const name = document.getElementById('profileName').value.trim();
    const threshold = parseFloat(document.getElementById('passThreshold').value) || 3;

    if (!name) {
        alert('Vui lòng nhập tên profile!');
        return;
    }

    const rows = document.querySelectorAll('.weight-row');
    const newWeights = {};
    rows.forEach(row => {
        const key = row.querySelector('.weight-name').value.trim();
        const value = parseFloat(row.querySelector('.weight-value').value) || 0;
        if (key) {
            newWeights[key] = value;
        }
    });

    profiles[currentProfile] = {
        name: name,
        passThreshold: threshold,
        weights: newWeights
    };

    saveProfiles();
    loadProfile();
    updateProfileSelect();
    closeWeightEditor();
    alert('Đã lưu profile thành công!');
}

function createNewProfile() {
    const name = prompt('Nhập tên profile mới:');
    if (!name) return;

    const id = 'profile_' + Date.now();
    profiles[id] = {
        name: name,
        passThreshold: 3,
        weights: {}
    };

    currentProfile = id;
    saveProfiles();
    updateProfileSelect();
    openWeightEditor();
}

function duplicateCurrentProfile() {
    const sourceProfile = profiles[currentProfile];
    const newName = prompt(`Nhập tên cho bản sao của "${sourceProfile.name}":`, `${sourceProfile.name} (Copy)`);

    if (!newName) return;

    const id = 'profile_' + Date.now();
    profiles[id] = {
        name: newName,
        passThreshold: sourceProfile.passThreshold,
        weights: { ...sourceProfile.weights }
    };

    currentProfile = id;
    saveProfiles();
    updateProfileSelect();
    loadProfile();

    alert(`Đã tạo bản sao "${newName}"!\nBạn có thể chỉnh sửa nó bằng nút "✏️ Chỉnh sửa".`);
}

function deleteProfile() {
    if (currentProfile === 'default') {
        alert('Không thể xóa profile mặc định!');
        return;
    }

    if (confirm('Bạn có chắc muốn xóa profile này?')) {
        delete profiles[currentProfile];
        currentProfile = 'default';
        saveProfiles();
        updateProfileSelect();
        loadProfile();
        closeWeightEditor();
    }
}

function exportConfig() {
    const data = JSON.stringify(profiles, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `grade_config_${new Date().getTime()}.json`;
    a.click();
    URL.revokeObjectURL(url);
}

function importConfig(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (e) {
        try {
            const imported = JSON.parse(e.target.result);
            if (confirm('Import cấu hình sẽ ghi đè tất cả profiles hiện tại. Bạn có chắc chắn?')) {
                profiles = imported;
                saveProfiles();
                currentProfile = 'default';
                updateProfileSelect();
                loadProfile();
                alert('Import thành công!');
            }
        } catch (error) {
            alert('Lỗi: File không hợp lệ!');
        }
    };
    reader.readAsText(file);
    event.target.value = '';
}

// Xử lý upload danh sách lớp
async function handleClassListUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    document.getElementById('classListFileName').textContent = `📄 ${file.name}`;

    const formData = new FormData();
    formData.append('classListFile', file);

    try {
        const response = await fetch('/api/upload-classlist', {
            method: 'POST',
            body: formData
        });

        const result = await response.json();
        if (result.success) {
            parseClassList(result.data);
        } else {
            alert('Lỗi: ' + result.error);
        }
    } catch (error) {
        alert('Lỗi kết nối server: ' + error.message);
    }
}

function parseClassList(data) {
    if (data.length < 2) {
        alert('File không có dữ liệu hợp lệ!');
        classListData = [];
        document.getElementById('generateTemplateBtn').disabled = true;
        return;
    }

    const headers = data[0];

    const mssvIndex = headers.findIndex(h => {
        if (!h) return false;
        const normalized = normalizeString(h);
        return normalized.includes('mssv') ||
            normalized.includes('masinhvien') ||
            normalized.includes('masv') ||
            normalized === 'masinhvien' ||
            normalized === 'ma';
    });

    const nameIndex = headers.findIndex(h => {
        if (!h) return false;
        const normalized = normalizeString(h);
        return normalized.includes('ten') ||
            normalized.includes('hova') ||
            normalized.includes('hovaten') ||
            normalized.includes('ho') ||
            normalized === 'ten' ||
            normalized === 'hovaten';
    });

    if (mssvIndex === -1 || nameIndex === -1) {
        const headerList = headers.filter(h => h).map((h, i) => `${i}: "${h}"`).join('\n');
        alert(`Không tìm thấy cột MSSV hoặc Họ tên!\n\nCác cột tìm thấy:\n${headerList}\n\nVui lòng đảm bảo file có:\n- Cột chứa "MSSV"\n- Cột chứa "Họ và tên"`);
        classListData = [];
        document.getElementById('generateTemplateBtn').disabled = true;
        return;
    }

    classListData = [];
    for (let i = 1; i < data.length; i++) {
        const row = data[i];
        if (!row || row.length === 0) continue;

        const mssv = row[mssvIndex] || '';
        const name = row[nameIndex] || '';

        if (mssv) {
            classListData.push({ mssv, name });
        }
    }

    if (classListData.length === 0) {
        alert('Không tìm thấy sinh viên nào trong file!');
        document.getElementById('generateTemplateBtn').disabled = true;
        return;
    }

    document.getElementById('generateTemplateBtn').disabled = false;
    alert(`Đã tải danh sách ${classListData.length} sinh viên!\nClick "Tạo Template Excel" để tạo file mẫu.`);
}

async function generateTemplate() {
    const source = document.querySelector('input[name="templateSource"]:checked').value;

    let students = [];
    if (source === 'class') {
        if (!currentClass || !classes[currentClass]) {
            alert('Vui lòng chọn lớp trước!');
            return;
        }
        students = classes[currentClass].students || [];
    } else {
        students = classListData;
    }

    if (students.length === 0) {
        alert('Danh sách sinh viên trống!');
        return;
    }

    const profile = profiles[currentProfile];
    if (!profile || Object.keys(profile.weights).length === 0) {
        alert('Profile hiện tại không có cột điểm nào!\nVui lòng chỉnh sửa profile và thêm các cột điểm.');
        return;
    }

    try {
        const response = await fetch('/api/generate-template', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                students: students,
                weights: profile.weights,
                profileName: profile.name
            })
        });

        if (response.ok) {
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Template_${profile.name.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}.xlsx`;
            a.click();
            window.URL.revokeObjectURL(url);

            alert(`Đã tạo template thành công!\n\nSố sinh viên: ${students.length}\nSố cột điểm: ${Object.keys(profile.weights).length}`);
        } else {
            const error = await response.json();
            alert('Lỗi: ' + error.error);
        }
    } catch (error) {
        alert('Lỗi kết nối server: ' + error.message);
    }
}

// Quản lý lớp học
async function initClasses() {
    try {
        // Load classes from MongoDB API
        const apiClasses = await API.getClasses();

        if (apiClasses && apiClasses.length > 0) {
            // Convert array to object keyed by classId
            classes = {};
            apiClasses.forEach(cls => {
                classes[cls.classId] = {
                    classId: cls.classId,
                    name: cls.name,
                    description: cls.description || '',
                    students: cls.students || [],
                    grades: cls.grades || null,  // Load grades data
                    createdAt: cls.createdAt,
                    updatedAt: cls.updatedAt
                };
            });
        }

        updateClassSelect();
    } catch (error) {
        console.error('Error loading classes from API:', error);
        // Fallback to localStorage if API fails
        const saved = localStorage.getItem('classes');
        if (saved) {
            classes = JSON.parse(saved);
            updateClassSelect();
        }
    }
}

async function saveClasses() {
    // Deprecated - classes now saved via API
    console.warn('saveClasses() is deprecated');
}

function updateClassSelect() {
    // Update all class select dropdowns in the interface
    const selects = [
        document.getElementById('classSelect'),
        document.getElementById('templateClassSelect')
    ];

    selects.forEach(select => {
        if (!select) return;

        select.innerHTML = '<option value="">-- Chọn lớp --</option>';

        for (const [key, classData] of Object.entries(classes)) {
            const option = document.createElement('option');
            option.value = key;
            option.textContent = classData.name;
            if (key === currentClass) {
                option.selected = true;
            }
            select.appendChild(option);
        }
    });

    updateGenerateButtonState();
}

function loadClass() {
    const select = document.getElementById('classSelect');
    if (!select) return;

    currentClass = select.value;

    if (currentClass && classes[currentClass]) {
        const classData = classes[currentClass];
        classListData = classData.students || [];

        const classInfo = document.getElementById('classInfo');
        const classDetails = document.getElementById('classDetails');

        if (classInfo) classInfo.style.display = 'block';
        if (classDetails) {
            classDetails.textContent =
                `${classData.name} - ${classData.description || ''} (${classListData.length} sinh viên)`;
        }
    } else {
        classListData = [];
        const classInfo = document.getElementById('classInfo');
        if (classInfo) classInfo.style.display = 'none';
    }

    updateGenerateButtonState();
}

async function createNewClass() {
    const name = prompt('Nhập tên lớp (VD: SE1801):');
    if (!name) return;

    const id = 'class_' + Date.now();
    const classData = {
        classId: id,
        name: name,
        description: '',
        students: []
    };

    try {
        // Create in MongoDB via API
        const result = await API.createClass(classData);

        if (result.success) {
            // Update local cache
            classes[id] = classData;
            currentClass = id;
            updateClassSelect();
            editClass();
        } else {
            alert('Lỗi tạo lớp: ' + (result.message || 'Unknown error'));
        }
    } catch (error) {
        console.error('Error creating class:', error);
        alert('Lỗi kết nối server: ' + error.message);
    }
}

function editClass() {
    if (!currentClass) {
        alert('Vui lòng chọn lớp trước!');
        return;
    }

    const classData = classes[currentClass];
    document.getElementById('className').value = classData.name;
    document.getElementById('classDescription').value = classData.description || '';

    renderStudentEditor(classData.students || []);
    document.getElementById('classModal').classList.add('show');
}

function closeClassEditor() {
    document.getElementById('classModal').classList.remove('show');
}

function renderStudentEditor(students) {
    const editor = document.getElementById('studentEditor');
    editor.innerHTML = '';

    students.forEach(student => {
        addStudentRowWithData(student.mssv, student.name);
    });

    updateStudentCount();
}

function addStudentRow() {
    addStudentRowWithData('', '');
}

function addStudentRowWithData(mssv, name) {
    const editor = document.getElementById('studentEditor');
    const row = document.createElement('div');
    row.className = 'weight-row';
    row.innerHTML = `
        <input type="text" placeholder="MSSV" value="${mssv}" class="student-mssv">
        <input type="text" placeholder="Họ và tên" value="${name}" class="student-name">
        <button onclick="removeStudentRow(this)">Xóa</button>
    `;
    editor.appendChild(row);
    updateStudentCount();
}

function removeStudentRow(btn) {
    btn.parentElement.remove();
    updateStudentCount();
}

function updateStudentCount() {
    const rows = document.querySelectorAll('#studentEditor .weight-row');
    document.getElementById('totalStudents').textContent = rows.length;
}

async function handleClassStudentUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('classListFile', file);

    try {
        const response = await fetch('/api/upload-classlist', {
            method: 'POST',
            body: formData
        });

        const result = await response.json();
        if (result.success) {
            parseStudentList(result.data);
        } else {
            alert('Lỗi: ' + result.error);
        }
    } catch (error) {
        alert('Lỗi kết nối server: ' + error.message);
    }

    event.target.value = '';
}

function parseStudentList(data) {
    if (data.length < 2) {
        alert('File không có dữ liệu hợp lệ!');
        return;
    }

    const headers = data[0];
    const mssvIndex = headers.findIndex(h => {
        if (!h) return false;
        const normalized = normalizeString(h);
        return normalized.includes('mssv') || normalized.includes('masinhvien') ||
            normalized.includes('masv') || normalized === 'ma';
    });

    const nameIndex = headers.findIndex(h => {
        if (!h) return false;
        const normalized = normalizeString(h);
        return normalized.includes('ten') || normalized.includes('hova') ||
            normalized.includes('hovaten') || normalized.includes('ho');
    });

    if (mssvIndex === -1 || nameIndex === -1) {
        alert('Không tìm thấy cột MSSV hoặc Họ tên!');
        return;
    }

    document.getElementById('studentEditor').innerHTML = '';

    for (let i = 1; i < data.length; i++) {
        const row = data[i];
        if (!row || row.length === 0) continue;

        const mssv = row[mssvIndex] || '';
        const name = row[nameIndex] || '';

        if (mssv) {
            addStudentRowWithData(mssv, name);
        }
    }

    alert(`Đã tải ${document.querySelectorAll('#studentEditor .weight-row').length} sinh viên!`);
}

async function saveClass() {
    if (!currentClass) return;

    const name = document.getElementById('className').value.trim();
    const description = document.getElementById('classDescription').value.trim();

    if (!name) {
        alert('Vui lòng nhập tên lớp!');
        return;
    }

    const rows = document.querySelectorAll('#studentEditor .weight-row');
    const students = [];
    rows.forEach(row => {
        const mssv = row.querySelector('.student-mssv').value.trim();
        const studentName = row.querySelector('.student-name').value.trim();
        if (mssv && studentName) {
            students.push({ mssv, name: studentName });
        }
    });

    const classData = {
        classId: currentClass,
        name: name,
        description: description,
        students: students
    };

    try {
        // Save to MongoDB via API
        const result = await API.updateClass(currentClass, classData);

        if (result.success) {
            // Update local cache
            classes[currentClass] = classData;
            updateClassSelect();
            loadClass();
            closeClassEditor();
            alert(`Đã lưu lớp "${name}" với ${students.length} sinh viên vào MongoDB!`);
        } else {
            alert('Lỗi lưu lớp: ' + (result.message || 'Unknown error'));
        }
    } catch (error) {
        console.error('Error saving class:', error);
        alert('Lỗi kết nối server: ' + error.message);
    }
}

async function deleteClass() {
    if (!currentClass) {
        alert('Vui lòng chọn lớp trước!');
        return;
    }

    const classData = classes[currentClass];
    if (confirm(`Bạn có chắc muốn xóa lớp "${classData.name}"?`)) {
        try {
            // Delete from MongoDB via API
            const result = await API.deleteClass(currentClass);

            if (result.success) {
                // Update local cache
                delete classes[currentClass];
                currentClass = '';
                classListData = [];
                updateClassSelect();
                const classInfo = document.getElementById('classInfo');
                if (classInfo) classInfo.style.display = 'none';
                alert('Đã xóa lớp khỏi MongoDB!');
            } else {
                alert('Lỗi xóa lớp: ' + (result.message || 'Unknown error'));
            }
        } catch (error) {
            console.error('Error deleting class:', error);
            alert('Lỗi kết nối server: ' + error.message);
        }
    }
}

function updateTemplateSource() {
    const source = document.querySelector('input[name="templateSource"]:checked').value;

    if (source === 'class') {
        document.getElementById('classSourceSection').style.display = 'block';
        document.getElementById('uploadSourceSection').style.display = 'none';
    } else {
        document.getElementById('classSourceSection').style.display = 'none';
        document.getElementById('uploadSourceSection').style.display = 'block';
    }

    updateGenerateButtonState();
}

function updateGenerateButtonState() {
    const sourceEl = document.querySelector('input[name="templateSource"]:checked');
    const btn = document.getElementById('generateTemplateBtn');

    if (!sourceEl || !btn) return;

    const source = sourceEl.value;

    if (source === 'class') {
        btn.disabled = !currentClass || !classes[currentClass] ||
            !classes[currentClass].students ||
            classes[currentClass].students.length === 0;
    } else {
        btn.disabled = classListData.length === 0;
    }
}

// Khởi tạo khi load trang
window.addEventListener('DOMContentLoaded', () => {
    try {
        initDefaultProfiles();
        initClasses();
    } catch (error) {
        console.error('Initialization error:', error);
    }
});

// Hàm loại bỏ dấu tiếng Việt
function removeVietnameseTones(str) {
    if (!str) return '';
    str = str.toString();
    str = str.replace(/à|á|ạ|ả|ã|â|ầ|ấ|ậ|ẩ|ẫ|ă|ằ|ắ|ặ|ẳ|ẵ/g, 'a');
    str = str.replace(/è|é|ẹ|ẻ|ẽ|ê|ề|ế|ệ|ể|ễ/g, 'e');
    str = str.replace(/ì|í|ị|ỉ|ĩ/g, 'i');
    str = str.replace(/ò|ó|ọ|ỏ|õ|ô|ồ|ố|ộ|ổ|ỗ|ơ|ờ|ớ|ợ|ở|ỡ/g, 'o');
    str = str.replace(/ù|ú|ụ|ủ|ũ|ư|ừ|ứ|ự|ử|ữ/g, 'u');
    str = str.replace(/ỳ|ý|ỵ|ỷ|ỹ/g, 'y');
    str = str.replace(/đ/g, 'd');
    str = str.replace(/À|Á|Ạ|Ả|Ã|Â|Ầ|Ấ|Ậ|Ẩ|Ẫ|Ă|Ằ|Ắ|Ặ|Ẳ|Ẵ/g, 'A');
    str = str.replace(/È|É|Ẹ|Ẻ|Ẽ|Ê|Ề|Ế|Ệ|Ể|Ễ/g, 'E');
    str = str.replace(/Ì|Í|Ị|Ỉ|Ĩ/g, 'I');
    str = str.replace(/Ò|Ó|Ọ|Ỏ|Õ|Ô|Ồ|Ố|Ộ|Ổ|Ỗ|Ơ|Ờ|Ớ|Ợ|Ở|Ỡ/g, 'O');
    str = str.replace(/Ù|Ú|Ụ|Ủ|Ũ|Ư|Ừ|Ứ|Ự|Ử|Ữ/g, 'U');
    str = str.replace(/Ỳ|Ý|Ỵ|Ỷ|Ỹ/g, 'Y');
    str = str.replace(/Đ/g, 'D');
    return str;
}

// Hàm chuẩn hóa chuỗi để so sánh
function normalizeString(str) {
    if (!str) return '';
    str = removeVietnameseTones(str);
    return str.toString()
        .toLowerCase()
        .replace(/\s+/g, '')
        .replace(/[()%]/g, '')
        .trim();
}

// Hàm tìm kiếm cột điểm dựa trên header
function findScoreColumn(headerStr) {
    const normalized = normalizeString(headerStr);

    // Kiểm tra Lab
    for (let i = 1; i <= 8; i++) {
        const patterns = [
            `lab${i}`,
            `lab${i}3.5`,
            `lab${i}35`
        ];
        if (patterns.some(p => normalized.includes(p))) {
            return { key: `Lab ${i}`, weight: weights[`Lab ${i}`] || 3.5 };
        }
    }

    // Kiểm tra Quiz
    for (let i = 1; i <= 8; i++) {
        const patterns = [
            `quiz${i}`,
            `quiz${i}1.5`,
            `quiz${i}15`
        ];
        if (patterns.some(p => normalized.includes(p))) {
            return { key: `Quiz ${i}`, weight: weights[`Quiz ${i}`] || 1.5 };
        }
    }

    // Kiểm tra GD/Assignment
    for (let i = 1; i <= 2; i++) {
        const patterns = [
            `gd${i}`,
            `assignment`,
            `danhgia`
        ];
        if (normalized.includes(String(i)) &&
            (patterns.some(p => normalized.includes(p)))) {
            return { key: `GD ${i}`, weight: weights[`GD ${i}`] || 10 };
        }
        if (normalized === `gd${i}`) {
            return { key: `GD ${i}`, weight: weights[`GD ${i}`] || 10 };
        }
    }

    return null;
}

async function handleFile(event) {
    const file = event.target.files[0];
    if (!file) return;

    document.getElementById('fileName').textContent = `📄 ${file.name}`;

    const formData = new FormData();
    formData.append('gradeFile', file);

    try {
        const response = await fetch('/api/upload-grades', {
            method: 'POST',
            body: formData
        });

        const result = await response.json();
        if (result.success) {
            processData(result.data);
        } else {
            alert('Lỗi: ' + result.error);
        }
    } catch (error) {
        alert('Lỗi kết nối server: ' + error.message);
    }
}

function processData(data) {
    if (data.length < 2) {
        alert('File không có dữ liệu hợp lệ!');
        return;
    }

    const headers = data[0];
    const results = [];
    let passedCount = 0;
    let failedCount = 0;
    matchedColumns = {};

    const mssvIndex = headers.findIndex(h => {
        if (!h) return false;
        const normalized = normalizeString(h);
        return normalized.includes('mssv') ||
            normalized.includes('masinhvien') ||
            normalized.includes('masv') ||
            normalized === 'masinhvien' ||
            normalized === 'ma';
    });

    const nameIndex = headers.findIndex(h => {
        if (!h) return false;
        const normalized = normalizeString(h);
        return normalized.includes('ten') ||
            normalized.includes('hova') ||
            normalized.includes('hovaten') ||
            normalized.includes('ho') ||
            normalized === 'ten' ||
            normalized === 'hovaten';
    });

    if (mssvIndex === -1 || nameIndex === -1) {
        const headerList = headers.filter(h => h).map((h, i) => `${i}: "${h}"`).join('\n');
        alert(`Không tìm thấy cột MSSV hoặc Họ tên!\n\nCác cột tìm thấy trong file:\n${headerList}\n\nVui lòng đảm bảo file có:\n- Cột chứa "MSSV" hoặc "Mã sinh viên"\n- Cột chứa "Họ và tên" hoặc "Tên"`);
        return;
    }

    for (let i = 1; i < data.length; i++) {
        const row = data[i];
        if (!row || row.length === 0) continue;

        const mssv = row[mssvIndex] || '';
        const name = row[nameIndex] || '';

        if (!mssv) continue;

        let totalScore = 0;
        let scoreDetails = {};

        for (let j = 0; j < headers.length; j++) {
            const header = headers[j];
            if (!header) continue;

            const scoreColumn = findScoreColumn(header);
            if (scoreColumn) {
                const score = parseFloat(row[j]) || 0;
                const scoreRatio = score / 100;
                const weightedScore = scoreRatio * scoreColumn.weight;
                totalScore += weightedScore;
                scoreDetails[scoreColumn.key] = score;

                if (!matchedColumns[scoreColumn.key]) {
                    matchedColumns[scoreColumn.key] = header.toString();
                }
            }
        }

        const passed = totalScore >= passThreshold;
        if (passed) passedCount++;
        else failedCount++;

        results.push({
            mssv,
            name,
            totalScore: totalScore.toFixed(2),
            passed,
            scoreDetails
        });
    }

    processedData = results;
    displayResults(results, passedCount, failedCount);
    displayMatchedColumns();
}

function displayResults(results, passedCount, failedCount) {
    const totalCount = results.length;
    const passRate = totalCount > 0 ? ((passedCount / totalCount) * 100).toFixed(1) : 0;

    document.getElementById('totalStudents').textContent = totalCount;
    document.getElementById('passedStudents').textContent = passedCount;
    document.getElementById('failedStudents').textContent = failedCount;
    document.getElementById('passRate').textContent = passRate + '%';

    const tbody = document.getElementById('resultsBody');
    tbody.innerHTML = '';

    results.forEach((student, index) => {
        const tr = document.createElement('tr');
        tr.className = student.passed ? 'pass' : 'fail';

        tr.innerHTML = `
            <td>${index + 1}</td>
            <td>${student.mssv}</td>
            <td>${student.name}</td>
            <td><strong>${student.totalScore}</strong></td>
            <td>
                <span class="status-badge ${student.passed ? 'badge-pass' : 'badge-fail'}">
                    ${student.passed ? '✓ Đạt' : '✗ Chưa đạt'}
                </span>
            </td>
        `;

        tbody.appendChild(tr);
    });

    document.getElementById('resultsSection').classList.remove('hidden');
}

function displayMatchedColumns() {
    const weightsGrid = document.querySelector('.weights-grid');
    weightsGrid.innerHTML = '';

    const allColumns = Object.keys(weights).sort((a, b) => {
        const getOrder = (key) => {
            if (key.includes('Lab')) return 1;
            if (key.includes('Quiz')) return 2;
            if (key.includes('GD')) return 3;
            return 4;
        };
        const orderDiff = getOrder(a) - getOrder(b);
        if (orderDiff !== 0) return orderDiff;
        const numA = parseInt(a.match(/\d+/)?.[0] || 0);
        const numB = parseInt(b.match(/\d+/)?.[0] || 0);
        return numA - numB;
    });

    let totalMatched = 0;
    allColumns.forEach(key => {
        const div = document.createElement('div');
        div.className = 'weight-item';
        const matched = matchedColumns[key];
        if (matched) {
            div.innerHTML = `<strong>${key}:</strong> ${weights[key]}% <span style="color: green;">✓ (${matched})</span>`;
            div.style.background = '#d4edda';
            totalMatched++;
        } else {
            div.innerHTML = `<strong>${key}:</strong> ${weights[key]}% <span style="color: red;">✗ Không tìm thấy</span>`;
            div.style.background = '#f8d7da';
        }
        weightsGrid.appendChild(div);
    });

    const weightsTitle = document.querySelector('.weights-info h3');
    const totalWeight = Object.keys(matchedColumns).length > 0
        ? Object.keys(matchedColumns).reduce((sum, key) => sum + weights[key], 0)
        : 0;
    weightsTitle.innerHTML = `📊 Thông tin trọng số điểm (Đã khớp: ${totalMatched}/${allColumns.length} cột - ${totalWeight.toFixed(1)}%)`;
}

async function exportResults() {
    if (processedData.length === 0) {
        alert('Không có dữ liệu để xuất!');
        return;
    }

    try {
        const response = await fetch('/api/export-results', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                results: processedData
            })
        });

        if (response.ok) {
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Ket_qua_hoc_tap_${Date.now()}.xlsx`;
            a.click();
            window.URL.revokeObjectURL(url);
        } else {
            const error = await response.json();
            alert('Lỗi: ' + error.error);
        }
    } catch (error) {
        alert('Lỗi kết nối server: ' + error.message);
    }
}

// ========================================
// RENDER PROFILES LIST
// ========================================

async function renderProfilesList() {
    const container = document.getElementById('profilesList');

    if (!container) return;

    try {
        container.innerHTML = '<p style="color: #666; text-align: center; padding: 40px;">Đang tải danh sách profiles...</p>';

        const apiProfiles = await API.getProfiles();

        if (!apiProfiles || apiProfiles.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 40px; color: #666;">
                    <p style="font-size: 1.2em; margin-bottom: 10px;">📋 Chưa có profile nào</p>
                    <p>Nhấn "➕ Tạo Profile mới" để bắt đầu</p>
                </div>
            `;
            return;
        }

        // Render profiles as cards
        let html = '<div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(350px, 1fr)); gap: 20px;">';

        apiProfiles.forEach(profile => {
            const totalWeight = Object.values(profile.weights).reduce((sum, w) => sum + w, 0);
            const weightCount = Object.keys(profile.weights).length;
            const isDefault = profile.profileId === 'default';

            html += `
                <div class="profile-card" style="background: white; border: 2px solid ${isDefault ? '#667eea' : '#ddd'}; border-radius: 10px; padding: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                    <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 15px;">
                        <div>
                            <h3 style="margin: 0 0 5px 0; color: #333;">
                                ${isDefault ? '⭐ ' : ''}${profile.name}
                            </h3>
                            <p style="margin: 0; color: #666; font-size: 0.9em;">
                                ${weightCount} cột điểm • ${totalWeight.toFixed(1)}%
                            </p>
                        </div>
                        ${isDefault ? '<span style="background: #667eea; color: white; padding: 4px 12px; border-radius: 20px; font-size: 0.8em;">Mặc định</span>' : ''}
                    </div>
                    
                    <div style="margin: 15px 0; padding: 10px; background: #f8f9fa; border-radius: 5px;">
                        <p style="margin: 0; font-size: 0.9em; color: #666;">
                            <strong>Ngưỡng qua môn:</strong> ≥ ${profile.passThreshold} điểm
                        </p>
                    </div>

                    <div style="margin: 15px 0;">
                        <strong style="font-size: 0.9em; color: #666;">Trọng số:</strong>
                        <div style="max-height: 150px; overflow-y: auto; margin-top: 8px; font-size: 0.85em;">
                            ${Object.entries(profile.weights)
                    .sort((a, b) => {
                        const getOrder = (key) => {
                            if (key.includes('Lab')) return 1;
                            if (key.includes('Quiz')) return 2;
                            if (key.includes('GD')) return 3;
                            return 4;
                        };
                        return getOrder(a[0]) - getOrder(b[0]);
                    })
                    .map(([key, value]) => `
                                    <div style="display: flex; justify-content: space-between; padding: 4px 0; border-bottom: 1px solid #eee;">
                                        <span>${key}</span>
                                        <span style="font-weight: bold;">${value}%</span>
                                    </div>
                                `).join('')}
                        </div>
                    </div>

                    <div style="display: flex; gap: 10px; margin-top: 15px;">
                        <button class="btn btn-primary" onclick="editProfile('${profile.profileId}')" style="flex: 1; padding: 8px;">
                            ✏️ Chỉnh sửa
                        </button>
                        <button class="btn" onclick="duplicateProfile('${profile.profileId}')" style="flex: 1; padding: 8px; background: #17a2b8; color: white;">
                            📋 Sao chép
                        </button>
                        ${!isDefault ? `
                            <button class="btn" onclick="deleteProfileById('${profile.profileId}')" style="padding: 8px; background: #dc3545; color: white;">
                                🗑️
                            </button>
                        ` : ''}
                    </div>
                </div>
            `;
        });

        html += '</div>';
        container.innerHTML = html;

    } catch (error) {
        console.error('Error rendering profiles list:', error);
        container.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #dc3545;">
                <p style="font-size: 1.2em; margin-bottom: 10px;">❌ Không thể tải danh sách profiles</p>
                <p style="margin-bottom: 20px;">${error.message}</p>
                <button class="btn btn-primary" onclick="renderProfilesList()">🔄 Thử lại</button>
            </div>
        `;
    }
}

// ========================================
// RENDER CLASSES LIST
// ========================================

async function renderClassesList() {
    const container = document.getElementById('classesList');

    if (!container) return;

    try {
        container.innerHTML = '<p style="color: #666; text-align: center; padding: 40px;">Đang tải danh sách lớp học...</p>';

        const apiClasses = await API.getClasses();

        if (!apiClasses || apiClasses.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 40px; color: #666;">
                    <p style="font-size: 1.2em; margin-bottom: 10px;">👥 Chưa có lớp học nào</p>
                    <p>Nhấn "➕ Tạo lớp mới" để bắt đầu</p>
                </div>
            `;
            return;
        }

        // Render classes as cards
        let html = '<div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(350px, 1fr)); gap: 20px;">';

        apiClasses.forEach(cls => {
            const studentCount = cls.students ? cls.students.length : 0;

            html += `
                <div class="class-card" style="background: white; border: 2px solid #ddd; border-radius: 10px; padding: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                    <div style="margin-bottom: 15px;">
                        <h3 style="margin: 0 0 5px 0; color: #333;">
                            👥 ${cls.name}
                        </h3>
                        ${cls.description ? `
                            <p style="margin: 5px 0; color: #666; font-size: 0.9em;">
                                ${cls.description}
                            </p>
                        ` : ''}
                    </div>
                    
                    <div style="margin: 15px 0; padding: 15px; background: #f8f9fa; border-radius: 5px; text-align: center;">
                        <div style="font-size: 2em; font-weight: bold; color: #667eea; margin-bottom: 5px;">
                            ${studentCount}
                        </div>
                        <div style="font-size: 0.9em; color: #666;">
                            sinh viên
                        </div>
                    </div>

                    ${studentCount > 0 ? `
                        <div style="margin: 15px 0; max-height: 150px; overflow-y: auto; font-size: 0.85em; background: #f8f9fa; padding: 10px; border-radius: 5px;">
                            <strong style="color: #666;">Danh sách sinh viên:</strong>
                            ${cls.students.slice(0, 5).map(student => `
                                <div style="padding: 4px 0; border-bottom: 1px solid #eee;">
                                    ${student.mssv} - ${student.name}
                                </div>
                            `).join('')}
                            ${studentCount > 5 ? `
                                <div style="padding: 8px 0; color: #666; font-style: italic;">
                                    ... và ${studentCount - 5} sinh viên khác
                                </div>
                            ` : ''}
                        </div>
                    ` : `
                        <div style="margin: 15px 0; padding: 15px; background: #fff3cd; border-radius: 5px; text-align: center; color: #856404; font-size: 0.9em;">
                            ⚠️ Lớp chưa có sinh viên
                        </div>
                    `}

                    <div style="display: flex; gap: 10px; margin-top: 15px;">
                        <button class="btn btn-primary" onclick="editClassById('${cls.classId}')" style="flex: 1; padding: 8px;">
                            ✏️ Chỉnh sửa
                        </button>
                        <button class="btn" onclick="showClassDetailView('${cls.classId}')" style="flex: 1; padding: 8px; background: #17a2b8; color: white;">
                            👁️ Xem chi tiết
                        </button>
                        <button class="btn" onclick="deleteClassById('${cls.classId}')" style="padding: 8px; background: #dc3545; color: white;">
                            🗑️
                        </button>
                    </div>
                </div>
            `;
        });

        html += '</div>';
        container.innerHTML = html;

    } catch (error) {
        console.error('Error rendering classes list:', error);
        container.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #dc3545;">
                <p style="font-size: 1.2em; margin-bottom: 10px;">❌ Không thể tải danh sách lớp học</p>
                <p style="margin-bottom: 20px;">${error.message}</p>
                <button class="btn btn-primary" onclick="renderClassesList()">🔄 Thử lại</button>
            </div>
        `;
    }
}

// ========================================
// PROFILE MANAGEMENT FUNCTIONS
// ========================================

async function editProfile(profileId) {
    try {
        const profile = profiles[profileId];
        if (!profile) {
            alert('Không tìm thấy profile!');
            return;
        }

        currentProfile = profileId;

        document.getElementById('profileName').value = profile.name;
        document.getElementById('passThreshold').value = profile.passThreshold || 3;

        const editor = document.getElementById('weightEditor');
        editor.innerHTML = '';

        for (const [key, value] of Object.entries(profile.weights)) {
            addWeightRowWithData(key, value);
        }

        calculateTotalWeight();

        // Show/hide delete button
        const deleteBtn = document.getElementById('deleteProfileBtn');
        if (deleteBtn) {
            deleteBtn.style.display = profileId === 'default' ? 'none' : 'inline-block';
        }

        const modal = new bootstrap.Modal(document.getElementById('profileModal'));
        modal.show();
    } catch (error) {
        console.error('Error editing profile:', error);
        alert('Lỗi: ' + error.message);
    }
}

async function duplicateProfile(profileId) {
    try {
        const sourceProfile = profiles[profileId];
        if (!sourceProfile) {
            alert('Không tìm thấy profile!');
            return;
        }

        const newName = prompt(`Nhập tên cho bản sao của "${sourceProfile.name}":`, `${sourceProfile.name} (Copy)`);
        if (!newName) return;

        const newProfileData = {
            profileId: 'profile_' + Date.now(),
            name: newName,
            passThreshold: sourceProfile.passThreshold,
            weights: { ...sourceProfile.weights }
        };

        const result = await API.createProfile(newProfileData);

        if (result.success) {
            profiles[newProfileData.profileId] = newProfileData;
            updateProfileSelect();
            await renderProfilesList();
            alert(`Đã tạo bản sao "${newName}"!`);
        } else {
            alert('Lỗi tạo profile: ' + (result.message || 'Unknown error'));
        }
    } catch (error) {
        console.error('Error duplicating profile:', error);
        alert('Lỗi: ' + error.message);
    }
}

async function deleteProfileById(profileId) {
    if (profileId === 'default') {
        alert('Không thể xóa profile mặc định!');
        return;
    }

    const profile = profiles[profileId];
    if (!profile) {
        alert('Không tìm thấy profile!');
        return;
    }

    if (!confirm(`Bạn có chắc muốn xóa profile "${profile.name}"?`)) {
        return;
    }

    try {
        const result = await API.deleteProfile(profileId);

        if (result.success) {
            delete profiles[profileId];

            if (currentProfile === profileId) {
                currentProfile = 'default';
            }

            updateProfileSelect();
            await renderProfilesList();
            alert('Đã xóa profile!');
        } else {
            alert('Lỗi xóa profile: ' + (result.message || 'Unknown error'));
        }
    } catch (error) {
        console.error('Error deleting profile:', error);
        alert('Lỗi: ' + error.message);
    }
}

async function saveProfile() {
    const name = document.getElementById('profileName').value.trim();
    const threshold = parseFloat(document.getElementById('passThreshold').value) || 3;

    if (!name) {
        alert('Vui lòng nhập tên profile!');
        return;
    }

    const rows = document.querySelectorAll('#weightEditor .weight-row');
    const newWeights = {};
    rows.forEach(row => {
        const key = row.querySelector('.weight-name').value.trim();
        const value = parseFloat(row.querySelector('.weight-value').value) || 0;
        if (key) {
            newWeights[key] = value;
        }
    });

    const profileData = {
        profileId: currentProfile,
        name: name,
        passThreshold: threshold,
        weights: newWeights
    };

    try {
        const result = await API.updateProfile(currentProfile, profileData);

        if (result.success) {
            profiles[currentProfile] = profileData;
            loadProfile();
            updateProfileSelect();
            await renderProfilesList();
            closeProfileModal();
            alert('Đã lưu profile thành công!');
        } else {
            alert('Lỗi lưu profile: ' + (result.message || 'Unknown error'));
        }
    } catch (error) {
        console.error('Error saving profile:', error);
        alert('Lỗi: ' + error.message);
    }
}

function closeProfileModal() {
    const modal = bootstrap.Modal.getInstance(document.getElementById('profileModal'));
    if (modal) modal.hide();
}

async function exportAllProfiles() {
    try {
        const data = JSON.stringify(profiles, null, 2);
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `grade_profiles_${new Date().getTime()}.json`;
        a.click();
        URL.revokeObjectURL(url);
    } catch (error) {
        console.error('Error exporting profiles:', error);
        alert('Lỗi: ' + error.message);
    }
}

async function importProfiles(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async function (e) {
        try {
            const imported = JSON.parse(e.target.result);
            if (confirm('Import cấu hình sẽ ghi đè tất cả profiles hiện tại. Bạn có chắc chắn?')) {
                // Import each profile via API
                for (const [key, profile] of Object.entries(imported)) {
                    try {
                        await API.createProfile(profile);
                    } catch (err) {
                        console.error(`Error importing profile ${key}:`, err);
                    }
                }

                await initDefaultProfiles();
                await renderProfilesList();
                alert('Import thành công!');
            }
        } catch (error) {
            alert('Lỗi: File không hợp lệ!');
        }
    };
    reader.readAsText(file);
    event.target.value = '';
}

// ========================================
// CLASS MANAGEMENT FUNCTIONS
// ========================================

async function editClassById(classId) {
    try {
        const classData = classes[classId];
        if (!classData) {
            alert('Không tìm thấy lớp!');
            return;
        }

        currentClass = classId;

        document.getElementById('className').value = classData.name;
        document.getElementById('classDescription').value = classData.description || '';

        const editor = document.getElementById('studentEditor');
        editor.innerHTML = '';

        if (classData.students && classData.students.length > 0) {
            classData.students.forEach(student => {
                addStudentRowWithData(student.mssv, student.name);
            });
        }

        updateStudentCount();

        const modal = new bootstrap.Modal(document.getElementById('classModal'));
        modal.show();
    } catch (error) {
        console.error('Error editing class:', error);
        alert('Lỗi: ' + error.message);
    }
}

async function viewClassDetails(classId) {
    try {
        const classData = classes[classId];
        if (!classData) {
            alert('Không tìm thấy lớp!');
            return;
        }

        const studentCount = classData.students ? classData.students.length : 0;

        // Build detailed HTML content
        let html = `
            <div style="padding: 20px;">
                <!-- Header Section -->
                <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px; margin-bottom: 30px;">
                    <h2 style="margin: 0 0 10px 0; font-size: 2em;">👥 ${classData.name}</h2>
                    ${classData.description ? `
                        <p style="margin: 0; font-size: 1.1em; opacity: 0.9;">
                            ${classData.description}
                        </p>
                    ` : ''}
                </div>

                <!-- Stats Section -->
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 30px;">
                    <div style="background: #f8f9fa; padding: 20px; border-radius: 10px; text-align: center; border-left: 4px solid #667eea;">
                        <div style="font-size: 2.5em; font-weight: bold; color: #667eea; margin-bottom: 5px;">
                            ${studentCount}
                        </div>
                        <div style="color: #666; font-size: 0.9em;">
                            Tổng số sinh viên
                        </div>
                    </div>
                    
                    <div style="background: #f8f9fa; padding: 20px; border-radius: 10px; text-align: center; border-left: 4px solid #28a745;">
                        <div style="font-size: 2.5em; font-weight: bold; color: #28a745; margin-bottom: 5px;">
                            ${classData.classId ? '✓' : '-'}
                        </div>
                        <div style="color: #666; font-size: 0.9em;">
                            Đã lưu trên server
                        </div>
                    </div>
                </div>

                <!-- Student List Section -->
                <div style="background: white; border: 2px solid #ddd; border-radius: 10px; overflow: hidden;">
                    <div style="background: #f8f9fa; padding: 15px; border-bottom: 2px solid #ddd;">
                        <h3 style="margin: 0; color: #333;">
                            📋 Danh sách sinh viên
                        </h3>
                    </div>
                    
                    ${studentCount > 0 ? `
                        <div style="max-height: 400px; overflow-y: auto;">
                            <table style="width: 100%; border-collapse: collapse;">
                                <thead style="background: #667eea; color: white; position: sticky; top: 0;">
                                    <tr>
                                        <th style="padding: 12px; text-align: left; border-bottom: 2px solid #ddd;">STT</th>
                                        <th style="padding: 12px; text-align: left; border-bottom: 2px solid #ddd;">MSSV</th>
                                        <th style="padding: 12px; text-align: left; border-bottom: 2px solid #ddd;">Họ và tên</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${classData.students.map((student, index) => `
                                        <tr style="border-bottom: 1px solid #eee; ${index % 2 === 0 ? 'background: #f8f9fa;' : ''}">
                                            <td style="padding: 12px;">${index + 1}</td>
                                            <td style="padding: 12px; font-weight: bold; color: #667eea;">${student.mssv}</td>
                                            <td style="padding: 12px;">${student.name}</td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                    ` : `
                        <div style="padding: 40px; text-align: center; color: #666;">
                            <div style="font-size: 3em; margin-bottom: 10px;">📭</div>
                            <p style="font-size: 1.1em; margin: 0;">Lớp chưa có sinh viên nào</p>
                            <p style="font-size: 0.9em; margin: 10px 0 0 0; color: #999;">
                                Nhấn "✏️ Chỉnh sửa" để thêm sinh viên
                            </p>
                        </div>
                    `}
                </div>

                <!-- Action Buttons -->
                <div style="display: flex; gap: 15px; margin-top: 30px; justify-content: center;">
                    <button class="btn btn-primary" onclick="editClassById('${classId}'); closeClassDetailsModal();" style="padding: 12px 30px; font-size: 1em;">
                        ✏️ Chỉnh sửa lớp
                    </button>
                    <button class="btn" onclick="exportClassToExcel('${classId}')" style="background: #28a745; color: white; padding: 12px 30px; font-size: 1em;">
                        📥 Xuất danh sách Excel
                    </button>
                    <button class="btn" onclick="closeClassDetailsModal()" style="background: #6c757d; color: white; padding: 12px 30px; font-size: 1em;">
                        Đóng
                    </button>
                </div>
            </div>
        `;

        // Update modal content and show
        document.getElementById('classDetailsContent').innerHTML = html;
        document.getElementById('classDetailsModal').classList.add('show');

    } catch (error) {
        console.error('Error viewing class details:', error);
        alert('Lỗi: ' + error.message);
    }
}

function closeClassDetailsModal() {
    document.getElementById('classDetailsModal').classList.remove('show');
}

async function exportClassToExcel(classId) {
    try {
        const classData = classes[classId];
        if (!classData || !classData.students || classData.students.length === 0) {
            alert('Lớp không có sinh viên để xuất!');
            return;
        }

        // Create workbook
        const wb = XLSX.utils.book_new();

        // Prepare data
        const data = [
            ['MSSV', 'Họ và tên'],
            ...classData.students.map(student => [student.mssv, student.name])
        ];

        // Create worksheet
        const ws = XLSX.utils.aoa_to_sheet(data);

        // Set column widths
        ws['!cols'] = [
            { wch: 15 },  // MSSV
            { wch: 30 }   // Họ và tên
        ];

        // Add worksheet to workbook
        XLSX.utils.book_append_sheet(wb, ws, classData.name);

        // Generate file
        XLSX.writeFile(wb, `Danh_sach_${classData.name}_${Date.now()}.xlsx`);

        alert(`Đã xuất danh sách ${classData.students.length} sinh viên!`);

    } catch (error) {
        console.error('Error exporting class to Excel:', error);
        alert('Lỗi xuất file: ' + error.message);
    }
}

async function deleteClassById(classId) {
    const classData = classes[classId];
    if (!classData) {
        alert('Không tìm thấy lớp!');
        return;
    }

    if (!confirm(`Bạn có chắc muốn xóa lớp "${classData.name}"?`)) {
        return;
    }

    try {
        const result = await API.deleteClass(classId);

        if (result.success) {
            delete classes[classId];

            if (currentClass === classId) {
                currentClass = '';
            }

            updateClassSelect();
            await renderClassesList();
            alert('Đã xóa lớp!');
        } else {
            alert('Lỗi xóa lớp: ' + (result.message || 'Unknown error'));
        }
    } catch (error) {
        console.error('Error deleting class:', error);
        alert('Lỗi: ' + error.message);
    }
}

async function saveClass() {
    if (!currentClass) return;

    const name = document.getElementById('className').value.trim();
    const description = document.getElementById('classDescription').value.trim();

    if (!name) {
        alert('Vui lòng nhập tên lớp!');
        return;
    }

    const rows = document.querySelectorAll('#studentEditor .weight-row');
    const students = [];
    rows.forEach(row => {
        const mssv = row.querySelector('.student-mssv').value.trim();
        const studentName = row.querySelector('.student-name').value.trim();
        if (mssv && studentName) {
            students.push({ mssv, name: studentName });
        }
    });

    const classData = {
        classId: currentClass,
        name: name,
        description: description,
        students: students
    };

    try {
        const result = await API.updateClass(currentClass, classData);

        if (result.success) {
            classes[currentClass] = classData;
            updateClassSelect();
            await renderClassesList();
            closeClassModal();
            alert(`Đã lưu lớp "${name}" với ${students.length} sinh viên!`);
        } else {
            alert('Lỗi lưu lớp: ' + (result.message || 'Unknown error'));
        }
    } catch (error) {
        console.error('Error saving class:', error);
        alert('Lỗi: ' + error.message);
    }
}

function closeClassModal() {
    const modal = bootstrap.Modal.getInstance(document.getElementById('classModal'));
    if (modal) modal.hide();
}

function updateStudentCount() {
    const rows = document.querySelectorAll('#studentEditor .weight-row');
    const countElement = document.getElementById('classStudentCount');
    if (countElement) {
        countElement.textContent = rows.length;
    }
}

// ========================================
// TAB SWITCHING WITH DATA LOADING
// ========================================

function switchTab(tabName) {
    // Hide all tabs
    const tabs = document.querySelectorAll('.tab-content');
    tabs.forEach(tab => tab.classList.remove('active'));

    // Deactivate all nav items
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => item.classList.remove('active'));

    // Show selected tab
    const selectedTab = document.getElementById(`tab-${tabName}`);
    if (selectedTab) {
        selectedTab.classList.add('active');
    }

    // Activate nav item
    if (event && event.target) {
        const navItem = event.target.closest('.nav-item');
        if (navItem) {
            navItem.classList.add('active');
        }
    }
    
    // Update mobile nav
    if (typeof updateMobileNav === 'function') {
        updateMobileNav(tabName);
    }
    
    // Close sidebar on mobile after selecting
    const sidebar = document.getElementById('sidebar');
    const isMobile = window.innerWidth < 768;
    if (isMobile && sidebar) {
        sidebar.classList.remove('show');
    }

    // Load data for the tab
    switch (tabName) {
        case 'grade-check':
            // Tab đã load sẵn
            break;
        case 'profiles':
            renderProfilesList();
            break;
        case 'classes':
            renderClassesList();
            break;
        case 'template':
            // Tab đã load sẵn
            break;
    }
}


// ========================================
// CLASS DETAIL VIEW - Now handled by ClassesModule
// ========================================
// All class detail functions have been moved to modules/classes.js
