const {
  parseScheduleInput,
  parseRange,
  rangeBounds,
  expandOccurrences,
  markAttendance,
  toDateKey,
  RANGE_ERROR,
} = require('./schedule.util');

// Mọi fixture viết theo giờ VN có offset rõ ràng → không phụ thuộc TZ máy chạy test
const vn = local => new Date(`${local}+07:00`);

const validSlot = (overrides = {}) => ({
  weekday: 1,
  startTime: '18:00',
  endTime: '20:00',
  startDate: '2026-09-07',
  endDate: '',
  location: 'P.301',
  ...overrides,
});

const MONDAY_SLOT = {
  weekday: 1,
  startTime: '18:00',
  endTime: '20:00',
  startDate: vn('2026-09-07T00:00:00'),
  endDate: null,
  location: 'P.301',
};

const classWith = schedule => ({ classId: 'c1', name: 'SOF308', schedule });

describe('toDateKey', () => {
  it('lấy ngày theo giờ VN, không theo UTC', () => {
    expect(toDateKey(new Date('2026-10-04T23:00:00Z'))).toBe('2026-10-05');
    expect(toDateKey(new Date('2026-10-05T16:59:00Z'))).toBe('2026-10-05');
  });
});

describe('parseScheduleInput', () => {
  it('chuẩn hoá khung giờ hợp lệ', () => {
    const { value, error } = parseScheduleInput({
      schedule: [validSlot({ weekday: '1', location: '  P.301 ', endDate: null })],
    });

    expect(error).toBeUndefined();
    expect(value).toEqual([
      {
        weekday: 1,
        startTime: '18:00',
        endTime: '20:00',
        startDate: vn('2026-09-07T00:00:00'),
        endDate: null,
        location: 'P.301',
      },
    ]);
  });

  it('cho phép mảng rỗng (xoá hết lịch)', () => {
    expect(parseScheduleInput({ schedule: [] })).toEqual({ value: [] });
  });

  it('báo lỗi khi schedule không phải mảng', () => {
    expect(parseScheduleInput({}).error).toBe('Dữ liệu lịch phải là danh sách khung giờ.');
    expect(parseScheduleInput(null).error).toBe('Dữ liệu lịch phải là danh sách khung giờ.');
  });

  it('báo lỗi khi quá 14 khung giờ', () => {
    const schedule = Array.from({ length: 15 }, () => validSlot());
    expect(parseScheduleInput({ schedule }).error).toBe('Tối đa 14 khung giờ cho mỗi lớp.');
    expect(parseScheduleInput({ schedule: schedule.slice(0, 14) }).value).toHaveLength(14);
  });

  it.each([[''], [null], [7], [-1], [1.5], ['abc']])('báo lỗi weekday = %p', weekday => {
    expect(parseScheduleInput({ schedule: [validSlot({ weekday })] }).error).toBe(
      'Khung giờ 1: thứ không hợp lệ.'
    );
  });

  it('chấp nhận weekday 0 (Chủ nhật)', () => {
    expect(parseScheduleInput({ schedule: [validSlot({ weekday: 0 })] }).value[0].weekday).toBe(0);
  });

  it.each([[undefined], ['8:00'], ['24:00'], ['18:60'], ['18h00']])(
    'báo lỗi giờ sai định dạng: %p',
    startTime => {
      expect(parseScheduleInput({ schedule: [validSlot({ startTime })] }).error).toBe(
        'Khung giờ 1: giờ phải có dạng HH:mm.'
      );
    }
  );

  it('báo lỗi khi giờ kết thúc không sau giờ bắt đầu, kèm số thứ tự dòng', () => {
    const { error } = parseScheduleInput({
      schedule: [validSlot(), validSlot({ startTime: '20:00', endTime: '20:00' })],
    });
    expect(error).toBe('Khung giờ 2: giờ kết thúc phải sau giờ bắt đầu.');
  });

  it('báo lỗi ngày không tồn tại thay vì tự cuộn sang tháng sau', () => {
    expect(parseScheduleInput({ schedule: [validSlot({ startDate: '2026-02-30' })] }).error).toBe(
      'Khung giờ 1: ngày bắt đầu không hợp lệ.'
    );
    expect(parseScheduleInput({ schedule: [validSlot({ startDate: '' })] }).error).toBe(
      'Khung giờ 1: ngày bắt đầu không hợp lệ.'
    );
    expect(parseScheduleInput({ schedule: [validSlot({ endDate: '2026-13-01' })] }).error).toBe(
      'Khung giờ 1: ngày kết thúc không hợp lệ.'
    );
  });

  it('báo lỗi khi ngày kết thúc trước ngày bắt đầu, cho phép bằng nhau', () => {
    expect(parseScheduleInput({ schedule: [validSlot({ endDate: '2026-09-06' })] }).error).toBe(
      'Khung giờ 1: ngày kết thúc phải từ ngày bắt đầu trở đi.'
    );
    const { value } = parseScheduleInput({ schedule: [validSlot({ endDate: '2026-09-07' })] });
    expect(value[0].endDate).toEqual(vn('2026-09-07T00:00:00'));
  });

  it('giới hạn địa điểm 100 ký tự', () => {
    expect(parseScheduleInput({ schedule: [validSlot({ location: 'x'.repeat(101) })] }).error).toBe(
      'Khung giờ 1: địa điểm tối đa 100 ký tự.'
    );
    expect(
      parseScheduleInput({ schedule: [validSlot({ location: 'x'.repeat(100) })] }).value
    ).toHaveLength(1);
  });

  it('báo lỗi khi một dòng không phải object', () => {
    expect(parseScheduleInput({ schedule: ['abc'] }).error).toBe(
      'Khung giờ 1: dữ liệu không hợp lệ.'
    );
  });

  it('không sửa input', () => {
    const body = { schedule: [validSlot({ location: '  P.301 ' })] };
    const snapshot = JSON.parse(JSON.stringify(body));
    parseScheduleInput(body);
    expect(body).toEqual(snapshot);
  });
});

