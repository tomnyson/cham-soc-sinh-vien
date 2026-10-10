const { loadEsModule } = require('../../../test-utils/loadEsModule');

const {
  MAX_SLOTS,
  WEEKDAY_OPTIONS,
  slotToFormValues,
  emptySlotValues,
  buildSlotRow,
  bindSlotRemoval,
  readSlotRows,
  parseAttendParams,
  toDateTimeLocalValue,
  vnLocalToIso,
  fillAttendanceForm,
  buildAttendUrl,
  buildOccurrenceUrl,
} = loadEsModule('public/js/modules/scheduleForm.js');

const API_SLOT = {
  weekday: 1,
  startTime: '18:00',
  endTime: '20:00',
  startDate: '2026-09-06T17:00:00.000Z',
  endDate: null,
  location: 'P.301',
};

const field = (row, name) => row.querySelector(`[data-field="${name}"]`);

beforeEach(() => {
  document.body.replaceChildren();
});

describe('hằng số', () => {
  it('tối đa 14 khung, Thứ Hai đứng đầu, Chủ nhật (0) cuối', () => {
    expect(MAX_SLOTS).toBe(14);
    expect(WEEKDAY_OPTIONS.map(o => o.value)).toEqual(['1', '2', '3', '4', '5', '6', '0']);
    expect(WEEKDAY_OPTIONS[0].label).toBe('Thứ Hai');
    expect(WEEKDAY_OPTIONS[6].label).toBe('Chủ nhật');
  });
});

describe('slotToFormValues / emptySlotValues', () => {
  it('đổi ngày ISO về ngày VN', () => {
    expect(slotToFormValues(API_SLOT)).toEqual({
      weekday: '1',
      startTime: '18:00',
      endTime: '20:00',
      startDate: '2026-09-07',
      endDate: '',
      location: 'P.301',
    });
    expect(slotToFormValues({ ...API_SLOT, endDate: '2026-12-30T17:00:00.000Z' }).endDate).toBe(
      '2026-12-31'
    );
  });

  it('dòng mới mặc định', () => {
    expect(emptySlotValues('2026-10-10')).toEqual({
      weekday: '1',
      startTime: '18:00',
      endTime: '20:00',
      startDate: '2026-10-10',
      endDate: '',
      location: '',
    });
  });
});

describe('buildSlotRow / readSlotRows / bindSlotRemoval', () => {
  const mountRows = valuesList => {
    const tbody = document.createElement('tbody');
    valuesList.forEach(values => tbody.appendChild(buildSlotRow(values)));
    document.body.appendChild(tbody);
    return tbody;
  };

  it('dòng có đủ ô nhập với giá trị và nhãn', () => {
    const row = buildSlotRow(slotToFormValues(API_SLOT));

    expect(row.classList.contains('sched-slot-row')).toBe(true);
    expect(field(row, 'weekday').value).toBe('1');
    expect(field(row, 'weekday').options).toHaveLength(7);
    expect(field(row, 'startTime').type).toBe('time');
    expect(field(row, 'startDate').type).toBe('date');
    expect(field(row, 'startDate').value).toBe('2026-09-07');
    expect(field(row, 'location').maxLength).toBe(100);
    expect(field(row, 'location').getAttribute('aria-label')).toBe('Địa điểm');
    expect(row.querySelector('[data-action="remove"]').getAttribute('aria-label')).toBe(
      'Xoá khung giờ'
    );
  });

  it('đọc form thành payload đúng', () => {
    const tbody = mountRows([
      slotToFormValues(API_SLOT),
      { ...emptySlotValues('2026-10-10'), weekday: '0', endDate: '2026-12-31', location: ' Lab ' },
    ]);

    expect(readSlotRows(tbody)).toEqual([
      {
        weekday: 1,
        startTime: '18:00',
        endTime: '20:00',
        startDate: '2026-09-07',
        endDate: null,
        location: 'P.301',
      },
      {
        weekday: 0,
        startTime: '18:00',
        endTime: '20:00',
        startDate: '2026-10-10',
        endDate: '2026-12-31',
        location: 'Lab',
      },
    ]);
  });

  it('không có dòng → mảng rỗng', () => {
    expect(readSlotRows(mountRows([]))).toEqual([]);
  });

  it('bấm xoá bỏ đúng dòng và gọi onChange', () => {
    const tbody = mountRows([
      slotToFormValues(API_SLOT),
      { ...emptySlotValues('2026-10-10'), location: 'Lab' },
    ]);
    const onChange = jest.fn();
    bindSlotRemoval(tbody, onChange);

    tbody.querySelectorAll('[data-action="remove"]')[0].querySelector('i').click();

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(readSlotRows(tbody).map(s => s.location)).toEqual(['Lab']);
  });
});

