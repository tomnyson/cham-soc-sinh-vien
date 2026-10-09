/**
 * Payment Utilities
 * Các hàm thuần phục vụ ghi nhận thu tiền và tính công nợ từng học viên.
 * Không đọc / ghi database.
 */

const PAYMENT_METHODS = Object.freeze({
  cash: 'Tiền mặt',
  transfer: 'Chuyển khoản',
  discount: 'Giảm trừ',
});

const NOTE_MAX_LENGTH = 300;
const MAX_PAYMENT_AMOUNT = 10_000_000_000;

/**
 * Danh sách mssv duy nhất của một buổi, sắp xếp tăng dần để chia tiền tất định.
 * @param {object} session
 * @returns {string[]}
 */
function getSessionMssvList(session) {
  const records = session && Array.isArray(session.records) ? session.records : [];
  const unique = new Set(records.filter(r => r && r.mssv).map(r => String(r.mssv)));
  return [...unique].sort();
}

/**
 * Chia tiền một buổi đều cho mọi học viên có trong buổi (kể cả vắng).
 * Chia theo đồng; phần dư cộng 1đ lần lượt theo mssv tăng dần để tổng luôn bằng totalCost.
 * @param {object} session - buổi điểm danh { totalCost, records }
 * @returns {Map<string, number>} mssv → số tiền phải trả
 */
function allocateSessionCost(session) {
  const mssvList = getSessionMssvList(session);
  if (!mssvList.length) return new Map();

  const total = Math.max(Math.round(Number(session.totalCost) || 0), 0);
  const base = Math.floor(total / mssvList.length);
  const remainder = total - base * mssvList.length;

  return new Map(mssvList.map((mssv, i) => [mssv, base + (i < remainder ? 1 : 0)]));
}

/**
 * @param {object} payment
 * @returns {boolean} true nếu khoản thu còn hiệu lực (chưa bị huỷ)
 */
function isActivePayment(payment) {
  return Boolean(payment) && (payment.status || 'active') === 'active';
}

/**
 * Tổng các khoản thu còn hiệu lực, lọc theo mssv nếu có.
 * @param {Array} payments
 * @param {string} [mssv]
 * @returns {number}
 */
function sumActivePayments(payments, mssv) {
  const list = Array.isArray(payments) ? payments : [];
  return list
    .filter(isActivePayment)
    .filter(p => !mssv || p.mssv === mssv)
    .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
}

/**
 * Sổ công nợ từng học viên: phát sinh (theo phần chia buổi học), đã thu, còn nợ.
 * Học viên trong danh sách lớp giữ nguyên thứ tự; học viên đã rời lớp xếp sau.
 * @param {object} params
 * @param {Array} params.students - danh sách học viên hiện tại của lớp
 * @param {Array} params.sessions - các buổi điểm danh
 * @param {Array} params.payments - các khoản thu
 * @returns {{ students: Array, totals: { charged: number, paid: number, outstanding: number, unallocated: number } }}
 */
function buildStudentLedger({ students = [], sessions = [], payments = [] } = {}) {
  const classStudents = Array.isArray(students) ? students : [];
  const sessionList = Array.isArray(sessions) ? sessions : [];

  const charges = new Map();
  const counts = new Map();
  let unallocated = 0;

  sessionList.forEach(session => {
    const shares = allocateSessionCost(session);
    if (!shares.size) {
      unallocated += Math.max(Math.round(Number(session && session.totalCost) || 0), 0);
      return;
    }
    shares.forEach((share, mssv) => {
      charges.set(mssv, (charges.get(mssv) || 0) + share);
      counts.set(mssv, (counts.get(mssv) || 0) + 1);
    });
  });

  const paidByMssv = new Map();
  (Array.isArray(payments) ? payments : []).filter(isActivePayment).forEach(p => {
    const key = String(p.mssv || '');
    if (key) paidByMssv.set(key, (paidByMssv.get(key) || 0) + (Number(p.amount) || 0));
  });

  const classMssv = new Set(classStudents.map(s => String(s.mssv)));
  const formerMssv = [...new Set([...charges.keys(), ...paidByMssv.keys()])]
    .filter(mssv => !classMssv.has(mssv))
    .sort();

  const toEntry = (mssv, name, inClass) => {
    const charged = charges.get(mssv) || 0;
    const paid = paidByMssv.get(mssv) || 0;
    return {
      mssv,
      name,
      inClass,
      sessionCount: counts.get(mssv) || 0,
      charged,
      paid,
      outstanding: charged - paid,
    };
  };

  const entries = [
    ...classStudents.map(s => toEntry(String(s.mssv), String(s.name || ''), true)),
    ...formerMssv.map(mssv => toEntry(mssv, '', false)),
  ];

  const totals = entries.reduce(
    (acc, e) => ({
      charged: acc.charged + e.charged,
      paid: acc.paid + e.paid,
      outstanding: acc.outstanding + e.outstanding,
      unallocated: acc.unallocated,
    }),
    { charged: 0, paid: 0, outstanding: 0, unallocated }
  );

  return { students: entries, totals };
}

/**
 * Validate + chuẩn hoá dữ liệu một lần thu tiền gửi từ client.
 * @param {object} body - { mssv, amount, paidAt, method, note }
 * @param {Array} classStudents - danh sách học viên hiện tại của lớp
 * @returns {{ value: object|null, error: string }}
 */
function parsePaymentInput(body, classStudents) {
  const source = body || {};
  const fail = error => ({ value: null, error });

  const mssv = String(source.mssv || '').trim();
  if (!mssv) return fail('Vui lòng chọn học viên.');
  const students = Array.isArray(classStudents) ? classStudents : [];
  if (!students.some(s => String(s.mssv) === mssv)) return fail('Học viên không thuộc lớp này.');

  const rawAmount = typeof source.amount === 'string' ? source.amount.trim() : source.amount;
  const amount = rawAmount === '' || rawAmount === null ? NaN : Number(rawAmount);
  if (!Number.isInteger(amount) || amount <= 0) return fail('Số tiền phải là số nguyên lớn hơn 0.');
  if (amount > MAX_PAYMENT_AMOUNT) return fail('Số tiền vượt quá giới hạn cho phép.');

  const paidAt = source.paidAt ? new Date(source.paidAt) : new Date();
  if (Number.isNaN(paidAt.getTime())) return fail('Ngày thu không hợp lệ.');

  const method = source.method ? String(source.method) : 'cash';
  if (!Object.prototype.hasOwnProperty.call(PAYMENT_METHODS, method)) {
    return fail('Hình thức thu không hợp lệ.');
  }

  const note = String(source.note || '').trim();
  if (note.length > NOTE_MAX_LENGTH) return fail(`Ghi chú tối đa ${NOTE_MAX_LENGTH} ký tự.`);

  return { value: { mssv, amount, paidAt, method, note }, error: '' };
}

module.exports = {
  PAYMENT_METHODS,
  NOTE_MAX_LENGTH,
  allocateSessionCost,
  isActivePayment,
  sumActivePayments,
  buildStudentLedger,
  parsePaymentInput,
};