describe('parseRange', () => {
  it('mặc định là tuần hiện tại (Thứ Hai – Chủ nhật) theo giờ VN', () => {
    expect(parseRange(undefined, undefined, vn('2026-10-08T10:00:00')).value).toEqual({
      from: '2026-10-05',
      to: '2026-10-11',
    });
  });

  it('Chủ nhật 23:30 VN vẫn thuộc tuần bắt đầu Thứ Hai trước đó', () => {
    expect(parseRange('', '', vn('2026-10-11T23:30:00')).value).toEqual({
      from: '2026-10-05',
      to: '2026-10-11',
    });
  });

  it('Thứ Hai 00:30 VN (Chủ nhật theo UTC) là tuần mới', () => {
    expect(parseRange(undefined, undefined, vn('2026-10-12T00:30:00')).value).toEqual({
      from: '2026-10-12',
      to: '2026-10-18',
    });
  });

  it('nhận khoảng hợp lệ, 62 ngày là tối đa', () => {
    expect(parseRange('2026-10-01', '2026-10-31').value).toEqual({
      from: '2026-10-01',
      to: '2026-10-31',
    });
    expect(parseRange('2026-10-01', '2026-12-01').value).toEqual({
      from: '2026-10-01',
      to: '2026-12-01',
    });
    expect(parseRange('2026-10-05', '2026-10-05').value).toEqual({
      from: '2026-10-05',
      to: '2026-10-05',
    });
  });

  it.each([
    ['2026-10-01', '2026-12-02'],
    ['2026/10/01', '2026-10-31'],
    ['2026-10-31', '2026-10-01'],
    ['2026-02-30', '2026-03-05'],
    ['2026-10-01', undefined],
    [undefined, '2026-10-31'],
  ])('báo lỗi khoảng %p – %p', (from, to) => {
    expect(parseRange(from, to)).toEqual({ error: RANGE_ERROR });
  });

  it('RANGE_ERROR đúng thông điệp spec', () => {
    expect(RANGE_ERROR).toBe('Khoảng ngày không hợp lệ (tối đa 62 ngày).');
  });
});

describe('rangeBounds', () => {
  it('trả [00:00 VN ngày đầu, 00:00 VN ngày sau ngày cuối)', () => {
    expect(rangeBounds({ from: '2026-10-05', to: '2026-10-11' })).toEqual({
      start: vn('2026-10-05T00:00:00'),
      end: vn('2026-10-12T00:00:00'),
    });
  });
});

