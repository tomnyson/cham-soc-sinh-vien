const { normalizeInvoiceConfig } = require('./class.service');

describe('normalizeInvoiceConfig', () => {
  it('trả object với đủ 8 field rỗng khi đầu vào rỗng', () => {
    expect(normalizeInvoiceConfig()).toEqual({
      centerName: '',
      payerName: '',
      payerPhone: '',
      payerAddress: '',
      bankCode: '',
      bankAccount: '',
      bankAccountName: '',
      note: '',
    });
    expect(normalizeInvoiceConfig(null)).toEqual(normalizeInvoiceConfig({}));
  });

  it('trim khoảng trắng thừa', () => {
    const result = normalizeInvoiceConfig({ centerName: '  Trung tâm ABC  ', payerName: ' A ' });
    expect(result.centerName).toBe('Trung tâm ABC');
    expect(result.payerName).toBe('A');
  });

  it('bỏ qua key lạ không nằm trong whitelist', () => {
    const result = normalizeInvoiceConfig({ centerName: 'X', hackedField: 'evil' });
    expect(result.hackedField).toBeUndefined();
    expect(Object.keys(result).sort()).toEqual([
      'bankAccount',
      'bankAccountName',
      'bankCode',
      'centerName',
      'note',
      'payerAddress',
      'payerName',
      'payerPhone',
    ]);
  });

  it('cắt chuỗi vượt maxlength', () => {
    const result = normalizeInvoiceConfig({ centerName: 'a'.repeat(200), note: 'b'.repeat(400) });
    expect(result.centerName).toHaveLength(120);
    expect(result.note).toHaveLength(300);
  });

  it('ép kiểu số về chuỗi (số tài khoản nhập dạng number)', () => {
    expect(normalizeInvoiceConfig({ bankAccount: 123456 }).bankAccount).toBe('123456');
  });
});