describe('parseAttendParams', () => {
  it('đọc attend + hours hợp lệ', () => {
    const result = parseAttendParams('?attend=2026-10-05T11%3A00%3A00.000Z&hours=1.25');
    expect(result.date.toISOString()).toBe('2026-10-05T11:00:00.000Z');
    expect(result.hours).toBe(1.25);
  });

  it.each([['0'], ['0.05'], ['24.5'], ['abc'], ['']])('hours = %p bị bỏ qua', hours => {
    expect(parseAttendParams(`?attend=2026-10-05T11:00:00.000Z&hours=${hours}`).hours).toBeNull();
  });

  it('thiếu hours → hours null', () => {
    expect(parseAttendParams('?attend=2026-10-05T11:00:00.000Z').hours).toBeNull();
  });

  it.each([
    [''],
    ['?hours=2'],
    ['?attend=abc'],
    ['?attend=2026-10-05'],
    ['?attend=2026-13-40T99:00'],
  ])('attend sai → null: %p', search => {
    expect(parseAttendParams(search)).toBeNull();
  });
});

describe('quy đổi giờ VN', () => {
  it('toDateTimeLocalValue', () => {
    expect(toDateTimeLocalValue(new Date('2026-10-05T11:00:00.000Z'))).toBe('2026-10-05T18:00');
    expect(toDateTimeLocalValue(new Date('2026-10-04T23:00:00.000Z'))).toBe('2026-10-05T06:00');
  });

  it('vnLocalToIso: giờ nhập là giờ VN, không phụ thuộc múi giờ máy', () => {
    expect(vnLocalToIso('2026-10-05T18:00')).toBe('2026-10-05T11:00:00.000Z');
    expect(vnLocalToIso('2026-10-05T18:00:30')).toBe('2026-10-05T11:00:30.000Z');
    expect(vnLocalToIso('2026-10-05T06:00')).toBe('2026-10-04T23:00:00.000Z');
  });

  it.each([[''], [null], [undefined], ['abc'], ['2026-10-05']])(
    'vnLocalToIso(%p) → null',
    value => {
      expect(vnLocalToIso(value)).toBeNull();
    }
  );
});

describe('fillAttendanceForm', () => {
  const mountForm = () => {
    const date = document.createElement('input');
    date.type = 'datetime-local';
    date.id = 'attDate';
    const duration = document.createElement('input');
    duration.type = 'number';
    duration.id = 'attDuration';
    duration.step = '0.5';
    duration.min = '0.5';
    duration.value = '1.5';
    document.body.append(date, duration);
    const onInput = jest.fn();
    duration.addEventListener('input', onInput);
    return { date, duration, onInput };
  };

  it('điền giờ VN và thời lượng lẻ 1.25 (không làm tròn theo step), phát sự kiện input', () => {
    const { date, duration, onInput } = mountForm();
    fillAttendanceForm(document, { date: new Date('2026-10-05T11:00:00.000Z'), hours: 1.25 });

    expect(date.value).toBe('2026-10-05T18:00');
    expect(duration.value).toBe('1.25');
    expect(onInput).toHaveBeenCalledTimes(1);
  });

  it('hours null → giữ nguyên thời lượng, không phát sự kiện', () => {
    const { date, duration, onInput } = mountForm();
    fillAttendanceForm(document, { date: new Date('2026-10-05T11:00:00.000Z'), hours: null });

    expect(date.value).toBe('2026-10-05T18:00');
    expect(duration.value).toBe('1.5');
    expect(onInput).not.toHaveBeenCalled();
  });

  it('không có form trên trang → không lỗi', () => {
    expect(() => fillAttendanceForm(document, { date: new Date(), hours: 2 })).not.toThrow();
  });
});

describe('buildAttendUrl', () => {
  it('mã hoá classId và giờ bắt đầu', () => {
    expect(
      buildAttendUrl({
        classId: 'SOF 308/A',
        start: '2026-10-05T11:00:00.000Z',
        durationHours: 1.25,
      })
    ).toBe('/classes/SOF%20308%2FA?attend=2026-10-05T11%3A00%3A00.000Z&hours=1.25');
  });
});

describe('buildOccurrenceUrl', () => {
  const base = { classId: 'SOF 308/A', start: '2026-10-05T11:00:00.000Z', durationHours: 1.25 };

  it('buổi done mở lịch sử điểm danh, classId được mã hoá', () => {
    expect(buildOccurrenceUrl({ ...base, status: 'done' })).toBe(
      '/classes/SOF%20308%2FA?attendHistory=1'
    );
  });

  it.each(['upcoming', 'missed'])('buổi %s mở form điểm danh mới', status => {
    expect(buildOccurrenceUrl({ ...base, status })).toBe(buildAttendUrl({ ...base, status }));
  });
});
