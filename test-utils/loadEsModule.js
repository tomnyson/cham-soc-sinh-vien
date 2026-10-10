const fs = require('fs');
const path = require('path');

const EXPORT_PATTERN = /^export\s+(?:async\s+)?(?:function\*?|const|let)\s+([A-Za-z_$][\w$]*)/gm;

/**
 * Nạp một module ES trình duyệt (không có import) để test bằng Jest CommonJS.
 * Chỉ hỗ trợ `export function` / `export const` / `export let`.
 */
function loadEsModule(relativePath) {
  const source = fs.readFileSync(path.join(__dirname, '..', relativePath), 'utf8');
  if (/^\s*import\s/m.test(source)) {
    throw new Error(`${relativePath}: loadEsModule không hỗ trợ import`);
  }
  const names = [...source.matchAll(EXPORT_PATTERN)].map(match => match[1]);
  const body = source.replace(/^export\s+/gm, '');
  // eslint-disable-next-line no-new-func
  return new Function(`${body}\nreturn { ${names.join(', ')} };`)();
}

module.exports = { loadEsModule };