describe('expandOccurrences', () => {
  const WEEK = { from: '2026-10-05', to: '2026-10-11' };

  it('sinh buổi trong một tuần', () => {
    expect(expandOccurrences(classWith([MONDAY_SLOT]), WEEK)).toEqual([
      {
        classId: 'c1',
        className: 'SOF308',
        start: vn('2026-10-05T18:00:00'),
        end: vn('2026-10-05T20:00:00'),
        durationHours: 2,
        location: 'P.301',
        dateKey: '2026-10-05',
      },
    ]);
  });

  it('sinh đủ buổi trong lưới tháng 42 ngày', () => {
    const result = expandOccurrences(classWith([MONDAY_SLOT]), {
      from: '2026-09-28',
      to: '2026-11-08',
    });
    expect(result.map(o => o.dateKey)).toEqual([
      '2026-09-28',
      '2026-10-05',
      '2026-10-12',
      '2026-10-19',
      '2026-10-26',
      '2026-11-02',
    ]);
  });

  it('tôn trọng ranh giới startDate / endDate (bao gồm hai đầu)', () => {
    const slot = {
      ...MONDAY_SLOT,
      startDate: vn('2026-10-12T00:00:00'),
      endDate: vn('2026-10-26T00:00:00'),
    };
    const result = expandOccurrences(classWith([slot]), { from: '2026-10-05', to: '2026-11-08' });
    expect(result.map(o => o.dateKey)).toEqual(['2026-10-12', '2026-10-19', '2026-10-26']);
  });

  it('endDate = null là không giới hạn', () => {
    const result = expandOccurrences(classWith([MONDAY_SLOT]), {
      from: '2027-01-04',
      to: '2027-01-10',
    });
    expect(result).toHaveLength(1);
  });

  it('nhiều khung cùng ngày được sắp theo giờ bắt đầu', () => {
    const morning = { ...MONDAY_SLOT, startTime: '07:30', endTime: '09:00', location: 'Lab' };
    const result = expandOccurrences(classWith([MONDAY_SLOT, morning]), WEEK);
    expect(result.map(o => o.location)).toEqual(['Lab', 'P.301']);
    expect(result[0].durationHours).toBe(1.5);
  });

  it('buổi 06:00 VN (23:00 UTC hôm trước) vẫn thuộc đúng ngày VN', () => {
    const early = { ...MONDAY_SLOT, startTime: '06:00', endTime: '08:00' };
    const [occurrence] = expandOccurrences(classWith([early]), WEEK);
    expect(occurrence.start.toISOString()).toBe('2026-10-04T23:00:00.000Z');
    expect(occurrence.dateKey).toBe('2026-10-05');
  });

  it('Chủ nhật (weekday 0) là ngày cuối tuần', () => {
    const sunday = { ...MONDAY_SLOT, weekday: 0 };
    expect(expandOccurrences(classWith([sunday]), WEEK)[0].dateKey).toBe('2026-10-11');
  });

  it('thời lượng lẻ làm tròn 2 chữ số', () => {
    const slot = { ...MONDAY_SLOT, endTime: '19:15' };
    expect(expandOccurrences(classWith([slot]), WEEK)[0].durationHours).toBe(1.25);
  });

  it('lớp không có lịch → mảng rỗng', () => {
    expect(expandOccurrences(classWith(undefined), WEEK)).toEqual([]);
    expect(expandOccurrences(classWith([]), WEEK)).toEqual([]);
  });
});

describe('markAttendance', () => {
  const occ = (dateKey, startTime, endTime, classId = 'c1') => ({
    classId,
    className: 'SOF308',
    start: vn(`${dateKey}T${startTime}:00`),
    end: vn(`${dateKey}T${endTime}:00`),
    durationHours: 2,
    location: '',
    dateKey,
  });
  const NOW = vn('2026-10-10T12:00:00');

  it('đánh dấu done / missed / upcoming', () => {
    const result = markAttendance(
      [
        occ('2026-10-05', '18:00', '20:00'),
        occ('2026-10-07', '18:00', '20:00'),
        occ('2026-10-12', '18:00', '20:00'),
      ],
      [{ _id: 's1', classId: 'c1', date: vn('2026-10-05T18:10:00') }],
      NOW
    );
    expect(result.map(o => o.status)).toEqual(['done', 'missed', 'upcoming']);
    expect(result.map(o => o.attendanceSessionId)).toEqual(['s1', null, null]);
  });

  it('hai buổi cùng ngày, một session → buổi sớm done, buổi sau theo now', () => {
    const occurrences = [occ('2026-10-05', '18:00', '20:00'), occ('2026-10-05', '07:30', '09:00')];
    const sessions = [{ _id: 's1', classId: 'c1', date: vn('2026-10-05T19:00:00') }];

    const later = markAttendance(occurrences, sessions, NOW);
    expect(later.map(o => [o.start.toISOString(), o.status])).toEqual([
      ['2026-10-05T00:30:00.000Z', 'done'],
      ['2026-10-05T11:00:00.000Z', 'missed'],
    ]);

    const midday = markAttendance(occurrences, sessions, vn('2026-10-05T12:00:00'));
    expect(midday.map(o => o.status)).toEqual(['done', 'upcoming']);
  });

  it('session của lớp khác hoặc ngày khác không đánh dấu, session ngoài lịch bị bỏ qua', () => {
    const result = markAttendance(
      [occ('2026-10-05', '18:00', '20:00')],
      [
        { _id: 's2', classId: 'c2', date: vn('2026-10-05T18:00:00') },
        { _id: 's3', classId: 'c1', date: vn('2026-10-06T18:00:00') },
      ],
      NOW
    );
    expect(result).toHaveLength(1);
    expect(result[0].status).toBe('missed');
  });

  it('buổi 06:00 VN ghép với session 06:05 VN (23:05 UTC hôm trước)', () => {
    const result = markAttendance(
      [occ('2026-10-05', '06:00', '08:00')],
      [{ _id: 's1', classId: 'c1', date: new Date('2026-10-04T23:05:00Z') }],
      NOW
    );
    expect(result[0].status).toBe('done');
  });

  it('không sửa input', () => {
    const occurrences = [Object.freeze(occ('2026-10-05', '18:00', '20:00'))];
    const sessions = [Object.freeze({ _id: 's1', classId: 'c1', date: vn('2026-10-05T18:00:00') })];
    markAttendance(occurrences, sessions, NOW);
    expect(occurrences[0]).not.toHaveProperty('status');
    expect(sessions).toHaveLength(1);
  });
});
