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
function initDefaultProfiles() {
    const defaultProfile = {
        name: 'Mặc định (60%)',
        passThreshold: 3,
        weights: {
            'Lab 1': 3.5,
            'Lab 2': 3.5,
            'Lab 3': 3.5,
            'Lab 4': 3.5,
            'Lab 5': 3.5,
            'Lab 6': 3.5,
            'Lab 7': 3.5,
            'Lab 8': 3.5,
            'Quiz 1': 1.5,
            'Quiz 2': 1.5,
            'Quiz 3': 1.5,
            'Quiz 4': 1.5,
            'Quiz 5': 1.5,
            'Quiz 6': 1.5,
            'Quiz 7': 1.5,
            'Quiz 8': 1.5,
            'GD 1': 10,
            'GD 2': 10
        }
    };

    // Load từ localStorage hoặc dùng mặc định
    const saved = localStorage.getItem('gradeProfiles');
    if (saved) {
        profiles = JSON.parse(saved);
    } else {
        profiles = { default: defaultProfile };
        saveProfiles();
    }

    // Load profile hiện tại
    const savedCurrent = localStorage.getItem('currentProfile');
    if (savedCurrent && profiles[savedCurrent]) {
        currentProfile = savedCurrent;
    }

    loadProfile();
    updateProfileSelect();
}

function saveProfiles() {
    localStorage.setItem('gradeProfiles', JSON.stringify(profiles));
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
    const select = document.getElementById('profileSelect');
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
}

function updateWeightSummary() {
    const total = Object.values(weights).reduce((sum, w) => sum + w, 0);
    const profile = profiles[currentProfile];
    document.getElementById('currentWeightSummary').innerHTML =
        `Đang sử dụng: <strong>${profile.name}</strong> - Tổng: ${total.toFixed(1)}% - Qua môn: ≥${passThreshold} điểm`;
}

// Chỉnh sửa trọng số
function openWeightEditor() {
    const profile = profiles[currentProfile];
    document.getElementById('profileName').value = profile.name;
    document.getElementById('passThreshold').value = profile.passThreshold || 3;

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
    document.getElementById('totalWeight').textContent = total.toFixed(1);
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
    reader.onload = function(e) {
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
function initClasses() {
    const saved = localStorage.getItem('classes');
    if (saved) {
        classes = JSON.parse(saved);
    }
    updateClassSelect();
}

function saveClasses() {
    localStorage.setItem('classes', JSON.stringify(classes));
}

function updateClassSelect() {
    const select = document.getElementById('classSelect');
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

    updateGenerateButtonState();
}

function loadClass() {
    const select = document.getElementById('classSelect');
    currentClass = select.value;

    if (currentClass && classes[currentClass]) {
        const classData = classes[currentClass];
        classListData = classData.students || [];

        document.getElementById('classInfo').style.display = 'block';
        document.getElementById('classDetails').textContent =
            `${classData.name} - ${classData.description || ''} (${classListData.length} sinh viên)`;
    } else {
        classListData = [];
        document.getElementById('classInfo').style.display = 'none';
    }

    updateGenerateButtonState();
}

function createNewClass() {
    const name = prompt('Nhập tên lớp (VD: SE1801):');
    if (!name) return;

    const id = 'class_' + Date.now();
    classes[id] = {
        name: name,
        description: '',
        students: []
    };

    currentClass = id;
    saveClasses();
    updateClassSelect();
    editClass();
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

function saveClass() {
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

    classes[currentClass] = {
        name: name,
        description: description,
        students: students
    };

    saveClasses();
    updateClassSelect();
    loadClass();
    closeClassEditor();
    alert(`Đã lưu lớp "${name}" với ${students.length} sinh viên!`);
}

function deleteClass() {
    if (!currentClass) {
        alert('Vui lòng chọn lớp trước!');
        return;
    }

    const classData = classes[currentClass];
    if (confirm(`Bạn có chắc muốn xóa lớp "${classData.name}"?`)) {
        delete classes[currentClass];
        currentClass = '';
        classListData = [];
        saveClasses();
        updateClassSelect();
        document.getElementById('classInfo').style.display = 'none';
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
    const source = document.querySelector('input[name="templateSource"]:checked').value;
    const btn = document.getElementById('generateTemplateBtn');

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
    initDefaultProfiles();
    initClasses();
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
