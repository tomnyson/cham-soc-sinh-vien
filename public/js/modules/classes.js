// ========================================
// CLASSES MODULE
// ========================================

const ClassesModule = {
    currentView: 'list', // 'list' or 'detail'
    currentClassId: null,

    // Initialize module
    init() {
        console.log('Classes Module initialized');
    },

    // Show classes list view
    showList() {
        this.currentView = 'list';
        this.currentClassId = null;

        // Switch to classes tab
        document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
        document.getElementById('tab-classes').classList.add('active');

        // Show list view, hide detail view
        document.getElementById('classes-list-view').style.display = 'block';
        document.getElementById('class-detail-view').style.display = 'none';

        // Load classes list
        this.loadClassesList();
    },

    // Show class detail view
    async showDetail(classId) {
        this.currentView = 'detail';
        this.currentClassId = classId;

        // Switch to classes tab
        document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
        document.getElementById('tab-classes').classList.add('active');

        // Show detail view, hide list view
        document.getElementById('classes-list-view').style.display = 'none';
        document.getElementById('class-detail-view').style.display = 'block';

        // Populate profile select
        this.populateProfileSelect();

        // Load class details
        await this.loadClassDetail(classId);
    },

    // Populate profile select dropdown
    populateProfileSelect() {
        const select = document.getElementById('classProfileSelect');
        if (!select) {
            console.warn('classProfileSelect not found');
            return;
        }

        // Clear and repopulate
        select.innerHTML = '<option value="">-- Chọn profile điểm --</option>';

        if (typeof profiles !== 'undefined') {
            console.log('profiles', profiles)
            Object.entries(profiles).forEach(([key, profile]) => {
                const option = document.createElement('option');
                option.value = key;
                option.textContent = profile.name;
                select.appendChild(option);
            });

            // Select current profile if exists and trigger render
            const classData = classes[this.currentClassId];
            if (classData && classData.grades && classData.grades.profileId) {
                select.value = classData.grades.profileId;

                // Trigger changeProfile to render grades table
                const profile = profiles[classData.grades.profileId];
                if (profile) {
                    this.renderGradesTable(profile);
                }
            }
        } else {
            console.warn('Profiles not loaded');
        }
    },

    // Change profile for class
    async changeProfile() {
        const select = document.getElementById('classProfileSelect');
        if (!select || !select.value) {
            this.renderGradesTable(null);
            return;
        }

        const profileId = select.value;
        const profile = profiles[profileId];

        if (!profile) {
            console.error('Profile not found:', profileId);
            return;
        }

        // Update class data
        const classData = classes[this.currentClassId];
        if (!classData.grades) {
            classData.grades = {
                profileId: profileId,
                students: {}
            };
        } else {
            classData.grades.profileId = profileId;
        }

        // Render grades table
        this.renderGradesTable(profile);
    },

    // Render grades table
    renderGradesTable(profile) {
        const headerRow = document.getElementById('gradesTableHeader');
        const tbody = document.getElementById('gradesTableBody');

        if (!headerRow || !tbody) {
            console.error('Grades table elements not found');
            return;
        }

        if (!profile) {
            // No profile selected
            headerRow.innerHTML = `
                <th style="width: 60px;" class="text-center">STT</th>
                <th style="width: 120px;">MSSV</th>
                <th style="min-width: 200px;">Họ và tên</th>
                <th style="width: 100px;" class="text-center">Tổng</th>
                <th style="width: 120px;" class="text-center">Trạng thái</th>
            `;
            tbody.innerHTML = `
                <tr>
                    <td colspan="5" class="text-center py-5">
                        <div class="text-muted">
                            <i class="bi bi-info-circle fs-3 d-block mb-2"></i>
                            Vui lòng chọn profile điểm
                        </div>
                    </td>
                </tr>
            `;
            return;
        }

        const classData = classes[this.currentClassId];
        if (!classData || !classData.students || classData.students.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="5" class="text-center py-5 text-muted">
                        <i class="bi bi-inbox fs-1 d-block mb-2"></i>
                        Chưa có sinh viên nào trong lớp
                    </td>
                </tr>
            `;
            return;
        }

        // Build header with grade columns
        const gradeColumns = Object.keys(profile.weights).sort((a, b) => {
            const getOrder = (key) => {
                if (key.includes('Lab')) return 1;
                if (key.includes('Quiz')) return 2;
                if (key.includes('GD')) return 3;
                return 4;
            };
            return getOrder(a) - getOrder(b);
        });

        headerRow.innerHTML = `
            <th style="width: 60px;" class="text-center">STT</th>
            <th style="width: 120px;">MSSV</th>
            <th style="min-width: 200px;">Họ và tên</th>
            ${gradeColumns.map(col => `
                <th class="grade-column-header">
                    ${col}
                    <small>${profile.weights[col]}%</small>
                </th>
            `).join('')}
            <th style="width: 100px;" class="text-center">Tổng</th>
            <th style="width: 120px;" class="text-center">Trạng thái</th>
        `;

        // Build table body
        const gradesData = classData.grades?.students || {};

        tbody.innerHTML = classData.students.map((student, index) => {
            const studentGrades = gradesData[student.mssv] || {};
            const total = this.calculateTotal(studentGrades, profile.weights);
            const passed = total >= (profile.passThreshold || 3);

            return `
                <tr>
                    <td class="text-center">${index + 1}</td>
                    <td><span class="badge bg-primary">${student.mssv}</span></td>
                    <td>${student.name}</td>
                    ${gradeColumns.map(col => `
                        <td class="text-center">
                            <input type="number" 
                                   class="grade-input" 
                                   min="0" 
                                   max="100" 
                                   step="0.1"
                                   value="${studentGrades[col] || ''}"
                                   placeholder="0"
                                   data-mssv="${student.mssv}"
                                   data-column="${col}"
                                   onchange="ClassesModule.updateGrade(this)">
                        </td>
                    `).join('')}
                    <td class="text-center">
                        <span class="total-score" data-mssv="${student.mssv}">${total.toFixed(2)}</span>
                    </td>
                    <td class="text-center">
                        <span class="status-${passed ? 'pass' : 'fail'}">
                            ${passed ? '✓ Đạt' : '✗ Chưa đạt'}
                        </span>
                    </td>
                </tr>
            `;
        }).join('');
    },

    // Calculate total score
    calculateTotal(studentGrades, weights) {
        let total = 0;
        for (const [column, weight] of Object.entries(weights)) {
            const score = parseFloat(studentGrades[column]) || 0;
            total += (score / 100) * weight;
        }
        return total;
    },

    // Update grade when input changes
    updateGrade(input) {
        const mssv = input.dataset.mssv;
        const column = input.dataset.column;
        const value = parseFloat(input.value) || 0;

        // Validate
        if (value < 0 || value > 100) {
            input.classList.add('is-invalid');
            alert('Điểm phải từ 0 đến 100');
            return;
        }
        input.classList.remove('is-invalid');

        // Update data
        const classData = classes[this.currentClassId];
        if (!classData.grades) {
            classData.grades = { profileId: '', students: {} };
        }
        if (!classData.grades.students[mssv]) {
            classData.grades.students[mssv] = {};
        }
        classData.grades.students[mssv][column] = value;

        // Recalculate total
        const profileId = classData.grades.profileId;
        const profile = profiles[profileId];
        if (profile) {
            const total = this.calculateTotal(classData.grades.students[mssv], profile.weights);
            const totalEl = document.querySelector(`.total-score[data-mssv="${mssv}"]`);
            if (totalEl) {
                totalEl.textContent = total.toFixed(2);
            }

            // Update status
            const passed = total >= (profile.passThreshold || 3);
            const statusEl = totalEl?.parentElement.nextElementSibling.querySelector('span');
            if (statusEl) {
                statusEl.className = passed ? 'status-pass' : 'status-fail';
                statusEl.textContent = passed ? '✓ Đạt' : '✗ Chưa đạt';
            }
        }
    },

    // Save grades to server
    async saveGrades() {
        if (!this.currentClassId) return;

        const classData = classes[this.currentClassId];
        if (!classData || !classData.grades) {
            alert('Chưa có điểm để lưu!');
            return;
        }

        try {
            const result = await API.updateClass(this.currentClassId, classData);

            if (result.success) {
                alert('Đã lưu điểm thành công!');
            } else {
                alert('Lỗi lưu điểm: ' + (result.message || 'Unknown error'));
            }
        } catch (error) {
            console.error('Error saving grades:', error);
            alert('Lỗi: ' + error.message);
        }
    },

    // Export grades to Excel
    async exportGrades() {
        if (!this.currentClassId) return;

        const classData = classes[this.currentClassId];
        if (!classData || !classData.grades || !classData.grades.profileId) {
            alert('Vui lòng chọn profile điểm trước!');
            return;
        }

        const profile = profiles[classData.grades.profileId];
        if (!profile) {
            alert('Profile không tồn tại!');
            return;
        }

        try {
            const wb = XLSX.utils.book_new();

            // Prepare headers
            const gradeColumns = Object.keys(profile.weights).sort();
            const headers = ['STT', 'MSSV', 'Họ và tên', ...gradeColumns, 'Tổng', 'Trạng thái'];

            // Prepare data
            const data = [headers];
            const gradesData = classData.grades.students || {};

            classData.students.forEach((student, index) => {
                const studentGrades = gradesData[student.mssv] || {};
                const total = this.calculateTotal(studentGrades, profile.weights);
                const passed = total >= (profile.passThreshold || 3);

                const row = [
                    index + 1,
                    student.mssv,
                    student.name,
                    ...gradeColumns.map(col => studentGrades[col] || 0),
                    total.toFixed(2),
                    passed ? 'Đạt' : 'Chưa đạt'
                ];
                data.push(row);
            });

            const ws = XLSX.utils.aoa_to_sheet(data);
            XLSX.utils.book_append_sheet(wb, ws, 'Bảng điểm');

            const filename = `BangDiem_${classData.name}_${Date.now()}.xlsx`;
            XLSX.writeFile(wb, filename);

            alert('Đã xuất bảng điểm!');
        } catch (error) {
            console.error('Error exporting grades:', error);
            alert('Lỗi xuất file: ' + error.message);
        }
    },

    // Upload grades from Excel
    async uploadGrades(event) {
        const file = event.target.files[0];
        if (!file) return;

        if (!this.currentClassId) {
            alert('Lỗi: Không xác định được lớp!');
            return;
        }

        const classData = classes[this.currentClassId];
        if (!classData.grades || !classData.grades.profileId) {
            alert('Vui lòng chọn profile điểm trước!');
            event.target.value = '';
            return;
        }

        try {
            const data = await this.readExcelFile(file);
            if (data.length < 2) {
                alert('File không có dữ liệu hợp lệ!');
                return;
            }

            const headers = data[0];
            const mssvIndex = headers.findIndex(h => h && h.toString().toLowerCase().includes('mssv'));

            if (mssvIndex === -1) {
                alert('Không tìm thấy cột MSSV!');
                return;
            }

            // Get profile to know which columns to import
            const profile = profiles[classData.grades.profileId];
            const gradeColumns = Object.keys(profile.weights);

            // Helper function to normalize column name for matching
            const normalizeColumnName = (str) => {
                if (!str) return '';
                return str.toString()
                    .trim()
                    .toLowerCase()
                    .replace(/\s*\([^)]*\)/g, '') // Remove (3.5%), (10%), etc.
                    .replace(/\s+/g, ' ')          // Normalize spaces
                    .trim();
            };

            // Find grade column indices in Excel with fuzzy matching
            const gradeColumnIndices = {};
            gradeColumns.forEach(col => {
                const normalizedCol = normalizeColumnName(col);

                // Try exact match first
                let index = headers.findIndex(h =>
                    h && normalizeColumnName(h) === normalizedCol
                );

                // If not found, try partial match (contains)
                if (index === -1) {
                    index = headers.findIndex(h =>
                        h && normalizeColumnName(h).includes(normalizedCol)
                    );
                }

                if (index !== -1) {
                    gradeColumnIndices[col] = index;
                    console.log(`✓ Matched: "${col}" -> Excel column "${headers[index]}"`);
                }
            });

            if (Object.keys(gradeColumnIndices).length === 0) {
                alert('Không tìm thấy cột điểm nào khớp với profile!\n\nCác cột cần có: ' + gradeColumns.join(', '));
                event.target.value = '';
                return;
            }

            // Override all grades - clear existing grades first
            classData.grades.students = {};

            // Import grades from Excel
            let importCount = 0;
            let skippedCount = 0;

            for (let i = 1; i < data.length; i++) {
                const row = data[i];
                const mssv = row[mssvIndex]?.toString().trim();

                if (!mssv) continue;

                // Find student in class
                const student = classData.students.find(s => s.mssv === mssv);
                if (!student) {
                    skippedCount++;
                    continue;
                }

                // Initialize grades for this student
                classData.grades.students[mssv] = {};

                // Import only the columns that match profile
                for (const [colName, colIndex] of Object.entries(gradeColumnIndices)) {
                    const score = parseFloat(row[colIndex]);
                    if (!isNaN(score) && score >= 0 && score <= 100) {
                        classData.grades.students[mssv][colName] = score;
                    } else {
                        // Set to 0 if invalid or empty
                        classData.grades.students[mssv][colName] = 0;
                    }
                }

                importCount++;
            }

            // Refresh table
            this.renderGradesTable(profile);

            // Show result
            let message = `✅ Đã override điểm cho ${importCount} sinh viên!`;
            if (skippedCount > 0) {
                message += `\n⚠️ Bỏ qua ${skippedCount} sinh viên không có trong lớp.`;
            }
            message += `\n\n📊 Các cột đã import: ${Object.keys(gradeColumnIndices).join(', ')}`;
            message += `\n\n💡 Nhớ click "Lưu điểm" để lưu vào database!`;

            alert(message);
        } catch (error) {
            console.error('Error uploading grades:', error);
            alert('Lỗi đọc file: ' + error.message);
        }

        event.target.value = '';
    },

    // Read Excel file
    readExcelFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const data = new Uint8Array(e.target.result);
                    const workbook = XLSX.read(data, { type: 'array' });
                    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
                    const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });
                    resolve(jsonData);
                } catch (error) {
                    reject(error);
                }
            };
            reader.onerror = reject;
            reader.readAsArrayBuffer(file);
        });
    },

    // Load classes list
    async loadClassesList() {
        if (typeof renderClassesList === 'function') {
            await renderClassesList();
        }
    },

    // Load class detail
    async loadClassDetail(classId) {
        try {
            const classData = classes[classId];
            if (!classData) {
                alert('Không tìm thấy lớp!');
                this.showList();
                return;
            }

            // Update class info
            document.getElementById('classDetailName').textContent = classData.name;
            document.getElementById('classDetailDescription').textContent = classData.description || 'Chưa có mô tả';
            document.getElementById('classDetailStudentCount').textContent = classData.students ? classData.students.length : 0;

            // Format dates
            const createdDate = classData.createdAt ? new Date(classData.createdAt).toLocaleDateString('vi-VN') : '-';
            const updatedDate = classData.updatedAt ? new Date(classData.updatedAt).toLocaleDateString('vi-VN') : '-';
            document.getElementById('classDetailCreatedDate').textContent = createdDate;
            document.getElementById('classDetailUpdatedDate').textContent = updatedDate;

            // Render grades table if profile is selected
            if (classData.grades && classData.grades.profileId) {
                const profile = profiles[classData.grades.profileId];
                if (profile) {
                    this.renderGradesTable(profile);
                }
            }

        } catch (error) {
            console.error('Error loading class detail:', error);
            alert('Lỗi: ' + error.message);
            this.showList();
        }
    },



    // Remove student from class
    async removeStudent(mssv) {
        if (!this.currentClassId) return;

        if (!confirm(`Bạn có chắc muốn xóa sinh viên ${mssv} khỏi lớp?`)) {
            return;
        }

        try {
            const classData = classes[this.currentClassId];
            if (!classData) return;

            // Remove student from array
            classData.students = classData.students.filter(s => s.mssv !== mssv);

            // Update via API
            const result = await API.updateClass(this.currentClassId, classData);

            if (result.success) {
                // Update local cache
                classes[this.currentClassId] = classData;

                // Refresh detail view
                await this.loadClassDetail(this.currentClassId);

                alert('Đã xóa sinh viên!');
            } else {
                alert('Lỗi xóa sinh viên: ' + (result.message || 'Unknown error'));
            }
        } catch (error) {
            console.error('Error removing student:', error);
            alert('Lỗi: ' + error.message);
        }
    },

    // Export students to Excel
    async exportStudents() {
        if (!this.currentClassId) return;

        const classData = classes[this.currentClassId];
        if (!classData || !classData.students || classData.students.length === 0) {
            alert('Lớp chưa có sinh viên để xuất!');
            return;
        }

        try {
            // Create workbook
            const wb = XLSX.utils.book_new();

            // Prepare data
            const data = [
                ['STT', 'MSSV', 'Họ và tên'],
                ...classData.students.map((student, index) => [
                    index + 1,
                    student.mssv,
                    student.name
                ])
            ];

            // Create worksheet
            const ws = XLSX.utils.aoa_to_sheet(data);

            // Set column widths
            ws['!cols'] = [
                { wch: 5 },
                { wch: 15 },
                { wch: 30 }
            ];

            // Add worksheet to workbook
            XLSX.utils.book_append_sheet(wb, ws, 'Danh sách');

            // Generate filename
            const filename = `DanhSach_${classData.name.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}.xlsx`;

            // Save file
            XLSX.writeFile(wb, filename);

            alert('Đã xuất danh sách sinh viên!');
        } catch (error) {
            console.error('Error exporting students:', error);
            alert('Lỗi xuất file: ' + error.message);
        }
    },

    // Edit current class
    editClass() {
        if (this.currentClassId && typeof editClassById === 'function') {
            editClassById(this.currentClassId);
        }
    },

    // Cleanup
    cleanup() {
        console.log('Classes Module cleanup');
        this.currentView = 'list';
        this.currentClassId = null;
    }
};

// Make globally available
window.ClassesModule = ClassesModule;
