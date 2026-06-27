import { uiState } from '/js/modules/uiState.js';

// Attendance Logic
document.addEventListener('DOMContentLoaded', function() {
    const dateInput = document.getElementById('attDate');
    const durationInput = document.getElementById('attDuration');
    const rateInput = document.getElementById('attHourlyRate');
    const totalCalc = document.getElementById('attTotalCalc');
    const btnSave = document.getElementById('btnSaveAttendance');

    // Set default date to today
    if (dateInput && !dateInput.value) {
        const today = new Date();
        // offset timezone to local
        const offset = today.getTimezoneOffset() * 60000;
        const localISOTime = (new Date(today - offset)).toISOString().slice(0, 16);
        dateInput.value = localISOTime;
    }

    function updateCalc() {
        const duration = parseFloat(durationInput.value) || 0;
        const rate = parseFloat(rateInput.value) || 0;
        const total = duration * rate;
        totalCalc.textContent = new Intl.NumberFormat('vi-VN').format(total) + ' đ';
    }

    if(durationInput && rateInput) {
        durationInput.addEventListener('input', updateCalc);
        rateInput.addEventListener('input', updateCalc);
        updateCalc();
    }

    if(btnSave) {
        btnSave.addEventListener('click', async () => {
            try {
                const classId = document.getElementById('classDetailPage').dataset.classId;
                const date = dateInput ? dateInput.value : null;
                const duration = parseFloat(durationInput.value) || 1;
                const rate = parseFloat(rateInput.value) || 0;
                
                const rows = document.querySelectorAll('#attendanceTable tbody tr[data-mssv]');
                const records = [];
                rows.forEach(row => {
                    const mssv = row.dataset.mssv;
                    const presentRadio = row.querySelector(`#present_${mssv}`);
                    records.push({
                        mssv: mssv,
                        status: presentRadio && presentRadio.checked ? 'present' : 'absent'
                    });
                });

                btnSave.disabled = true;
                btnSave.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Đang lưu...';

                const res = await fetch(`/api/classes/${classId}/attendance`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ durationHours: duration, hourlyRate: rate, records, date })
                });
                const data = await res.json();
                
                if (data.success) {
                    uiState.showNotification('Đã lưu điểm danh thành công!', 'success');
                    // Reset tab or reload history
                    document.getElementById('tab-attendance-history').click();
                } else {
                    uiState.showNotification(data.error || 'Lỗi khi lưu điểm danh', 'error');
                }
            } catch (e) {
                console.error(e);
                uiState.showNotification('Lỗi kết nối khi lưu điểm danh.', 'error');
            } finally {
                btnSave.disabled = false;
                btnSave.innerText = 'Lưu Điểm Danh';
            }
        });
    }

    const btnSaveConfig = document.getElementById('btnSaveAttendanceConfig');
    const configRateInput = document.getElementById('attConfigHourlyRate');

    if (btnSaveConfig && configRateInput) {
        btnSaveConfig.addEventListener('click', async () => {
            try {
                const classId = document.getElementById('classDetailPage').dataset.classId;
                const hourlyRate = parseFloat(configRateInput.value) || 0;

                btnSaveConfig.disabled = true;
                btnSaveConfig.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Đang lưu...';

                const res = await fetch(`/api/classes/${classId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ hourlyRate })
                });
                const data = await res.json();
                
                if (data.success) {
                    uiState.showNotification('Đã lưu cấu hình thành công!', 'success');
                    // Update the rate input in the first tab
                    if (rateInput) {
                        rateInput.value = hourlyRate;
                        updateCalc();
                    }
                } else {
                    uiState.showNotification(data.error || 'Lỗi khi lưu cấu hình', 'error');
                }
            } catch (e) {
                console.error(e);
                uiState.showNotification('Lỗi kết nối khi lưu cấu hình.', 'error');
            } finally {
                btnSaveConfig.disabled = false;
                btnSaveConfig.innerText = 'Lưu Cấu Hình';
            }
        });
    }
});

window.loadAttendanceHistory = async function loadAttendanceHistory() {
    const classId = document.getElementById('classDetailPage').dataset.classId;
    const tbody = document.getElementById('attendanceHistoryBody');
    const totalRevEl = document.getElementById('attTotalRevenue');
    
    try {
        tbody.innerHTML = '<tr><td colspan="4" class="text-center py-3">Đang tải...</td></tr>';
        const res = await fetch(`/api/classes/${classId}/attendance`);
        const data = await res.json();
        
        if (data.success) {
            totalRevEl.textContent = new Intl.NumberFormat('vi-VN').format(data.data.totalRevenue) + ' đ';
            const sessions = data.data.sessions;
            if(sessions.length === 0) {
                tbody.innerHTML = '<tr><td colspan="4" class="text-center py-4 text-muted">Chưa có buổi học nào.</td></tr>';
                return;
            }

            let html = '';
            sessions.forEach(s => {
                const date = new Date(s.date).toLocaleString('vi-VN');
                const presentCount = s.records.filter(r => r.status === 'present').length;
                const totalCost = new Intl.NumberFormat('vi-VN').format(s.totalCost) + ' đ';
                html += `
                    <tr>
                        <td><strong>${date}</strong></td>
                        <td>${s.durationHours} giờ</td>
                        <td>${presentCount} / ${s.records.length}</td>
                        <td class="text-end fw-bold text-primary">${totalCost}</td>
                    </tr>
                `;
            });
            tbody.innerHTML = html;
        }
    } catch (e) {
        console.error(e);
        tbody.innerHTML = '<tr><td colspan="4" class="text-center py-3 text-danger">Lỗi tải lịch sử.</td></tr>';
    }
}
