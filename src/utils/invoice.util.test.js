const { numberToVietnameseWords } = require('./invoice.util');

describe('numberToVietnameseWords', () => {
  it('đọc số 0', () => {
    expect(numberToVietnameseWords(0)).toBe('Không đồng');
  });

  it('đọc số hàng trăm', () => {
    expect(numberToVietnameseWords(105)).toBe('Một trăm linh năm đồng chẵn');
  });

  it('đọc số hàng nghìn tròn', () => {
    expect(numberToVietnameseWords(400000)).toBe('Bốn trăm nghìn đồng chẵn');
  });

  it('đọc số hàng triệu tròn', () => {
    expect(numberToVietnameseWords(6000000)).toBe('Sáu triệu đồng chẵn');
  });

  it('đọc "mốt" khi hàng đơn vị là 1 và hàng chục >= 2', () => {
    expect(numberToVietnameseWords(21000000)).toBe('Hai mươi mốt triệu đồng chẵn');
  });

  it('đọc "lăm" khi hàng đơn vị là 5 và có hàng chục', () => {
    expect(numberToVietnameseWords(15)).toBe('Mười lăm đồng chẵn');
  });

  it('đọc "tư" khi hàng đơn vị là 4 và hàng chục >= 2', () => {
    expect(numberToVietnameseWords(24)).toBe('Hai mươi tư đồng chẵn');
  });

  it('chèn "không trăm" cho nhóm giữa', () => {
    expect(numberToVietnameseWords(1015000)).toBe(
      'Một triệu không trăm mười lăm nghìn đồng chẵn'
    );
  });

  it('đọc số hàng tỷ', () => {
    expect(numberToVietnameseWords(2000000000)).toBe('Hai tỷ đồng chẵn');
  });

  it('làm tròn số thập phân và xử lý đầu vào không hợp lệ', () => {
    expect(numberToVietnameseWords(1000.6)).toBe('Một nghìn đồng chẵn');
    expect(numberToVietnameseWords(NaN)).toBe('Không đồng');
    expect(numberToVietnameseWords(-5)).toBe('Không đồng');
    expect(numberToVietnameseWords(undefined)).toBe('Không đồng');
  });
});
