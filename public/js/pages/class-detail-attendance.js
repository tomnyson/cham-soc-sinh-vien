import { uiState } from '/js/modules/uiState.js';
import {
    getInvoiceRangeQuery,
    getInvoiceStudentMssv,
    collectInvoiceConfig
} from '/js/pages/class-detail-invoice.js';
import { appendFormerStudentOptions } from '/js/pages/class-detail-payment.js';
import { vnLocalToIso } from '/js/modules/scheduleForm.js';

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
                // Ô datetime-local là giờ VN → gửi ISO có múi giờ để server UTC lưu đúng ngày
                const date = dateInput && dateInput.value ? vnLocalToIso(dateInput.value) : null;
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
                const invoiceConfig = collectInvoiceConfig();
                const payload = invoiceConfig ? { hourlyRate, invoiceConfig } : { hourlyRate };

                btnSaveConfig.disabled = true;
                btnSaveConfig.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Đang lưu...';

                const res = await fetch(`/api/classes/${classId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
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

const formatVnd = (value) => new Intl.NumberFormat('vi-VN').format(value || 0) + ' đ';

/**
 * Điền ô ĐÃ THU / CÒN NỢ theo khoảng ngày và học viên đang chọn.
 * Lỗi ở đây không chặn bảng lịch sử buổi học.
 * @returns {Promise<object|null>} rangeSummary hoặc null nếu lỗi
 */
async function loadPaymentSummary(classId) {
    const paidEl = document.getElementById('attTotalPaid');
    const outstandingEl = document.getElementById('attTotalOutstanding');
    if (!paidEl || !outstandingEl) return null;

    const params = new URLSearchParams(getInvoiceRangeQuery());
    const mssv = getInvoiceStudentMssv();
    if (mssv) params.set('mssv', mssv);
    const query = params.toString();

    try {
        const res = await fetch(`/api/classes/${classId}/payments${query ? `?${query}` : ''}`);
        const data = await res.json();
        if (!data.success) throw new Error(data.error || 'Không tải được công nợ');
        appendFormerStudentOptions(document.getElementById('invoiceStudent'), data.data.ledger.students);
        const summary = data.data.rangeSummary;
        paidEl.textContent = formatVnd(summary.paid);
        outstandingEl.textContent = formatVnd(summary.outstanding);
        return summary;
    } catch (e) {
        console.error(e);
        paidEl.textContent = '—';
        outstandingEl.textContent = '—';
        return null;
    }
}

window.loadAttendanceHistory = async function loadAttendanceHistory() {
    const classId = document.getElementById('classDetailPage').dataset.classId;
    const tbody = document.getElementById('attendanceHistoryBody');
    const totalRevEl = document.getElementById('attTotalRevenue');

    try {
        tbody.innerHTML = '<tr><td colspan="4" class="text-center py-3">Đang tải...</td></tr>';
        const [res, summary] = await Promise.all([
            fetch(`/api/classes/${classId}/attendance${getInvoiceRangeQuery()}`),
            loadPaymentSummary(classId)
        ]);
        const data = await res.json();

        if (data.success) {
            // Chọn 1 học viên: doanh thu là phần học viên đó phải đóng
            const revenue = getInvoiceStudentMssv() && summary ? summary.charged : data.data.totalRevenue;
            totalRevEl.textContent = formatVnd(revenue);
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
