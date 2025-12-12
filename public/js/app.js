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
        const response = await fetch('/api/profiles', {
            credentials: 'include'
        });
        const data = await response.json();
        return data.success ? data.data : [];
    },

    async createProfile(profileData) {
        const response = await fetch('/api/profiles', {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(profileData)
        });
        const data = await response.json();
        return data;
    },

    async updateProfile(profileId, profileData) {
        const response = await fetch(`/api/profiles/${profileId}`, {
            method: 'PUT',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(profileData)
        });
        const data = await response.json();
        return data;
    },

    async deleteProfile(profileId) {
        const response = await fetch(`/api/profiles/${profileId}`, {
            method: 'DELETE',
            credentials: 'include'
        });
        const data = await response.json();
        return data;
    },

    // Class APIs
    async getClasses() {
        const response = await fetch('/api/classes', {
            credentials: 'include'
        });
        const data = await response.json();
        return data.success ? data.data : [];
    },

    async createClass(classData) {
        const response = await fetch('/api/classes', {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(classData)
        });
        const data = await response.json();
        return data;
    },

    async updateClass(classId, classData) {
        const response = await fetch(`/api/classes/${classId}`, {
            method: 'PUT',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(classData)
        });
        const data = await response.json();
        return data;
    },

    async deleteClass(classId) {
        const response = await fetch(`/api/classes/${classId}`, {
            method: 'DELETE',
            credentials: 'include'
        });
        const data = await response.json();
        return data;
    },

    async archiveClass(classId) {
        const response = await fetch(`/api/classes/${classId}/archive`, {
            method: 'PUT',
            credentials: 'include'
        });
        const data = await response.json();
        return data;
    },

    async unarchiveClass(classId) {
        const response = await fetch(`/api/classes/${classId}/unarchive`, {
            method: 'PUT',
            credentials: 'include'
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
// NOTE: This function is now a wrapper that will be replaced by init.js
// The actual implementation is in modules/profiles.js with full reliability features
async function initDefaultProfiles() {
    // This will be overridden by init.js to use profileManager.init()
    console.warn('initDefaultProfiles: Using legacy implementation. init.js should override this.');

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
    // Use profileManager if available, otherwise use legacy code
    if (window.profileManager && typeof window.profileManager.loadProfile === 'function') {
        window.profileManager.loadProfile();
    } else {
        // Legacy fallback
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
}

function getProfileData() {
    if (window.profileManager && window.profileManager.profiles) {
        return window.profileManager.profiles;
    }
    return profiles;
}

function ensureProfileStore() {
    if (!profiles || typeof profiles !== 'object') {
        profiles = {};
    }
    if (window.profileManager && typeof window.profileManager.profiles !== 'object') {
        window.profileManager.profiles = {};
    }
}

function getCurrentProfileId() {
    if (window.profileManager && window.profileManager.currentProfile) {
        return window.profileManager.currentProfile;
    }
    return currentProfile;
}

function setCurrentProfileId(value) {
    currentProfile = value || '';
    if (window.profileManager) {
        window.profileManager.currentProfile = currentProfile;
    }
}

function getProfileById(profileId) {
    const data = getProfileData();
    return data ? data[profileId] : undefined;
}

function setProfileEntry(profileId, profileData) {
    ensureProfileStore();
    profiles[profileId] = profileData;
    if (window.profileManager) {
        window.profileManager.profiles[profileId] = profileData;
    }
}

function removeProfileEntry(profileId) {
    if (profiles && profiles[profileId]) {
        delete profiles[profileId];
    }
    if (window.profileManager && window.profileManager.profiles) {
        delete window.profileManager.profiles[profileId];
    }
}

function getClassesData() {
    if (window.classManager && window.classManager.classes) {
        return window.classManager.classes;
    }
    return classes;
}

function ensureClassesStore() {
    if (!classes || typeof classes !== 'object') {
        classes = {};
    }
    if (window.classManager && typeof window.classManager.classes !== 'object') {
        window.classManager.classes = {};
    }
}

function getCurrentClassId() {
    if (window.classManager && typeof window.classManager.currentClass !== 'undefined') {
        return window.classManager.currentClass;
    }
    return currentClass;
}

function setCurrentClassId(value) {
    currentClass = value || '';
    if (window.classManager) {
        window.classManager.currentClass = currentClass;
    }
}

function getClassById(classId) {
    const data = getClassesData();
    return data ? data[classId] : undefined;
}

function setClassEntry(classId, classData) {
    ensureClassesStore();
    classes[classId] = classData;
    if (window.classManager) {
        window.classManager.classes[classId] = classData;
    }
}

function removeClassEntry(classId) {
    if (classes && classes[classId]) {
        delete classes[classId];
    }
    if (window.classManager && window.classManager.classes) {
        delete window.classManager.classes[classId];
    }
}

function getClassListData() {
    if (window.classManager && Array.isArray(window.classManager.classListData)) {
        return window.classManager.classListData;
    }
    return classListData;
}

function setClassListData(list) {
    classListData = Array.isArray(list) ? list : [];
    if (window.classManager) {
        window.classManager.classListData = classListData;
    }
}

function updateProfileSelect() {
    const profileData = getProfileData();
    const selectedProfileId = getCurrentProfileId();

    console.log('updateProfileSelect called, profileData:', profileData);

    const selects = [
        document.getElementById('profileSelect'),
        document.getElementById('gradeProfileSelect'),
        document.getElementById('templateProfileSelect')
    ];

    selects.forEach(select => {
        if (!select) return;

        select.innerHTML = '<option value="">-- Chọn profile --</option>';

        for (const [key, profile] of Object.entries(profileData || {})) {
            const option = document.createElement('option');
            option.value = key;
            option.textContent = profile.name || 'Không tên';
            if (key === selectedProfileId) {
                option.selected = true;
            }
            select.appendChild(option);
        }
    });

    // Populate class profile select separately (no default selection)
    const classProfileSelect = document.getElementById('classProfileSelect');
    console.log('classProfileSelect element:', classProfileSelect);
    if (classProfileSelect) {
        classProfileSelect.innerHTML = '<option value="">-- Chọn profile --</option>';
        for (const [key, profile] of Object.entries(profileData || {})) {
            const option = document.createElement('option');
            option.value = key;
            option.textContent = profile.name || 'Không tên';
            classProfileSelect.appendChild(option);
            console.log('Added profile option:', key, profile.name);
        }
    }
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
            credentials: 'include',
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
        setClassListData([]);
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
        setClassListData([]);
        document.getElementById('generateTemplateBtn').disabled = true;
        return;
    }

    setClassListData([]);
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
    const sourceInput = document.querySelector('input[name="templateSource"]:checked');
    if (!sourceInput) {
        alert('Vui lòng chọn nguồn dữ liệu cho template!');
        return;
    }

    const source = sourceInput.value;
    const profilesData = getProfileData();
    const profileId = getCurrentProfileId();
    const profile = profileId ? profilesData[profileId] : null;

    let students = [];
    if (source === 'class') {
        const selectedClassId = getCurrentClassId();
        const classesData = getClassesData();

        if (!selectedClassId || !classesData[selectedClassId]) {
            alert('Vui lòng chọn lớp trước!');
            return;
        }
        students = classesData[selectedClassId].students || [];
    } else {
        students = getClassListData();
    }

    if (students.length === 0) {
        alert('Danh sách sinh viên trống!');
        return;
    }

    if (!profile || Object.keys(profile.weights || {}).length === 0) {
        alert('Profile hiện tại không có cột điểm nào!\nVui lòng chỉnh sửa profile và thêm các cột điểm.');
        return;
    }

    try {
        const response = await fetch('/api/generate-template', {
            method: 'POST',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                students,
                weights: profile.weights,
                profileName: profile.name,
                passThreshold: profile.passThreshold || 3
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
// Khởi tạo classes
// NOTE: This function is now a wrapper that will be replaced by init.js
// The actual implementation is in modules/classManager.js with full reliability features
async function initClasses() {
    // This will be overridden by init.js to use classManager.init()
    console.warn('initClasses: Using legacy implementation. init.js should override this.');

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

    const classesData = getClassesData();
    const selectedClassId = getCurrentClassId();

    selects.forEach(select => {
        if (!select) return;

        select.innerHTML = '<option value="">-- Chọn lớp --</option>';

        for (const [key, classData] of Object.entries(classesData)) {
            const option = document.createElement('option');
            option.value = key;
            option.textContent = classData.name;
            if (key === selectedClassId) {
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

    setCurrentClassId(select.value);
    const selectedClassId = getCurrentClassId();
    const classesData = getClassesData();

    if (selectedClassId && classesData[selectedClassId]) {
        const classData = classesData[selectedClassId];
        setClassListData(classData.students || []);

        const classInfo = document.getElementById('classInfo');
        const classDetails = document.getElementById('classDetails');

        if (classInfo) classInfo.style.display = 'block';
        if (classDetails) {
            classDetails.textContent =
                `${classData.name} - ${classData.description || ''} (${classListData.length} sinh viên)`;
        }
    } else {
        setClassListData([]);
        const classInfo = document.getElementById('classInfo');
        if (classInfo) classInfo.style.display = 'none';
    }

    updateGenerateButtonState();
}

// Flag to indicate if we are creating a new class
let isCreatingClass = false;

async function createNewClass() {
    isCreatingClass = true;
    setCurrentClassId(''); // Clear current class

    // Reset modal fields
    document.getElementById('className').value = '';
    document.getElementById('classDescription').value = '';
    document.getElementById('studentEditor').innerHTML = '';
    document.getElementById('classStudentCount').textContent = '0';

    // Populate profile dropdown using multiple fallback sources
    const classProfileSelect = document.getElementById('classProfileSelect');
    if (classProfileSelect) {
        classProfileSelect.innerHTML = '<option value="">-- Chọn profile --</option>';

        let profilesList = [];

        // Try multiple sources for profiles
        // 1. From profileManager (if available)
        if (window.profileManager && window.profileManager.profiles) {
            profilesList = Object.entries(window.profileManager.profiles).map(([key, p]) => ({
                profileId: key,
                name: p.name
            }));
        }
        // 2. From global profiles variable
        else if (typeof profiles === 'object' && Object.keys(profiles).length > 0) {
            profilesList = Object.entries(profiles).map(([key, p]) => ({
                profileId: key,
                name: p.name
            }));
        }
        // 3. From server-rendered data
        else if (window.__INITIAL_SERVER_DATA__ && window.__INITIAL_SERVER_DATA__.profiles) {
            const serverProfiles = window.__INITIAL_SERVER_DATA__.profiles;
            if (Array.isArray(serverProfiles)) {
                profilesList = serverProfiles;
            } else {
                profilesList = Object.entries(serverProfiles).map(([key, p]) => ({
                    profileId: key,
                    name: p.name
                }));
            }
        }
        // 4. Fetch from API as last resort
        else {
            try {
                const apiProfiles = await API.getProfiles();
                if (apiProfiles && apiProfiles.length > 0) {
                    profilesList = apiProfiles;
                }
            } catch (error) {
                console.error('Error loading profiles from API:', error);
            }
        }

        // Populate the select dropdown
        profilesList.forEach(profile => {
            const option = document.createElement('option');
            option.value = profile.profileId;
            option.textContent = profile.name || 'Không tên';
            classProfileSelect.appendChild(option);
        });

        console.log('Loaded profiles for dropdown:', profilesList.length);
    }

    // Show modal
    const modalEl = document.getElementById('classModal');
    if (modalEl) {
        const modalInstance = bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl);
        modalInstance.show();
    }
}

function editClass() {
    const selectedClassId = getCurrentClassId();
    if (!selectedClassId) {
        alert('Vui lòng chọn lớp trước!');
        return;
    }

    const classData = getClassById(selectedClassId);
    if (!classData) {
        alert('Không tìm thấy lớp!');
        return;
    }

    isCreatingClass = false;
    document.getElementById('className').value = classData.name;
    document.getElementById('classDescription').value = classData.description || '';

    // Set selected profile if class has one
    const profileSelect = document.getElementById('classProfileSelect');
    if (profileSelect) {
        if (classData.grades && classData.grades.profileId) {
            profileSelect.value = classData.grades.profileId;
        } else {
            profileSelect.value = '';
        }
    }

    renderStudentEditor(classData.students || []);

    const modalEl = document.getElementById('classModal');
    if (modalEl) {
        const modalInstance = bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl);
        modalInstance.show();
    }
}

// Removed - use closeClassModal() instead

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
            credentials: 'include',
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

// Duplicate functions removed - see line 1927 for saveClass and deleteClassById for delete

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

// Moved to line 2100 - see TEMPLATE PAGE FUNCTIONS section

// Khởi tạo khi load trang
// NOTE: Initialization is now handled by init.js module
// which provides better error handling, retry logic, and loading states
window.addEventListener('DOMContentLoaded', () => {
    // Legacy initialization removed - now handled by init.js
    // The init.js module will call initDefaultProfiles() and initClasses()
    // with proper error handling, retry logic, and user notifications
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
            credentials: 'include',
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
            credentials: 'include',
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
    const container =
        document.getElementById('profiles-list') ||
        document.getElementById('profilesList');

    if (!container) {
        console.warn('profiles-list container not found');
        return;
    }

    try {
        container.innerHTML = '<p style="color: #64748b; text-align: center; padding: 40px;">Đang tải danh sách profiles...</p>';

        const apiProfiles = await API.getProfiles();

        if (!apiProfiles || apiProfiles.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 60px 40px; color: #64748b;">
                    <i class="bi bi-sliders" style="font-size: 3rem; display: block; margin-bottom: 16px; opacity: 0.5;"></i>
                    <p style="font-size: 1.1em; margin-bottom: 8px; color: #334155;">Chưa có profile nào</p>
                    <p style="font-size: 0.9em;">Nhấn nút "Tạo Profile mới" để bắt đầu</p>
                </div>
            `;
            return;
        }

        // Render profiles as cards with professional UI
        let html = '<div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); gap: 24px;">';

        apiProfiles.forEach(profile => {
            const totalWeight = Object.values(profile.weights).reduce((sum, w) => sum + w, 0);
            const weightCount = Object.keys(profile.weights).length;
            const isDefault = profile.profileId === 'default';

            html += `
                <div class="profile-card" style="background: #ffffff; border: 1px solid ${isDefault ? '#2563EB' : '#e2e8f0'}; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.08); transition: all 200ms ease;">
                    <!-- Card Header -->
                    <div style="padding: 20px 20px 16px 20px; border-bottom: 1px solid #f1f5f9;">
                        <div style="display: flex; justify-content: space-between; align-items: start;">
                            <div style="display: flex; align-items: center; gap: 12px; flex: 1; min-width: 0;">
                                <div style="width: 40px; height: 40px; background: ${isDefault ? '#2563EB15' : '#f1f5f9'}; border-radius: 10px; display: flex; align-items: center; justify-content: center;">
                                    <i class="bi bi-sliders" style="color: ${isDefault ? '#2563EB' : '#64748b'}; font-size: 1.2rem;"></i>
                                </div>
                                <div style="flex: 1; min-width: 0;">
                                    <h3 style="margin: 0 0 2px 0; font-size: 1.1rem; font-weight: 600; color: #1e293b; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                                        ${profile.name}
                                    </h3>
                                    <p style="margin: 0; color: #64748b; font-size: 0.85rem;">
                                        ${weightCount} cột điểm • ${totalWeight.toFixed(1)}%
                                    </p>
                                </div>
                            </div>
                            ${isDefault ? '<span style="background: #2563EB; color: white; padding: 4px 12px; border-radius: 20px; font-size: 0.75rem; font-weight: 500; white-space: nowrap;">Mặc định</span>' : ''}
                        </div>
                    </div>
                    
                    <!-- Pass Threshold -->
                    <div style="padding: 12px 20px; background: #f8fafc; border-bottom: 1px solid #f1f5f9;">
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <span style="font-size: 0.85rem; color: #64748b;">Ngưỡng qua môn</span>
                            <span style="font-size: 0.95rem; font-weight: 600; color: #1e293b;">≥ ${profile.passThreshold} điểm</span>
                        </div>
                    </div>

                    <!-- Weights List -->
                    <div style="padding: 12px 20px; max-height: 140px; overflow-y: auto;">
                        <div style="font-size: 0.75rem; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px;">
                            Trọng số
                        </div>
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
                                <div style="display: flex; justify-content: space-between; padding: 5px 0; border-bottom: 1px solid #f1f5f9; font-size: 0.85rem;">
                                    <span style="color: #334155;">${key}</span>
                                    <span style="font-weight: 600; color: #2563EB;">${value}%</span>
                                </div>
                            `).join('')}
                    </div>

                    <!-- Action Buttons -->
                    <div style="display: flex; gap: 8px; padding: 16px 20px; border-top: 1px solid #f1f5f9; background: #ffffff;">
                        <button onclick="editProfile('${profile.profileId}')" style="flex: 1; padding: 10px 16px; background: #2563EB; border: none; border-radius: 8px; color: #ffffff; font-size: 0.85rem; font-weight: 500; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px; transition: all 150ms ease;">
                            <i class="bi bi-pencil"></i> Chỉnh sửa
                        </button>
                        <button onclick="duplicateProfile('${profile.profileId}')" style="flex: 1; padding: 10px 16px; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; color: #334155; font-size: 0.85rem; font-weight: 500; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px; transition: all 150ms ease;">
                            <i class="bi bi-copy"></i> Sao chép
                        </button>
                        ${!isDefault ? `
                            <button onclick="deleteProfileById('${profile.profileId}')" style="padding: 10px 12px; background: #ffffff; border: 1px solid #fecaca; border-radius: 8px; color: #dc2626; font-size: 0.85rem; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 150ms ease;">
                                <i class="bi bi-trash"></i>
                            </button>
                        ` : ''}
                    </div>
                </div>
            `;
        });

        html += '</div>';

        // Add hover styles
        html += `
            <style>
                .profile-card:hover {
                    box-shadow: 0 4px 12px rgba(0,0,0,0.1);
                    border-color: #cbd5e1;
                }
                .profile-card button:hover {
                    opacity: 0.9;
                }
            </style>
        `;

        container.innerHTML = html;

    } catch (error) {
        console.error('Error rendering profiles list:', error);
        container.innerHTML = `
            <div style="text-align: center; padding: 60px 40px; color: #dc2626;">
                <i class="bi bi-exclamation-circle" style="font-size: 2.5rem; display: block; margin-bottom: 16px;"></i>
                <p style="font-size: 1.1em; margin-bottom: 8px; color: #1e293b;">Không thể tải danh sách profiles</p>
                <p style="margin-bottom: 20px; color: #64748b;">${error.message}</p>
                <button onclick="renderProfilesList()" style="padding: 10px 20px; background: #2563EB; border: none; border-radius: 8px; color: white; cursor: pointer;">
                    <i class="bi bi-arrow-clockwise me-1"></i> Thử lại
                </button>
            </div>
        `;
    }
}

// ========================================
// RENDER CLASSES LIST
// ========================================

// Current filter state for classes
let currentClassFilter = 'active';

function filterClasses(filter) {
    currentClassFilter = filter;
    renderClassesList();
}

async function archiveClassById(classId) {
    if (!confirm('Bạn có chắc muốn lưu trữ lớp này?')) return;

    try {
        const result = await API.archiveClass(classId);
        if (result.success) {
            await renderClassesList();
            alert('Đã lưu trữ lớp thành công!');
        } else {
            alert('Lỗi: ' + (result.message || 'Không thể lưu trữ lớp'));
        }
    } catch (error) {
        console.error('Error archiving class:', error);
        alert('Lỗi: ' + error.message);
    }
}

async function unarchiveClassById(classId) {
    try {
        const result = await API.unarchiveClass(classId);
        if (result.success) {
            await renderClassesList();
            alert('Đã khôi phục lớp thành công!');
        } else {
            alert('Lỗi: ' + (result.message || 'Không thể khôi phục lớp'));
        }
    } catch (error) {
        console.error('Error unarchiving class:', error);
        alert('Lỗi: ' + error.message);
    }
}

async function renderClassesList() {
    const container =
        document.getElementById('classes-list') ||
        document.getElementById('classesList');

    if (!container) {
        console.warn('classes-list container not found');
        return;
    }

    try {
        container.innerHTML = '<p style="color: #64748b; text-align: center; padding: 40px;">Đang tải danh sách lớp học...</p>';

        const apiClasses = await API.getClasses();

        // Update counts
        const activeClasses = apiClasses.filter(c => !c.isArchived);
        const archivedClasses = apiClasses.filter(c => c.isArchived);

        const activeCountEl = document.getElementById('activeClassCount');
        const archivedCountEl = document.getElementById('archivedClassCount');
        if (activeCountEl) activeCountEl.textContent = activeClasses.length;
        if (archivedCountEl) archivedCountEl.textContent = archivedClasses.length;

        // Filter based on current tab
        const filteredClasses = currentClassFilter === 'archived' ? archivedClasses : activeClasses;

        if (!filteredClasses || filteredClasses.length === 0) {
            const emptyMessage = currentClassFilter === 'archived'
                ? 'Chưa có lớp học nào được lưu trữ'
                : 'Chưa có lớp học nào';
            container.innerHTML = `
                <div style="text-align: center; padding: 60px 40px; color: #64748b;">
                    <i class="bi bi-${currentClassFilter === 'archived' ? 'archive' : 'people'}" style="font-size: 3rem; display: block; margin-bottom: 16px; opacity: 0.5;"></i>
                    <p style="font-size: 1.1em; margin-bottom: 8px; color: #334155;">${emptyMessage}</p>
                    ${currentClassFilter === 'active' ? '<p style="font-size: 0.9em;">Nhấn nút "Tạo Lớp mới" để bắt đầu</p>' : ''}
                </div>
            `;
            return;
        }

        // Render classes as cards with professional UI
        let html = '<div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); gap: 24px;">';

        filteredClasses.forEach(cls => {
            const studentCount = cls.students ? cls.students.length : 0;
            const isArchived = cls.isArchived;

            html += `
                <div class="class-card" style="background: #ffffff; border: 1px solid ${isArchived ? '#94a3b8' : '#e2e8f0'}; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.08); transition: all 200ms ease; ${isArchived ? 'opacity: 0.8;' : ''}">
                    <!-- Card Header -->
                    <div style="padding: 20px 20px 16px 20px; border-bottom: 1px solid #f1f5f9;">
                        <div style="display: flex; align-items: center; gap: 12px;">
                            <div style="width: 40px; height: 40px; background: ${isArchived ? '#94a3b815' : '#2563EB15'}; border-radius: 10px; display: flex; align-items: center; justify-content: center;">
                                <i class="bi bi-${isArchived ? 'archive' : 'people-fill'}" style="color: ${isArchived ? '#64748b' : '#2563EB'}; font-size: 1.2rem;"></i>
                            </div>
                            <div style="flex: 1; min-width: 0;">
                                <h3 style="margin: 0 0 2px 0; font-size: 1.1rem; font-weight: 600; color: #1e293b; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                                    ${cls.name}
                                </h3>
                                ${cls.description ? `
                                    <p style="margin: 0; color: #64748b; font-size: 0.85rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                                        ${cls.description}
                                    </p>
                                ` : ''}
                            </div>
                            ${isArchived ? '<span class="badge bg-secondary">Lưu trữ</span>' : ''}
                        </div>
                    </div>
                    
                    <!-- Student Count -->
                    <div style="padding: 20px; text-align: center; background: #f8fafc;">
                        <div style="font-size: 2.5rem; font-weight: 700; color: ${isArchived ? '#64748b' : '#2563EB'}; line-height: 1;">
                            ${studentCount}
                        </div>
                        <div style="font-size: 0.85rem; color: #64748b; margin-top: 4px;">
                            sinh viên
                        </div>
                    </div>

                    <!-- Student List Preview -->
                    ${studentCount > 0 ? `
                        <div style="padding: 12px 20px; border-top: 1px solid #f1f5f9; max-height: 140px; overflow-y: auto;">
                            <div style="font-size: 0.75rem; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px;">
                                Danh sách sinh viên
                            </div>
                            ${cls.students.slice(0, 4).map(student => `
                                <div style="padding: 6px 0; border-bottom: 1px solid #f1f5f9; font-size: 0.85rem; color: #334155;">
                                    <span style="color: #64748b;">${student.mssv}</span> - ${student.name}
                                </div>
                            `).join('')}
                            ${studentCount > 4 ? `
                                <div style="padding: 8px 0; color: #64748b; font-size: 0.8rem; font-style: italic;">
                                    + ${studentCount - 4} sinh viên khác
                                </div>
                            ` : ''}
                        </div>
                    ` : `
                        <div style="padding: 16px 20px; border-top: 1px solid #f1f5f9; text-align: center; background: #fffbeb;">
                            <i class="bi bi-exclamation-triangle" style="color: #d97706; margin-right: 6px;"></i>
                            <span style="color: #92400e; font-size: 0.85rem;">Lớp chưa có sinh viên</span>
                        </div>
                    `}

                    <!-- Action Buttons -->
                    <div style="display: flex; gap: 8px; padding: 16px 20px; border-top: 1px solid #f1f5f9; background: #ffffff;">
                        ${isArchived ? `
                            <button onclick="unarchiveClassById('${cls.classId}')" style="flex: 1; padding: 10px 16px; background: #2563EB; border: none; border-radius: 8px; color: #ffffff; font-size: 0.85rem; font-weight: 500; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px; transition: all 150ms ease;">
                                <i class="bi bi-arrow-counterclockwise"></i> Khôi phục
                            </button>
                            <button onclick="deleteClassById('${cls.classId}')" style="padding: 10px 12px; background: #ffffff; border: 1px solid #fecaca; border-radius: 8px; color: #dc2626; font-size: 0.85rem; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 150ms ease;">
                                <i class="bi bi-trash"></i>
                            </button>
                        ` : `
                            <button onclick="editClassById('${cls.classId}')" style="flex: 1; padding: 10px 16px; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; color: #334155; font-size: 0.85rem; font-weight: 500; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px; transition: all 150ms ease;">
                                <i class="bi bi-pencil"></i> Chỉnh sửa
                            </button>
                            <button onclick="viewClassDetails('${cls.classId}')" style="flex: 1; padding: 10px 16px; background: #2563EB; border: none; border-radius: 8px; color: #ffffff; font-size: 0.85rem; font-weight: 500; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px; transition: all 150ms ease;">
                                <i class="bi bi-eye"></i> Xem chi tiết
                            </button>
                            <button onclick="archiveClassById('${cls.classId}')" title="Lưu trữ" style="padding: 10px 12px; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; color: #64748b; font-size: 0.85rem; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 150ms ease;">
                                <i class="bi bi-archive"></i>
                            </button>
                            <button onclick="deleteClassById('${cls.classId}')" style="padding: 10px 12px; background: #ffffff; border: 1px solid #fecaca; border-radius: 8px; color: #dc2626; font-size: 0.85rem; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 150ms ease;">
                                <i class="bi bi-trash"></i>
                            </button>
                        `}
                    </div>
                </div>
            `;
        });

        html += '</div>';

        // Add hover styles
        html += `
            <style>
                .class-card:hover {
                    box-shadow: 0 4px 12px rgba(0,0,0,0.1);
                    border-color: #cbd5e1;
                }
                .class-card button:hover {
                    opacity: 0.9;
                }
            </style>
        `;

        container.innerHTML = html;

    } catch (error) {
        console.error('Error rendering classes list:', error);
        container.innerHTML = `
            <div style="text-align: center; padding: 60px 40px; color: #dc2626;">
                <i class="bi bi-exclamation-circle" style="font-size: 2.5rem; display: block; margin-bottom: 16px;"></i>
                <p style="font-size: 1.1em; margin-bottom: 8px; color: #1e293b;">Không thể tải danh sách lớp học</p>
                <p style="margin-bottom: 20px; color: #64748b;">${error.message}</p>
                <button onclick="renderClassesList()" style="padding: 10px 20px; background: #2563EB; border: none; border-radius: 8px; color: white; cursor: pointer;">
                    <i class="bi bi-arrow-clockwise me-1"></i> Thử lại
                </button>
            </div>
        `;
    }
}

// ========================================
// PROFILE MANAGEMENT FUNCTIONS
// ========================================

async function editProfile(profileId) {
    try {
        const profilesData = getProfileData();
        const profile = profilesData ? profilesData[profileId] : null;
        if (!profile) {
            alert('Không tìm thấy profile!');
            return;
        }

        setCurrentProfileId(profileId);

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
        const sourceProfile = getProfileById(profileId);
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
            setProfileEntry(newProfileData.profileId, newProfileData);
            setCurrentProfileId(newProfileData.profileId);
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

    const profile = getProfileById(profileId);
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
            removeProfileEntry(profileId);

            if (getCurrentProfileId() === profileId) {
                setCurrentProfileId('default');
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
        profileId: getCurrentProfileId(),
        name: name,
        passThreshold: threshold,
        weights: newWeights
    };

    try {
        const result = await API.updateProfile(profileData.profileId, profileData);

        if (result.success) {
            setProfileEntry(profileData.profileId, profileData);
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

async function deleteCurrentProfile() {
    const selectedProfileId = getCurrentProfileId();

    if (!selectedProfileId) {
        alert('Không có profile nào được chọn!');
        return;
    }

    if (selectedProfileId === 'default') {
        alert('Không thể xóa profile mặc định!');
        return;
    }

    const profile = getProfileById(selectedProfileId);
    if (!profile) {
        alert('Không tìm thấy profile!');
        return;
    }

    if (!confirm(`Bạn có chắc muốn xóa profile "${profile.name}"?`)) {
        return;
    }

    try {
        const result = await API.deleteProfile(selectedProfileId);

        if (result.success) {
            removeProfileEntry(selectedProfileId);
            setCurrentProfileId('default');
            updateProfileSelect();
            await renderProfilesList();
            closeProfileModal();
            alert('Đã xóa profile!');
        } else {
            alert('Lỗi xóa profile: ' + (result.message || 'Unknown error'));
        }
    } catch (error) {
        console.error('Error deleting profile:', error);
        alert('Lỗi: ' + error.message);
    }
}

async function exportAllProfiles() {
    try {
        const data = JSON.stringify(getProfileData(), null, 2);
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

async function createDefaultProfileQuick() {
    try {
        const response = await fetch('/api/profiles/default', {
            method: 'POST',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        const result = await response.json();
        if (!response.ok || !result.success) {
            throw new Error(result.message || 'Không thể tạo profile mặc định');
        }

        const profileData = result.data;
        setProfileEntry(profileData.profileId, {
            profileId: profileData.profileId,
            name: profileData.name,
            passThreshold: profileData.passThreshold,
            weights: profileData.weights,
            isDefault: profileData.isDefault
        });

        setCurrentProfileId(profileData.profileId);
        loadProfile();
        updateProfileSelect();
        await renderProfilesList();

        alert(result.message || 'Đã tạo profile mặc định!');
    } catch (error) {
        console.error('Error creating default profile:', error);
        alert('Lỗi tạo profile mặc định: ' + error.message);
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
        const classData = getClassById(classId);
        if (!classData) {
            alert('Không tìm thấy lớp!');
            return;
        }

        setCurrentClassId(classId);

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

        const modalEl = document.getElementById('classModal');
        if (modalEl) {
            const modal = bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl);
            modal.show();
        }
    } catch (error) {
        console.error('Error editing class:', error);
        alert('Lỗi: ' + error.message);
    }
}

async function viewClassDetails(classId) {
    if (!classId) return;
    window.location.href = `/classes/${classId}`;
}

function closeClassDetailsModal() {
    const modalElement = document.getElementById('classDetailsModal');
    const modal = bootstrap.Modal.getInstance(modalElement);
    if (modal) {
        modal.hide();
    }
}

async function exportClassToExcel(classId) {
    try {
        const classData = getClassById(classId);
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
    const classData = getClassById(classId);
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
            removeClassEntry(classId);

            if (getCurrentClassId() === classId) {
                setCurrentClassId('');
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
    const name = document.getElementById('className').value.trim();
    const description = document.getElementById('classDescription').value.trim();
    const profileId = document.getElementById('classProfileSelect').value;

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

    try {
        if (isCreatingClass) {
            // Create new class
            const id = 'class_' + Date.now();
            const classData = {
                classId: id,
                name: name,
                description: description,
                students: students,
                grades: profileId ? { profileId: profileId } : null
            };

            const result = await API.createClass(classData);

            if (result.success) {
                setClassEntry(id, classData);
                await renderClassesList(); // Refresh list to show new class
                closeClassModal();
                alert(`Đã tạo lớp "${name}" thành công!`);
            } else {
                alert('Lỗi tạo lớp: ' + (result.message || 'Unknown error'));
            }
        } else {
            // Update existing class
            const selectedClassId = getCurrentClassId();
            if (!selectedClassId) return;

            const classData = {
                classId: selectedClassId,
                name: name,
                description: description,
                students: students,
                grades: profileId ? { profileId: profileId } : null
            };

            const result = await API.updateClass(selectedClassId, classData);

            if (result.success) {
                setClassEntry(selectedClassId, classData);
                await renderClassesList();
                closeClassModal();
                alert(`Đã lưu cập nhật lớp "${name}"!`);
            } else {
                alert('Lỗi lưu lớp: ' + (result.message || 'Unknown error'));
            }
        }

        // Update selects in other tabs
        updateClassSelect();

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
// TEMPLATE PAGE FUNCTIONS
// ========================================

// Update template profile info
function updateTemplateProfile() {
    const select = document.getElementById('templateProfileSelect');
    if (!select) return;

    const profileId = select.value;
    const profilesData = getProfileData();
    const profile = profileId ? profilesData[profileId] : null;
    const infoDiv = document.getElementById('templateProfileInfo');

    if (!profile) {
        if (infoDiv) {
            infoDiv.className = 'alert alert-warning mt-3 mb-0';
            infoDiv.textContent = 'Chưa chọn profile';
        }
        setCurrentProfileId('');
        weights = {};
        passThreshold = 3;
        document.getElementById('generateTemplateBtn').disabled = true;
        updateGenerateButtonState();
        return;
    }

    setCurrentProfileId(profileId);

    if (infoDiv) {
        infoDiv.className = 'alert alert-success mt-3 mb-0';
        const weightsList = Object.entries(profile.weights)
            .map(([key, value]) => `${key}: ${value}%`)
            .join(', ');
        infoDiv.innerHTML = `
            <strong>${profile.name}</strong><br>
            Ngưỡng qua môn: ≥${profile.passThreshold} điểm<br>
            Trọng số: ${weightsList}
        `;
    }

    weights = { ...profile.weights };
    passThreshold = profile.passThreshold || 3;
    if (window.profileManager) {
        window.profileManager.weights = { ...profile.weights };
        window.profileManager.passThreshold = passThreshold;
    }

    updateGenerateButtonState();
}

// Update template class info
function updateTemplateClass() {
    const select = document.getElementById('templateClassSelect');
    if (!select) return;

    const classId = select.value;
    const classesData = getClassesData();
    const classData = classId ? classesData[classId] : null;
    const infoDiv = document.getElementById('templateClassInfo');

    if (!classData) {
        if (infoDiv) {
            infoDiv.className = 'alert alert-info mt-2 mb-0';
            infoDiv.textContent = 'Chưa chọn lớp';
        }
        setCurrentClassId('');
        setClassListData([]);
        document.getElementById('generateTemplateBtn').disabled = true;
        updateGenerateButtonState();
        return;
    }

    setCurrentClassId(classId);
    setClassListData(classData.students || []);

    if (infoDiv) {
        infoDiv.className = 'alert alert-success mt-2 mb-0';
        infoDiv.innerHTML = `
            <strong>${classData.name}</strong><br>
            ${classData.description || ''}<br>
            Số sinh viên: ${classListData.length}
        `;
    }

    updateGenerateButtonState();
}

// Update generate button state
function updateGenerateButtonState() {
    const btn = document.getElementById('generateTemplateBtn');
    if (!btn) return;

    const sourceEl = document.querySelector('input[name="templateSource"]:checked');
    if (!sourceEl) {
        btn.disabled = true;
        return;
    }

    const source = sourceEl.value;
    const profilesData = getProfileData();
    const selectedProfileId = getCurrentProfileId();
    const hasProfile = Boolean(
        selectedProfileId &&
        profilesData[selectedProfileId] &&
        Object.keys(profilesData[selectedProfileId].weights || {}).length
    );

    let hasStudents = false;
    if (source === 'class') {
        const classesData = getClassesData();
        const selectedClassId = getCurrentClassId();
        const classData = selectedClassId ? classesData[selectedClassId] : null;
        hasStudents = Boolean(classData && classData.students && classData.students.length > 0);
    } else if (source === 'upload') {
        const uploadedStudents = getClassListData();
        hasStudents = uploadedStudents && uploadedStudents.length > 0;
    }

    btn.disabled = !(hasProfile && hasStudents);
}

// ========================================
// CLASS DETAIL VIEW - Now handled by ClassesModule
// ========================================
// All class detail functions have been moved to modules/classes.js
