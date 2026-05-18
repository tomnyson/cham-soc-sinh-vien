/* Quick smoke test for the grade utility and validation middleware. */
const { summarizeStudents, determineStatus } = require('./src/utils/grade.util');
const { validateGradeUpdate } = require('./src/middleware/validation.middleware');

const profile = {
    profileId: 'p1',
    name: 'Demo',
    passThreshold: 5,
    weights: { 'Lab 1': 30, 'Quiz 1': 20, 'GD 1': 50 }
};

const classDoc = {
    classId: 'c1',
    students: [
        { mssv: 'A1', name: 'Alice', email: 'a@x.com' },
        { mssv: 'B2', name: 'Bob', email: 'b@x.com' },
        { mssv: 'C3', name: 'Cara', email: 'c@x.com' }
    ],
    grades: {
        profileId: 'p1',
        students: {
            A1: { 'Lab 1': 9, 'Quiz 1': 8, 'GD 1': 9 },
            B2: { 'Lab 1': 5, 'Quiz 1': 5, 'GD 1': 5.2 },
            C3: { 'Lab 1': 2, 'Quiz 1': 3, 'GD 1': 2 }
        }
    }
};

const { rows, summary } = summarizeStudents(classDoc, profile);
console.log('rows:', rows.map(r => `${r.mssv}=${r.finalTotal}/${r.status}`));
console.log('summary:', summary);

console.log('determineStatus(5, 5):', determineStatus(5, 5));
console.log('determineStatus(5.99, 5):', determineStatus(5.99, 5));
console.log('determineStatus(6, 5):', determineStatus(6, 5));
console.log('determineStatus(4.99, 5):', determineStatus(4.99, 5));

function fakeRes() {
    return {
        statusCode: 200,
        body: null,
        status(code) { this.statusCode = code; return this; },
        json(payload) { this.body = payload; return this; }
    };
}

function runValidation(body) {
    const req = { body };
    const res = fakeRes();
    let nextCalled = false;
    validateGradeUpdate(req, res, () => { nextCalled = true; });
    return { req, res, nextCalled };
}

const cases = [
    { label: 'valid score', body: { assessment: 'Lab 1', score: 8.5 } },
    { label: 'string score', body: { assessment: 'Lab 1', score: '7.5' } },
    { label: 'bonus ok', body: { assessment: '_bonus', score: 1.5 } },
    { label: 'bonus high', body: { assessment: '_bonus', score: 3 } },
    { label: 'note ok', body: { assessment: '_note', score: 'tot' } },
    { label: 'missing assessment', body: { score: 5 } },
    { label: 'score below', body: { assessment: 'Lab 1', score: -1 } },
    { label: 'score above', body: { assessment: 'Lab 1', score: 11 } },
    { label: 'non-numeric', body: { assessment: 'Lab 1', score: 'abc' } }
];

for (const c of cases) {
    const r = runValidation(c.body);
    console.log(c.label, '->', r.nextCalled ? 'PASS' : `REJECT(${r.res.statusCode})`, r.res.body ? r.res.body.error : '');
}
