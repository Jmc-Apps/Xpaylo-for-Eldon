const VERSION = '1.1.0';
const MISSING = '####';

// -----------------------------
// Small XLSX reader (no external dependencies)
// -----------------------------

function readU16(view, offset) { return view.getUint16(offset, true); }
function readU32(view, offset) { return view.getUint32(offset, true); }

class SimpleZipReader {
  constructor(arrayBuffer) {
    this.buffer = arrayBuffer;
    this.bytes = new Uint8Array(arrayBuffer);
    this.view = new DataView(arrayBuffer);
    this.entries = new Map();
    this._parseCentralDirectory();
  }

  _parseCentralDirectory() {
    const min = Math.max(0, this.bytes.length - 65557);
    let eocd = -1;
    for (let i = this.bytes.length - 22; i >= min; i--) {
      if (readU32(this.view, i) === 0x06054b50) { eocd = i; break; }
    }
    if (eocd < 0) throw new Error('This file is not a readable .xlsx ZIP archive.');

    const count = readU16(this.view, eocd + 10);
    const centralOffset = readU32(this.view, eocd + 16);
    let p = centralOffset;
    const decoder = new TextDecoder('utf-8');

    for (let n = 0; n < count; n++) {
      if (readU32(this.view, p) !== 0x02014b50) throw new Error('Invalid XLSX ZIP directory.');
      const method = readU16(this.view, p + 10);
      const compressedSize = readU32(this.view, p + 20);
      const uncompressedSize = readU32(this.view, p + 24);
      const nameLen = readU16(this.view, p + 28);
      const extraLen = readU16(this.view, p + 30);
      const commentLen = readU16(this.view, p + 32);
      const localOffset = readU32(this.view, p + 42);
      const name = decoder.decode(this.bytes.slice(p + 46, p + 46 + nameLen)).replace(/^\/+/, '');
      this.entries.set(name, { name, method, compressedSize, uncompressedSize, localOffset });
      p += 46 + nameLen + extraLen + commentLen;
    }
  }

  has(name) { return this.entries.has(name.replace(/^\/+/, '')); }

  async text(name) {
    const data = await this.data(name);
    return new TextDecoder('utf-8').decode(data);
  }

  async data(name) {
    const entry = this.entries.get(name.replace(/^\/+/, ''));
    if (!entry) throw new Error(`Missing workbook part: ${name}`);
    const p = entry.localOffset;
    if (readU32(this.view, p) !== 0x04034b50) throw new Error(`Invalid ZIP entry: ${name}`);
    const nameLen = readU16(this.view, p + 26);
    const extraLen = readU16(this.view, p + 28);
    const dataStart = p + 30 + nameLen + extraLen;
    const compressed = this.bytes.slice(dataStart, dataStart + entry.compressedSize);
    if (entry.method === 0) return compressed;
    if (entry.method !== 8) throw new Error(`Unsupported XLSX compression method (${entry.method}).`);
    // Prefer the bundled pure-JavaScript inflater. This works even when the
    // browser does not implement DecompressionStream('deflate-raw'), which is
    // a common reason XLSX files fail to open in Safari/local-file mode.
    if (typeof pako !== 'undefined' && typeof pako.inflateRaw === 'function') {
      try {
        const inflated = pako.inflateRaw(compressed);
        return inflated instanceof Uint8Array ? inflated : new Uint8Array(inflated);
      } catch (err) {
        console.warn('Bundled XLSX inflater failed; trying browser inflater.', err);
      }
    }

    if (typeof DecompressionStream !== 'undefined') {
      try {
        const stream = new Blob([compressed]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
        return new Uint8Array(await new Response(stream).arrayBuffer());
      } catch (err) {
        console.warn('Browser XLSX inflater failed.', err);
      }
    }

    throw new Error('The XLSX file could not be decompressed in this browser.');
  }
}

function xmlDecode(value = '') {
  return String(value)
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'").replace(/&amp;/g, '&')
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)));
}

function attr(source, name) {
  const m = source.match(new RegExp(`\\b${name.replace(':', '\\:')}="([^"]*)"`, 'i'));
  return m ? xmlDecode(m[1]) : null;
}

function extractTextNodes(xml) {
  let out = '';
  const re = /<t\b[^>]*>([\s\S]*?)<\/t>/gi;
  let m;
  while ((m = re.exec(xml))) out += xmlDecode(m[1].replace(/<[^>]+>/g, ''));
  return out;
}

function parseSharedStrings(xml) {
  const result = [];
  const re = /<si\b[^>]*>([\s\S]*?)<\/si>/gi;
  let m;
  while ((m = re.exec(xml))) result.push(extractTextNodes(m[1]));
  return result;
}

function colLettersToIndex(letters) {
  let n = 0;
  for (const ch of letters) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n;
}

function parseWorksheet(xml, sharedStrings) {
  const rows = new Map();
  const rowRe = /<row\b([^>]*)>([\s\S]*?)<\/row>/gi;
  let rowMatch;
  while ((rowMatch = rowRe.exec(xml))) {
    const rowNum = Number(attr(rowMatch[1], 'r')) || (rows.size + 1);
    const cells = new Map();
    const cellRe = /<c\b([^>]*?)\/>|<c\b([^>]*)>([\s\S]*?)<\/c>/gi;
    let cellMatch;
    while ((cellMatch = cellRe.exec(rowMatch[2]))) {
      const attrs = cellMatch[1] ?? cellMatch[2] ?? '';
      const inner = cellMatch[3] ?? '';
      const ref = attr(attrs, 'r');
      if (!ref) continue;
      const colMatch = ref.match(/^([A-Z]+)/i);
      if (!colMatch) continue;
      const col = colLettersToIndex(colMatch[1].toUpperCase());
      const type = attr(attrs, 't') || '';
      let value = null;
      if (type === 'inlineStr') value = extractTextNodes(inner);
      else {
        const vm = inner.match(/<v\b[^>]*>([\s\S]*?)<\/v>/i);
        if (vm) {
          const raw = xmlDecode(vm[1].trim());
          if (type === 's') value = sharedStrings[Number(raw)] ?? '';
          else if (type === 'b') value = raw === '1';
          else value = raw;
        } else if (inner.includes('<is')) value = extractTextNodes(inner);
      }
      if (value !== null) cells.set(col, value);
    }
    rows.set(rowNum, cells);
  }
  return rows;
}

function normalizePath(base, target) {
  if (target.startsWith('/')) return target.replace(/^\/+/, '');
  const stack = base.split('/');
  stack.pop();
  for (const part of target.split('/')) {
    if (!part || part === '.') continue;
    if (part === '..') stack.pop();
    else stack.push(part);
  }
  return stack.join('/');
}

async function findPayrollSheet(zip) {
  const workbookXml = await zip.text('xl/workbook.xml');
  const relsXml = await zip.text('xl/_rels/workbook.xml.rels');
  const sheets = [];
  const sheetRe = /<sheet\b([^>]*?)\/?\s*>/gi;
  let sm;
  while ((sm = sheetRe.exec(workbookXml))) {
    sheets.push({ name: attr(sm[1], 'name') || '', rid: attr(sm[1], 'r:id') || attr(sm[1], 'id') || '' });
  }
  const relMap = new Map();
  const relRe = /<Relationship\b([^>]*?)\/?\s*>/gi;
  let rm;
  while ((rm = relRe.exec(relsXml))) {
    const id = attr(rm[1], 'Id');
    const target = attr(rm[1], 'Target');
    if (id && target) relMap.set(id, target);
  }
  const selected = sheets.find(s => s.name.trim().toLowerCase() === 'payroll - pay grid') || sheets[0];
  if (!selected) throw new Error('No worksheet was found in the Excel workbook.');
  const target = relMap.get(selected.rid) || 'worksheets/sheet1.xml';
  return { name: selected.name, path: normalizePath('xl/workbook.xml', target) };
}

async function parsePayrollWorkbook(arrayBuffer) {
  const zip = new SimpleZipReader(arrayBuffer);
  const sharedStrings = zip.has('xl/sharedStrings.xml') ? parseSharedStrings(await zip.text('xl/sharedStrings.xml')) : [];
  const sheetInfo = await findPayrollSheet(zip);
  const rows = parseWorksheet(await zip.text(sheetInfo.path), sharedStrings);
  return extractPayroll(rows, sheetInfo.name);
}

// -----------------------------
// Payroll interpretation
// -----------------------------

const CATEGORY_NAMES = new Set([
  'MANDATORY', 'T/A', 'EARNINGS', 'REIMBURSEMENTS', 'GROSS PAYMENT', 'DEDUCTIONS',
  'NETT SALARY', 'FRINGE BENEFITS', 'COMPANY CONTRIBUTIONS', 'COST TO COMPANY'
]);

function cell(rows, r, c) { return rows.get(r)?.get(c) ?? null; }
function norm(v) { return String(v ?? '').replace(/^\s+|\s+$/g, '').replace(/\s+/g, ' ').toUpperCase(); }
function toNumber(v) {
  if (v === null || v === undefined || v === '') return null;
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  const cleaned = String(v).replace(/\s/g, '').replace(/,/g, '');
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}
function isNonZero(n) { return Number.isFinite(n) && Math.abs(n) > 0.0000001; }
function money(n) {
  if (!Number.isFinite(n)) return MISSING;
  const sign = n < 0 ? '-' : '';
  const parts = Math.abs(n).toFixed(2).split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return sign + parts.join('.');
}
function hours(n) { return Number.isFinite(n) ? n.toFixed(2) : MISSING; }
function cleanDescription(header) {
  return String(header || '').replace(/^\s+/, '').replace(/^(E-|R-|D-|CC-|FB-)/i, '').replace(/\s+/g, ' ').trim();
}

function derivePeriod(rows, headerRow) {
  let cycleText = '';
  let lockText = '';
  for (let r = 1; r < headerRow; r++) {
    for (const [c, v] of (rows.get(r) || new Map()).entries()) {
      const s = String(v ?? '');
      if (!cycleText && /Monthly\s*\(/i.test(s)) cycleText = s;
      if (/Lock Date/i.test(s)) {
        for (let cc = c + 1; cc <= c + 4; cc++) {
          const next = cell(rows, r, cc);
          if (next !== null && String(next).trim()) { lockText = String(next); break; }
        }
      }
    }
  }
  const monthMatch = cycleText.match(/Monthly\s*\(\s*([^\)]+?)\s*\)/i);
  const yearMatch = lockText.match(/(20\d{2})/);
  const monthName = monthMatch ? monthMatch[1].trim() : '';
  const monthIndex = ['january','february','march','april','may','june','july','august','september','october','november','december'].indexOf(monthName.toLowerCase());
  const year = yearMatch ? Number(yearMatch[1]) : null;
  let periodEnd = MISSING;
  let displayPeriod = 'Payroll period';
  if (monthIndex >= 0 && year) {
    const last = new Date(Date.UTC(year, monthIndex + 1, 0));
    const dd = String(last.getUTCDate()).padStart(2, '0');
    const mmm = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][monthIndex];
    periodEnd = `${dd}-${mmm}-${year}`;
    displayPeriod = `${monthName.charAt(0).toUpperCase() + monthName.slice(1).toLowerCase()} ${year}`;
  } else if (monthName) displayPeriod = monthName;
  return { cycleText, lockText, periodEnd, displayPeriod };
}

function findCategoryRow(rows, headerRow) {
  let bestRow = null;
  let bestScore = 0;
  for (let r = Math.max(1, headerRow - 12); r < headerRow; r++) {
    let score = 0;
    for (const v of (rows.get(r) || new Map()).values()) if (CATEGORY_NAMES.has(norm(v))) score++;
    if (score > bestScore) { bestScore = score; bestRow = r; }
  }
  return bestRow;
}

function findHeaderColumn(columns, header, category = null) {
  const nh = norm(header);
  return columns.find(c => norm(c.header) === nh && (!category || norm(c.category) === norm(category))) || null;
}

function extractPayroll(rows, sheetName) {
  let headerRow = null;
  for (const [r, row] of rows.entries()) {
    if (norm(row.get(1)) === 'EMP NAME') { headerRow = r; break; }
  }
  if (!headerRow) throw new Error('The worksheet does not contain the expected EMP Name pay-grid header.');
  const categoryRow = findCategoryRow(rows, headerRow);
  if (!categoryRow) throw new Error('The pay-grid category row could not be identified.');

  const headerCells = rows.get(headerRow) || new Map();
  const maxCol = Math.max(...headerCells.keys());
  const columns = [];
  for (let c = 1; c <= maxCol; c++) {
    const header = headerCells.get(c);
    if (header !== null && header !== undefined && String(header).trim()) {
      columns.push({ index: c, header: String(header).trim(), category: String(cell(rows, categoryRow, c) ?? '').trim() });
    }
  }

  const period = derivePeriod(rows, headerRow);
  const employees = [];
  for (const [r, row] of [...rows.entries()].sort((a,b) => a[0]-b[0])) {
    if (r <= headerRow) continue;
    const empCell = String(row.get(1) ?? '').trim();
    const match = empCell.match(/^(.*)\s+\(([^()]*)\)\s*$/);
    if (!match) continue;
    const name = match[1].trim();
    const code = match[2].trim();
    if (!name || !code) continue;

    const getRaw = (header, category = null) => {
      const col = findHeaderColumn(columns, header, category);
      return col ? row.get(col.index) ?? null : null;
    };
    const getNum = (header, category = null) => toNumber(getRaw(header, category));

    const earnings = [];
    const allEarnings = Object.create(null);
    const allEarningHours = Object.create(null);
    for (const col of columns) {
      const cat = norm(col.category);
      const h = norm(col.header);
      if (cat !== 'EARNINGS' && cat !== 'REIMBURSEMENTS') continue;
      if (['PAY RATE','TOTAL PAY','TOTAL EARNINGS','TOTAL REIMBURSEMENTS'].includes(h)) continue;
      const key = `${cat}|${h}`;
      const amount = toNumber(row.get(col.index));
      const hourMap = {
        'NORMAL PAY': 'Normal',
        'SUNDAY PAY': 'Sunday',
        'OVERTIME': 'Overtime',
        'PUBLIC HOLIDAY': 'Holiday',
        'NIGHT SHIFT PAY': 'Nightshift'
      };
      const hourHeader = hourMap[h];
      const hr = hourHeader ? getNum(hourHeader, 'T/A') : null;
      allEarnings[key] = amount;
      allEarningHours[key] = hr;
      if (!isNonZero(amount)) continue;
      earnings.push({ key, description: cleanDescription(col.header), hours: hourHeader ? hours(hr) : MISSING, hoursValue: hr, amount, amountText: money(amount) });
    }

    const deductions = [];
    const allDeductions = Object.create(null);
    for (const col of columns) {
      if (norm(col.category) !== 'DEDUCTIONS') continue;
      if (norm(col.header) === 'TOTAL DEDUCTIONS/CONTRIBUTIONS') continue;
      const key = `DEDUCTIONS|${norm(col.header)}`;
      const amount = toNumber(row.get(col.index));
      allDeductions[key] = amount;
      if (!isNonZero(amount)) continue;
      deductions.push({ key, description: cleanDescription(col.header), amount, amountText: money(amount) });
    }

    const company = [];
    const allCompany = Object.create(null);
    for (const col of columns) {
      if (norm(col.category) !== 'COMPANY CONTRIBUTIONS') continue;
      if (norm(col.header) === 'TOTAL COMPANY CONTRIBUTIONS') continue;
      const key = `COMPANY CONTRIBUTIONS|${norm(col.header)}`;
      const amount = toNumber(row.get(col.index));
      allCompany[key] = amount;
      if (!isNonZero(amount)) continue;
      company.push({ key, description: cleanDescription(col.header), amount, amountText: money(amount) });
    }

    const ov1 = getNum('Overtime', 'T/A');
    const ov2 = getNum('Overtime 2', 'T/A');
    const overtimeTotal = (Number.isFinite(ov1) || Number.isFinite(ov2)) ? (ov1 || 0) + (ov2 || 0) : null;
    const gross = getNum('Total Gross Payment', 'GROSS PAYMENT') ?? getNum('Total Earnings', 'EARNINGS');
    const deductionTotal = getNum('Total Deductions/Contributions', 'DEDUCTIONS');
    const companyTotal = getNum('Total Company Contributions', 'COMPANY CONTRIBUTIONS');
    const nett = getNum('Nett Salary', 'NETT SALARY');

    employees.push({
      row: r,
      name,
      code,
      selected: true,
      earnings,
      deductions,
      company,
      allEarnings,
      allEarningHours,
      allDeductions,
      allCompany,
      gross,
      deductionTotal,
      companyTotal,
      nett,
      payRate: getNum('PAY RATE', 'EARNINGS'),
      clocked: {
        normal: getNum('Normal', 'T/A'),
        sunday: getNum('Sunday', 'T/A'),
        offDay: getNum('Off Day', 'T/A'),
        overtime: overtimeTotal,
        holiday: getNum('Holiday', 'T/A'),
        nightshift: getNum('Nightshift', 'T/A'),
        total: getNum('Total Hours', 'T/A')
      }
    });
  }

  if (!employees.length) throw new Error('No employee rows were found beneath the EMP Name header.');

  return {
    sheetName,
    headerRow,
    categoryRow,
    periodEnd: period.periodEnd,
    displayPeriod: period.displayPeriod,
    cycleText: period.cycleText,
    employees
  };
}

// -----------------------------
// Preview HTML
// -----------------------------

function esc(v) {
  return String(v ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
}

function infoRows(rows) {
  return rows.map(([label, value]) => `<div class="info-row"><b>${esc(label)}</b><span>${esc(value)}</span></div>`).join('');
}

function previewPayTable(title, entries, totalText, earnings = false) {
  const body = entries.length ? entries.map(e => `<tr><td>${esc(e.description)}</td>${earnings ? `<td class="num">${esc(e.hours)}</td>` : ''}<td class="num">${esc(e.amountText)}</td></tr>`).join('') : `<tr><td colspan="${earnings ? 3 : 2}">&nbsp;</td></tr>`;
  return `<table class="pay-table"><thead><tr><th class="section-title" colspan="${earnings ? 3 : 2}">${esc(title)}</th></tr><tr><th>Description</th>${earnings ? '<th>Hours</th>' : ''}<th>Amount</th></tr></thead><tbody>${body}<tr class="total"><td>TOTAL</td>${earnings ? '<td></td>' : ''}<td class="num">${esc(totalText)}</td></tr></tbody></table>`;
}

function bottomBox(title, rows) {
  return `<div class="bottom-box"><h4>${esc(title)}</h4>${rows.map(([label,value]) => `<div class="bottom-row"><span><b>${esc(label)}</b></span><span>${esc(value)}</span></div>`).join('')}</div>`;
}

function payslipViewModel(employee, payroll) {
  return {
    employeeName: employee.name,
    employeeCode: employee.code,
    periodEnd: payroll.periodEnd || MISSING,
    printedDate: MISSING,
    companyName: MISSING,
    companyAddress: MISSING,
    employeeAddress: MISSING,
    department: MISSING,
    jobTitle: MISSING,
    paymentDate: MISSING,
    dateEngaged: MISSING,
    accountNumber: MISSING,
    branchCode: MISSING,
    idNumber: MISSING,
    taxNumber: MISSING,
    earnings: employee.earnings,
    deductions: employee.deductions,
    company: employee.company,
    grossText: money(employee.gross),
    deductionTotalText: money(employee.deductionTotal),
    companyTotalText: money(employee.companyTotal),
    nettText: money(employee.nett),
    payRateText: money(employee.payRate),
    basicSalaryText: Number.isFinite(employee.payRate) ? money(employee.payRate * 195) : MISSING,
    clocked: {
      normal: hours(employee.clocked.normal),
      sunday: hours(employee.clocked.sunday),
      offDay: hours(employee.clocked.offDay),
      overtime: hours(employee.clocked.overtime),
      holiday: hours(employee.clocked.holiday),
      nightshift: hours(employee.clocked.nightshift),
      total: hours(employee.clocked.total)
    }
  };
}

function renderPreview(employee, payroll) {
  const p = payslipViewModel(employee, payroll);
  return `<div class="payslip-sheet">
    <div class="watermark">DRAFT</div>
    <div class="info-box">
      <div class="info-col">${infoRows([['Co. Name:',p.companyName],['Co. Address:',p.companyAddress]])}</div>
      <div class="info-col">${infoRows([['Employee Code:',p.employeeCode],['Employee Name:',p.employeeName],['Employee Address:',p.employeeAddress],['Department:',p.department],['Job Title:',p.jobTitle]])}</div>
      <div class="info-col">${infoRows([['Pay slip:',p.periodEnd],['Payment Dt:',p.paymentDate],['Date Engaged:',p.dateEngaged],['Account Number:',p.accountNumber],['Branch Code:',p.branchCode],['ID Number:',p.idNumber],['Tax Number:',p.taxNumber]])}</div>
    </div>
    <div class="pay-grid">
      ${previewPayTable('EARNINGS',p.earnings,p.grossText,true)}
      ${previewPayTable('DEDUCTIONS',p.deductions,p.deductionTotalText,false)}
      ${previewPayTable('COMPANY CONTRIBUTIONS',p.company,p.companyTotalText,false)}
    </div>
    <div class="net-pay"><span>Nett Pay:</span><span>${esc(p.nettText)}</span></div>
    <div class="bottom-grid">
      ${bottomBox('YEAR-TO-DATE TOTALS',[['Taxable Earnings:',MISSING],['Perks:',MISSING],['Tax:',MISSING],['Rate:',p.payRateText],['Basic Salary:',p.basicSalaryText]])}
      ${bottomBox('LEAVE DETAILS',[['Annual:',MISSING],['Grace:',MISSING],['Access:',MISSING],['Leave Days Due:',MISSING]])}
      ${bottomBox('CLOCKED HOURS',[['Normal:',p.clocked.normal],['Sunday:',p.clocked.sunday],['Off Day:',p.clocked.offDay],['Holiday:',p.clocked.holiday],['Nightshift:',p.clocked.nightshift],['Overtime:',p.clocked.overtime],['Total Hours:',p.clocked.total]])}
    </div>
  </div>`;
}

// -----------------------------
// Dependency-free PDF writer
// -----------------------------

const PDF_W = 841.89;
const PDF_H = 595.28;

function pdfAscii(value) {
  return String(value ?? '')
    .replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/[–—]/g, '-')
    .normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\x20-\x7E]/g, '?');
}
function pdfEscape(value) { return pdfAscii(value).replace(/\\/g,'\\\\').replace(/\(/g,'\\(').replace(/\)/g,'\\)'); }
function approxWidth(text, size, bold=false) { return pdfAscii(text).length * size * (bold ? 0.55 : 0.50); }

function pdfContentForPayslip(employee, payroll) {
  const p = payslipViewModel(employee, payroll);
  const out = [];
  const Y = top => PDF_H - top;
  const rect = (x, top, w, h, fillGray=null, stroke=true, lineWidth=.7) => {
    out.push(`${lineWidth} w`);
    if (fillGray !== null) out.push(`${fillGray} g ${x.toFixed(2)} ${(PDF_H-top-h).toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)} re f`);
    if (stroke) out.push(`0 G ${x.toFixed(2)} ${(PDF_H-top-h).toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)} re S`);
  };
  const line = (x1,t1,x2,t2,w=.5) => out.push(`${w} w 0 G ${x1.toFixed(2)} ${Y(t1).toFixed(2)} m ${x2.toFixed(2)} ${Y(t2).toFixed(2)} l S`);
  const text = (value,x,top,size=7,bold=false,gray=0,align='left',maxWidth=null) => {
    let s = pdfAscii(value);
    let fs = size;
    if (maxWidth && s) {
      const estimate = approxWidth(s, fs, bold);
      if (estimate > maxWidth) fs = Math.max(5, fs * maxWidth / estimate);
      if (approxWidth(s, fs, bold) > maxWidth) {
        while (s.length > 3 && approxWidth(s + '...', fs, bold) > maxWidth) s = s.slice(0,-1);
        s += '...';
      }
    }
    let xx = x;
    const width = approxWidth(s, fs, bold);
    if (align === 'right') xx -= width;
    else if (align === 'center') xx -= width/2;
    out.push(`${gray} g BT /${bold?'F2':'F1'} ${fs.toFixed(2)} Tf 1 0 0 1 ${xx.toFixed(2)} ${(Y(top)-fs).toFixed(2)} Tm (${pdfEscape(s)}) Tj ET`);
  };
  const fillBlack = (x,top,w,h) => out.push(`0 g ${x.toFixed(2)} ${(PDF_H-top-h).toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)} re f`);

  // Watermark behind all content.
  out.push('0.89 g BT /F2 92 Tf 0.866 0.5 -0.5 0.866 250 150 Tm (DRAFT) Tj ET');

  const margin = 14;
  const contentW = PDF_W - margin*2;
  const third = contentW/3;

  function infoBox(top, height, leftRows, midRows, rightRows) {
    rect(margin, top, contentW, height, null, true, .8);
    line(margin+third, top, margin+third, top+height, .5);
    line(margin+third*2, top, margin+third*2, top+height, .5);
    const sets = [leftRows, midRows, rightRows];
    for (let ci=0; ci<3; ci++) {
      const x = margin + third*ci + 7;
      const labelW = ci===1 ? 72 : 68;
      const valueX = x + labelW;
      const usable = third - 14 - labelW;
      const rows = sets[ci];
      const step = Math.min(12, (height-12)/Math.max(1, rows.length));
      rows.forEach((row,i) => {
        const topText = top + 6 + i*step;
        text(row[0], x, topText, 6.7, true, 0, 'left', labelW-3);
        text(row[1], valueX, topText, 6.7, false, 0, 'left', usable);
      });
    }
  }

  // The sample document duplicated this employee/company section. XPaylo uses one copy only.
  infoBox(14, 96,
    [['Co. Name:',p.companyName],['Co. Address:',p.companyAddress]],
    [['Employee Code:',p.employeeCode],['Employee Name:',p.employeeName],['Employee Address:',p.employeeAddress],['Department:',p.department],['Job Title:',p.jobTitle]],
    [['Pay slip:',p.periodEnd],['Payment Dt:',p.paymentDate],['Date Engaged:',p.dateEngaged],['Account Number:',p.accountNumber],['Branch Code:',p.branchCode],['ID Number:',p.idNumber],['Tax Number:',p.taxNumber]]
  );

  function compactEntries(entries, maxRows, label) {
    if (entries.length <= maxRows) return entries;
    const head = entries.slice(0, maxRows-1);
    const rest = entries.slice(maxRows-1);
    const amount = rest.reduce((s,e)=>s+(Number(e.amount)||0),0);
    head.push({ description: `${label} (${rest.length})`, hours: MISSING, amount, amountText: money(amount) });
    return head;
  }

  function payTable(x, top, w, h, title, entries, totalText, earnings=false) {
    const titleH = 16, headH = 15, totalH = 17;
    const bodyH = h - titleH - headH - totalH;
    const list = compactEntries(entries, 16, 'OTHER ITEMS');
    rect(x, top, w, h, null, true, .7);
    rect(x, top, w, titleH, .84, true, .6);
    text(title, x+5, top+3, 7.5, true, 0, 'left', w-10);
    line(x, top+titleH, x+w, top+titleH, .5);
    const descW = earnings ? w*.54 : w*.68;
    const hoursW = earnings ? w*.17 : 0;
    line(x+descW, top+titleH, x+descW, top+h, .35);
    if (earnings) line(x+descW+hoursW, top+titleH, x+descW+hoursW, top+h, .35);
    text('Description',x+4,top+titleH+3,6.5,true,0,'left',descW-8);
    if (earnings) text('Hours',x+descW+hoursW/2,top+titleH+3,6.5,true,0,'center',hoursW-4);
    text('Amount',x+w-4,top+titleH+3,6.5,true,0,'right',w-descW-hoursW-8);
    line(x, top+titleH+headH, x+w, top+titleH+headH, .45);
    const rowH = list.length ? Math.min(15, bodyH / list.length) : bodyH;
    const font = Math.max(5.1, Math.min(6.4, rowH*.62));
    list.forEach((e,i) => {
      const rt = top+titleH+headH+i*rowH;
      if (i>0) line(x,rt,x+w,rt,.25);
      text(e.description,x+4,rt+Math.max(1,(rowH-font)/2),font,false,0,'left',descW-8);
      if (earnings) text(e.hours,x+descW+hoursW-4,rt+Math.max(1,(rowH-font)/2),font,false,0,'right',hoursW-8);
      text(e.amountText,x+w-4,rt+Math.max(1,(rowH-font)/2),font,false,0,'right',w-descW-hoursW-8);
    });
    const totalTop = top+h-totalH;
    line(x,totalTop,x+w,totalTop,1.1);
    text('TOTAL',x+4,totalTop+3,7.2,true);
    text(totalText,x+w-4,totalTop+3,7.2,true,0,'right',w-descW-hoursW-8);
  }

  const tablesTop = 118, tablesH = 250, gap = 7;
  const tableW = (contentW - gap*2)/3;
  payTable(margin,tablesTop,tableW,tablesH,'EARNINGS',p.earnings,p.grossText,true);
  payTable(margin+tableW+gap,tablesTop,tableW,tablesH,'DEDUCTIONS',p.deductions,p.deductionTotalText,false);
  payTable(margin+(tableW+gap)*2,tablesTop,tableW,tablesH,'COMPANY CONTRIBUTIONS',p.company,p.companyTotalText,false);

  const netTop = 376, netH = 25;
  fillBlack(margin,netTop,contentW,netH);
  text('Nett Pay:',PDF_W/2-40,netTop+4,11,true,1,'right');
  text(p.nettText,PDF_W/2+45,netTop+4,11,true,1,'left',120);

  function keyValueBox(x,top,w,h,title,rows) {
    const titleH=17;
    rect(x,top,w,h,null,true,.7);
    rect(x,top,w,titleH,.88,true,.5);
    text(title,x+w/2,top+3,7.4,true,0,'center',w-10);
    const rowH=(h-titleH)/rows.length;
    rows.forEach((r,i)=>{
      const rt=top+titleH+i*rowH;
      if (i>0) line(x,rt,x+w,rt,.3);
      line(x+w*.63,rt,x+w*.63,rt+rowH,.3);
      const fs=Math.min(6.6,rowH*.52);
      text(r[0],x+5,rt+Math.max(2,(rowH-fs)/2),fs,true,0,'left',w*.63-10);
      text(r[1],x+w-5,rt+Math.max(2,(rowH-fs)/2),fs,false,0,'right',w*.37-10);
    });
  }

  const bottomTop=409, bottomH=171;
  keyValueBox(margin,bottomTop,tableW,bottomH,'YEAR-TO-DATE TOTALS',[
    ['Taxable Earnings:',MISSING],['Perks:',MISSING],['Tax:',MISSING],['Rate:',p.payRateText],['Basic Salary:',p.basicSalaryText]
  ]);
  keyValueBox(margin+tableW+gap,bottomTop,tableW,bottomH,'LEAVE DETAILS',[
    ['Annual:',MISSING],['Grace:',MISSING],['Access:',MISSING],['Leave Days Due:',MISSING]
  ]);
  keyValueBox(margin+(tableW+gap)*2,bottomTop,tableW,bottomH,'CLOCKED HOURS',[
    ['Normal:',p.clocked.normal],['Sunday:',p.clocked.sunday],['Off Day:',p.clocked.offDay],['Holiday:',p.clocked.holiday],['Nightshift:',p.clocked.nightshift],['Overtime:',p.clocked.overtime],['Total Hours:',p.clocked.total]
  ]);

  return out.join('\n');
}

function concatUint8(arrays) {
  const total = arrays.reduce((s,a)=>s+a.length,0);
  const out = new Uint8Array(total);
  let p=0;
  for (const a of arrays) { out.set(a,p); p+=a.length; }
  return out;
}

function generatePayslipPdf(payroll, selectedEmployees = null) {
  const employees = selectedEmployees || payroll.employees.filter(e=>e.selected !== false);
  if (!employees.length) throw new Error('Select at least one employee before generating the PDF.');
  const enc = new TextEncoder();
  const pageContent = employees.map(e => pdfContentForPayslip(e,payroll));
  const firstContentObj = 5;
  const pageRefs = pageContent.map((_,i)=>firstContentObj+i*2+1);
  const objects = new Map();
  objects.set(1,'<< /Type /Catalog /Pages 2 0 R >>');
  objects.set(2,`<< /Type /Pages /Count ${employees.length} /Kids [${pageRefs.map(n=>`${n} 0 R`).join(' ')}] >>`);
  objects.set(3,'<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');
  objects.set(4,'<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>');
  pageContent.forEach((content,i)=>{
    const contentObj=firstContentObj+i*2;
    const pageObj=contentObj+1;
    const asciiContent=content;
    const length=enc.encode(asciiContent).length;
    objects.set(contentObj,`<< /Length ${length} >>\nstream\n${asciiContent}\nendstream`);
    objects.set(pageObj,`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PDF_W} ${PDF_H}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${contentObj} 0 R >>`);
  });

  const chunks=[];
  let offset=0;
  const header=enc.encode('%PDF-1.4\n%1234\n');
  chunks.push(header); offset+=header.length;
  const maxObj=Math.max(...objects.keys());
  const offsets=new Array(maxObj+1).fill(0);
  for (let n=1;n<=maxObj;n++) {
    offsets[n]=offset;
    const bytes=enc.encode(`${n} 0 obj\n${objects.get(n)}\nendobj\n`);
    chunks.push(bytes); offset+=bytes.length;
  }
  const xrefOffset=offset;
  let xref=`xref\n0 ${maxObj+1}\n0000000000 65535 f \n`;
  for (let n=1;n<=maxObj;n++) xref+=`${String(offsets[n]).padStart(10,'0')} 00000 n \n`;
  xref+=`trailer\n<< /Size ${maxObj+1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;
  chunks.push(enc.encode(xref));
  return concatUint8(chunks);
}


// -----------------------------
// Payslip comparison
// -----------------------------

function percentChange(current, previous) {
  if (!Number.isFinite(current) || !Number.isFinite(previous)) return null;
  if (Math.abs(previous) < 0.0000001) {
    if (Math.abs(current) < 0.0000001) return 0;
    return Infinity;
  }
  return Math.abs((current - previous) / Math.abs(previous)) * 100;
}

function exceedsThreshold(current, previous, threshold) {
  const pct = percentChange(current, previous);
  return pct !== null && pct > Math.max(0, Number(threshold) || 0);
}

function changeText(current, previous) {
  const pct = percentChange(current, previous);
  if (pct === null) return MISSING;
  if (!Number.isFinite(pct)) return 'New';
  return `${pct.toFixed(1)}%`;
}

function hasOwn(obj, key) {
  return !!obj && Object.prototype.hasOwnProperty.call(obj, key);
}

function getStoredValue(employee, property, key, fallback = null) {
  if (!employee) return null;
  const bag = employee[property];
  if (hasOwn(bag, key)) return bag[key];
  return fallback;
}

function comparisonEntries(currentEmployee, previousEmployee, kind, threshold) {
  const config = {
    earnings: { rows: 'earnings', all: 'allEarnings', hours: 'allEarningHours' },
    deductions: { rows: 'deductions', all: 'allDeductions' },
    company: { rows: 'company', all: 'allCompany' }
  }[kind];
  if (!config) return [];
  const currentRows = currentEmployee?.[config.rows] || [];
  const previousRows = previousEmployee?.[config.rows] || [];
  const byKey = new Map();
  for (const row of currentRows) byKey.set(row.key || norm(row.description), { currentRow: row, previousRow: null });
  for (const row of previousRows) {
    const key = row.key || norm(row.description);
    if (!byKey.has(key)) byKey.set(key, { currentRow: null, previousRow: row });
    else byKey.get(key).previousRow = row;
  }

  const result = [];
  for (const [key, pair] of byKey.entries()) {
    const currentAmount = getStoredValue(currentEmployee, config.all, key, pair.currentRow?.amount ?? null);
    const previousAmount = getStoredValue(previousEmployee, config.all, key, pair.previousRow?.amount ?? null);
    let currentHours = null;
    let previousHours = null;
    if (kind === 'earnings') {
      currentHours = getStoredValue(currentEmployee, config.hours, key, pair.currentRow?.hoursValue ?? null);
      previousHours = getStoredValue(previousEmployee, config.hours, key, pair.previousRow?.hoursValue ?? null);
    }
    const changed = exceedsThreshold(currentAmount, previousAmount, threshold) ||
      (kind === 'earnings' && exceedsThreshold(currentHours, previousHours, threshold));
    result.push({
      key,
      description: pair.currentRow?.description || pair.previousRow?.description || key,
      currentAmount,
      previousAmount,
      currentAmountText: money(currentAmount),
      previousAmountText: money(previousAmount),
      currentHours,
      previousHours,
      currentHoursText: kind === 'earnings' ? hours(currentHours) : null,
      previousHoursText: kind === 'earnings' ? hours(previousHours) : null,
      changed
    });
  }
  return result;
}

function pairHtml(currentText, previousText) {
  return `<span class="comparison-pair"><span class="current-figure">${esc(currentText)}</span><span class="prior-value">${esc(previousText)}</span></span>`;
}

function previewComparisonPayTable(title, currentEmployee, previousEmployee, kind, currentTotal, previousTotal, threshold, earnings = false) {
  const entries = comparisonEntries(currentEmployee, previousEmployee, kind, threshold);
  const body = entries.length ? entries.map(e => {
    const alertClass = e.changed ? ' comparison-alert' : '';
    return `<tr><td class="${alertClass.trim()}">${esc(e.description)}</td>${earnings ? `<td class="num">${pairHtml(e.currentHoursText,e.previousHoursText)}</td>` : ''}<td class="num">${pairHtml(e.currentAmountText,e.previousAmountText)}</td></tr>`;
  }).join('') : `<tr><td colspan="${earnings ? 3 : 2}">&nbsp;</td></tr>`;
  const totalChanged = exceedsThreshold(currentTotal, previousTotal, threshold);
  return `<table class="pay-table comparison-pay-table"><thead><tr><th class="section-title" colspan="${earnings ? 3 : 2}">${esc(title)}</th></tr><tr><th>Description</th>${earnings ? '<th>Hours</th>' : ''}<th>Amount</th></tr></thead><tbody>${body}<tr class="total"><td class="${totalChanged ? 'comparison-alert' : ''}">TOTAL</td>${earnings ? '<td></td>' : ''}<td class="num">${pairHtml(money(currentTotal),money(previousTotal))}</td></tr></tbody></table>`;
}

function bottomComparisonBox(title, rows) {
  return `<div class="bottom-box comparison-bottom-box"><h4>${esc(title)}</h4>${rows.map(row => `<div class="bottom-row"><span class="${row.changed ? 'comparison-alert' : ''}"><b>${esc(row.label)}</b></span><span>${pairHtml(row.current,row.previous)}</span></div>`).join('')}</div>`;
}

function comparisonPayslipViewModel(currentEmployee, previousEmployee, currentPayroll, previousPayroll, threshold) {
  const current = payslipViewModel(currentEmployee, currentPayroll);
  const previous = previousEmployee ? payslipViewModel(previousEmployee, previousPayroll) : null;
  return { current, previous, threshold };
}

function renderComparisonPreview(currentEmployee, previousEmployee, currentPayroll, previousPayroll, threshold) {
  const { current:p, previous:q } = comparisonPayslipViewModel(currentEmployee, previousEmployee, currentPayroll, previousPayroll, threshold);
  const previousPeriod = previousPayroll?.displayPeriod || 'last month';
  const prior = value => q ? value : MISSING;
  const row = (label, currentText, previousText, currentValue, previousValue) => ({
    label,
    current: currentText,
    previous: q ? previousText : MISSING,
    changed: q ? exceedsThreshold(currentValue, previousValue, threshold) : false
  });
  const ratePrev = previousEmployee?.payRate ?? null;
  const basicCurrent = Number.isFinite(currentEmployee?.payRate) ? currentEmployee.payRate * 195 : null;
  const basicPrev = Number.isFinite(ratePrev) ? ratePrev * 195 : null;
  const netChanged = q ? exceedsThreshold(currentEmployee.nett, previousEmployee.nett, threshold) : false;

  return `<div class="payslip-sheet comparison-sheet">
    <div class="watermark">DRAFT</div>
    <div class="info-box">
      <div class="info-col">${infoRows([['Co. Name:',p.companyName],['Co. Address:',p.companyAddress]])}</div>
      <div class="info-col">${infoRows([['Employee Code:',p.employeeCode],['Employee Name:',p.employeeName],['Employee Address:',p.employeeAddress],['Department:',p.department],['Job Title:',p.jobTitle]])}</div>
      <div class="info-col">${infoRows([['Pay slip:',p.periodEnd],['Payment Dt:',p.paymentDate],['Date Engaged:',p.dateEngaged],['Account Number:',p.accountNumber],['Branch Code:',p.branchCode],['ID Number:',p.idNumber],['Tax Number:',p.taxNumber]])}</div>
    </div>
    <div class="sheet-comparison-legend">Grey figures = ${esc(previousPeriod)} &nbsp; · &nbsp; Red description = change greater than ${esc(Number(threshold).toFixed(1).replace(/\.0$/,''))}%</div>
    <div class="pay-grid">
      ${previewComparisonPayTable('EARNINGS',currentEmployee,previousEmployee,'earnings',currentEmployee.gross,previousEmployee?.gross ?? null,threshold,true)}
      ${previewComparisonPayTable('DEDUCTIONS',currentEmployee,previousEmployee,'deductions',currentEmployee.deductionTotal,previousEmployee?.deductionTotal ?? null,threshold,false)}
      ${previewComparisonPayTable('COMPANY CONTRIBUTIONS',currentEmployee,previousEmployee,'company',currentEmployee.companyTotal,previousEmployee?.companyTotal ?? null,threshold,false)}
    </div>
    <div class="net-pay"><span class="${netChanged ? 'comparison-alert-on-dark' : ''}">Nett Pay:</span><span>${esc(p.nettText)} <span class="prior-value prior-on-dark">${esc(q ? q.nettText : MISSING)}</span></span></div>
    <div class="bottom-grid">
      ${bottomComparisonBox('YEAR-TO-DATE TOTALS',[
        {label:'Taxable Earnings:',current:MISSING,previous:MISSING,changed:false},
        {label:'Perks:',current:MISSING,previous:MISSING,changed:false},
        {label:'Tax:',current:MISSING,previous:MISSING,changed:false},
        row('Rate:',p.payRateText,q ? q.payRateText : MISSING,currentEmployee.payRate,ratePrev),
        row('Basic Salary:',p.basicSalaryText,q ? q.basicSalaryText : MISSING,basicCurrent,basicPrev)
      ])}
      ${bottomComparisonBox('LEAVE DETAILS',[
        {label:'Annual:',current:MISSING,previous:MISSING,changed:false},
        {label:'Grace:',current:MISSING,previous:MISSING,changed:false},
        {label:'Access:',current:MISSING,previous:MISSING,changed:false},
        {label:'Leave Days Due:',current:MISSING,previous:MISSING,changed:false}
      ])}
      ${bottomComparisonBox('CLOCKED HOURS',[
        row('Normal:',p.clocked.normal,q ? q.clocked.normal : MISSING,currentEmployee.clocked.normal,previousEmployee?.clocked.normal ?? null),
        row('Sunday:',p.clocked.sunday,q ? q.clocked.sunday : MISSING,currentEmployee.clocked.sunday,previousEmployee?.clocked.sunday ?? null),
        row('Off Day:',p.clocked.offDay,q ? q.clocked.offDay : MISSING,currentEmployee.clocked.offDay,previousEmployee?.clocked.offDay ?? null),
        row('Holiday:',p.clocked.holiday,q ? q.clocked.holiday : MISSING,currentEmployee.clocked.holiday,previousEmployee?.clocked.holiday ?? null),
        row('Nightshift:',p.clocked.nightshift,q ? q.clocked.nightshift : MISSING,currentEmployee.clocked.nightshift,previousEmployee?.clocked.nightshift ?? null),
        row('Overtime:',p.clocked.overtime,q ? q.clocked.overtime : MISSING,currentEmployee.clocked.overtime,previousEmployee?.clocked.overtime ?? null),
        row('Total Hours:',p.clocked.total,q ? q.clocked.total : MISSING,currentEmployee.clocked.total,previousEmployee?.clocked.total ?? null)
      ])}
    </div>
  </div>`;
}

function pdfContentForComparison(currentEmployee, previousEmployee, currentPayroll, previousPayroll, threshold) {
  const p = payslipViewModel(currentEmployee, currentPayroll);
  const q = previousEmployee ? payslipViewModel(previousEmployee, previousPayroll) : null;
  const out = [];
  const Y = top => PDF_H - top;
  const rect = (x, top, w, h, fillGray=null, stroke=true, lineWidth=.7) => {
    out.push(`${lineWidth} w`);
    if (fillGray !== null) out.push(`${fillGray} g ${x.toFixed(2)} ${(PDF_H-top-h).toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)} re f`);
    if (stroke) out.push(`0 G ${x.toFixed(2)} ${(PDF_H-top-h).toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)} re S`);
  };
  const line = (x1,t1,x2,t2,w=.5) => out.push(`${w} w 0 G ${x1.toFixed(2)} ${Y(t1).toFixed(2)} m ${x2.toFixed(2)} ${Y(t2).toFixed(2)} l S`);
  const text = (value,x,top,size=7,bold=false,color=0,align='left',maxWidth=null) => {
    let s = pdfAscii(value);
    let fs = size;
    if (maxWidth && s) {
      const estimate = approxWidth(s, fs, bold);
      if (estimate > maxWidth) fs = Math.max(4.7, fs * maxWidth / estimate);
      if (approxWidth(s, fs, bold) > maxWidth) {
        while (s.length > 3 && approxWidth(s + '...', fs, bold) > maxWidth) s = s.slice(0,-1);
        s += '...';
      }
    }
    let xx = x;
    const width = approxWidth(s, fs, bold);
    if (align === 'right') xx -= width;
    else if (align === 'center') xx -= width/2;
    const colorOp = Array.isArray(color) ? `${color[0]} ${color[1]} ${color[2]} rg` : `${color} g`;
    out.push(`${colorOp} BT /${bold?'F2':'F1'} ${fs.toFixed(2)} Tf 1 0 0 1 ${xx.toFixed(2)} ${(Y(top)-fs).toFixed(2)} Tm (${pdfEscape(s)}) Tj ET`);
  };
  const fillBlack = (x,top,w,h) => out.push(`0 g ${x.toFixed(2)} ${(PDF_H-top-h).toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)} re f`);
  const alertColor = [0.80,0.05,0.05];
  const priorGray = 0.55;
  const margin = 14;
  const contentW = PDF_W - margin*2;
  const third = contentW/3;

  out.push('0.89 g BT /F2 92 Tf 0.866 0.5 -0.5 0.866 250 150 Tm (DRAFT) Tj ET');

  function infoBox(top, height, leftRows, midRows, rightRows) {
    rect(margin, top, contentW, height, null, true, .8);
    line(margin+third, top, margin+third, top+height, .5);
    line(margin+third*2, top, margin+third*2, top+height, .5);
    const sets = [leftRows, midRows, rightRows];
    for (let ci=0; ci<3; ci++) {
      const x = margin + third*ci + 7;
      const labelW = ci===1 ? 72 : 68;
      const valueX = x + labelW;
      const usable = third - 14 - labelW;
      const rows = sets[ci];
      const step = Math.min(12, (height-12)/Math.max(1, rows.length));
      rows.forEach((row,i) => {
        const topText = top + 6 + i*step;
        text(row[0], x, topText, 6.7, true, 0, 'left', labelW-3);
        text(row[1], valueX, topText, 6.7, false, 0, 'left', usable);
      });
    }
  }

  infoBox(14, 96,
    [['Co. Name:',p.companyName],['Co. Address:',p.companyAddress]],
    [['Employee Code:',p.employeeCode],['Employee Name:',p.employeeName],['Employee Address:',p.employeeAddress],['Department:',p.department],['Job Title:',p.jobTitle]],
    [['Pay slip:',p.periodEnd],['Payment Dt:',p.paymentDate],['Date Engaged:',p.dateEngaged],['Account Number:',p.accountNumber],['Branch Code:',p.branchCode],['ID Number:',p.idNumber],['Tax Number:',p.taxNumber]]
  );

  const thresholdLabel = Number(threshold).toFixed(1).replace(/\.0$/,'');
  text(`Grey = ${previousPayroll?.displayPeriod || 'last month'}   Red description = > ${thresholdLabel}% change`, margin+2, 112, 6.2, false, priorGray, 'left', contentW-4);

  function compactEntries(entries, maxRows) {
    if (entries.length <= maxRows) return entries;
    const head = entries.slice(0, maxRows-1);
    const rest = entries.slice(maxRows-1);
    const finiteCurrent = rest.map(e=>e.currentAmount).filter(Number.isFinite);
    const finitePrevious = rest.map(e=>e.previousAmount).filter(Number.isFinite);
    const currentAmount = finiteCurrent.length ? finiteCurrent.reduce((a,b)=>a+b,0) : null;
    const previousAmount = finitePrevious.length ? finitePrevious.reduce((a,b)=>a+b,0) : null;
    head.push({
      description:`OTHER ITEMS (${rest.length})`,
      currentAmount, previousAmount,
      currentAmountText:money(currentAmount), previousAmountText:money(previousAmount),
      currentHours:null, previousHours:null, currentHoursText:MISSING, previousHoursText:MISSING,
      changed:exceedsThreshold(currentAmount,previousAmount,threshold)
    });
    return head;
  }

  function pairedValue(currentText, previousText, x, right, top, size, maxWidth, currentColor=0) {
    const cellW = right - x;
    text(currentText, x + cellW*.52, top, size, false, currentColor, 'right', cellW*.46);
    text(previousText, right, top, Math.max(4.7,size-.15), false, priorGray, 'right', cellW*.42);
  }

  function payTable(x, top, w, h, title, kind, currentTotal, previousTotal, earnings=false) {
    const titleH = 16, headH = 15, totalH = 17;
    const bodyH = h - titleH - headH - totalH;
    const list = compactEntries(comparisonEntries(currentEmployee, previousEmployee, kind, threshold), 16);
    rect(x, top, w, h, null, true, .7);
    rect(x, top, w, titleH, .84, true, .6);
    text(title, x+5, top+3, 7.5, true, 0, 'left', w-10);
    line(x, top+titleH, x+w, top+titleH, .5);
    const descW = earnings ? w*.54 : w*.68;
    const hoursW = earnings ? w*.17 : 0;
    line(x+descW, top+titleH, x+descW, top+h, .35);
    if (earnings) line(x+descW+hoursW, top+titleH, x+descW+hoursW, top+h, .35);
    text('Description',x+4,top+titleH+3,6.5,true,0,'left',descW-8);
    if (earnings) text('Hours',x+descW+hoursW/2,top+titleH+3,6.5,true,0,'center',hoursW-4);
    text('Amount',x+w-4,top+titleH+3,6.5,true,0,'right',w-descW-hoursW-8);
    line(x, top+titleH+headH, x+w, top+titleH+headH, .45);
    const rowH = list.length ? Math.min(15, bodyH / list.length) : bodyH;
    const font = Math.max(5.0, Math.min(6.2, rowH*.60));
    list.forEach((e,i) => {
      const rt = top+titleH+headH+i*rowH;
      if (i>0) line(x,rt,x+w,rt,.25);
      const ty = rt+Math.max(1,(rowH-font)/2);
      text(e.description,x+4,ty,font,false,e.changed?alertColor:0,'left',descW-8);
      if (earnings) pairedValue(e.currentHoursText,e.previousHoursText,x+descW+2,x+descW+hoursW-3,ty,font,hoursW-6);
      pairedValue(e.currentAmountText,e.previousAmountText,x+descW+hoursW+2,x+w-4,ty,font,w-descW-hoursW-6);
    });
    const totalTop = top+h-totalH;
    line(x,totalTop,x+w,totalTop,1.1);
    const totalChanged = previousEmployee ? exceedsThreshold(currentTotal, previousTotal, threshold) : false;
    text('TOTAL',x+4,totalTop+3,7.2,true,totalChanged?alertColor:0);
    pairedValue(money(currentTotal),money(previousTotal),x+descW+hoursW+2,x+w-4,totalTop+3,6.5,w-descW-hoursW-6);
  }

  const tablesTop = 124, tablesH = 244, gap = 7;
  const tableW = (contentW - gap*2)/3;
  payTable(margin,tablesTop,tableW,tablesH,'EARNINGS','earnings',currentEmployee.gross,previousEmployee?.gross ?? null,true);
  payTable(margin+tableW+gap,tablesTop,tableW,tablesH,'DEDUCTIONS','deductions',currentEmployee.deductionTotal,previousEmployee?.deductionTotal ?? null,false);
  payTable(margin+(tableW+gap)*2,tablesTop,tableW,tablesH,'COMPANY CONTRIBUTIONS','company',currentEmployee.companyTotal,previousEmployee?.companyTotal ?? null,false);

  const netTop = 376, netH = 25;
  fillBlack(margin,netTop,contentW,netH);
  const netChanged = previousEmployee ? exceedsThreshold(currentEmployee.nett, previousEmployee.nett, threshold) : false;
  text('Nett Pay:',PDF_W/2-62,netTop+4,11,true,netChanged?alertColor:1,'right');
  text(p.nettText,PDF_W/2+28,netTop+4,10.5,true,1,'right',95);
  text(q ? q.nettText : MISSING,PDF_W/2+115,netTop+4,9.2,true,0.70,'right',80);

  function keyValueBox(x,top,w,h,title,rows) {
    const titleH=17;
    rect(x,top,w,h,null,true,.7);
    rect(x,top,w,titleH,.88,true,.5);
    text(title,x+w/2,top+3,7.4,true,0,'center',w-10);
    const rowH=(h-titleH)/rows.length;
    rows.forEach((r,i)=>{
      const rt=top+titleH+i*rowH;
      if (i>0) line(x,rt,x+w,rt,.3);
      line(x+w*.63,rt,x+w*.63,rt+rowH,.3);
      const fs=Math.min(6.4,rowH*.50);
      text(r.label,x+5,rt+Math.max(2,(rowH-fs)/2),fs,true,r.changed?alertColor:0,'left',w*.63-10);
      pairedValue(r.current,r.previous,x+w*.63+3,x+w-5,rt+Math.max(2,(rowH-fs)/2),Math.max(4.8,fs-.2),w*.37-8);
    });
  }

  const pairRow = (label,currentText,previousText,currentValue,previousValue) => ({
    label,current:currentText,previous:previousEmployee?previousText:MISSING,
    changed:previousEmployee?exceedsThreshold(currentValue,previousValue,threshold):false
  });
  const ratePrev = previousEmployee?.payRate ?? null;
  const basicCurrent = Number.isFinite(currentEmployee?.payRate) ? currentEmployee.payRate*195 : null;
  const basicPrev = Number.isFinite(ratePrev) ? ratePrev*195 : null;

  const bottomTop=409, bottomH=171;
  keyValueBox(margin,bottomTop,tableW,bottomH,'YEAR-TO-DATE TOTALS',[
    {label:'Taxable Earnings:',current:MISSING,previous:MISSING,changed:false},
    {label:'Perks:',current:MISSING,previous:MISSING,changed:false},
    {label:'Tax:',current:MISSING,previous:MISSING,changed:false},
    pairRow('Rate:',p.payRateText,q?q.payRateText:MISSING,currentEmployee.payRate,ratePrev),
    pairRow('Basic Salary:',p.basicSalaryText,q?q.basicSalaryText:MISSING,basicCurrent,basicPrev)
  ]);
  keyValueBox(margin+tableW+gap,bottomTop,tableW,bottomH,'LEAVE DETAILS',[
    {label:'Annual:',current:MISSING,previous:MISSING,changed:false},
    {label:'Grace:',current:MISSING,previous:MISSING,changed:false},
    {label:'Access:',current:MISSING,previous:MISSING,changed:false},
    {label:'Leave Days Due:',current:MISSING,previous:MISSING,changed:false}
  ]);
  keyValueBox(margin+(tableW+gap)*2,bottomTop,tableW,bottomH,'CLOCKED HOURS',[
    pairRow('Normal:',p.clocked.normal,q?q.clocked.normal:MISSING,currentEmployee.clocked.normal,previousEmployee?.clocked.normal ?? null),
    pairRow('Sunday:',p.clocked.sunday,q?q.clocked.sunday:MISSING,currentEmployee.clocked.sunday,previousEmployee?.clocked.sunday ?? null),
    pairRow('Off Day:',p.clocked.offDay,q?q.clocked.offDay:MISSING,currentEmployee.clocked.offDay,previousEmployee?.clocked.offDay ?? null),
    pairRow('Holiday:',p.clocked.holiday,q?q.clocked.holiday:MISSING,currentEmployee.clocked.holiday,previousEmployee?.clocked.holiday ?? null),
    pairRow('Nightshift:',p.clocked.nightshift,q?q.clocked.nightshift:MISSING,currentEmployee.clocked.nightshift,previousEmployee?.clocked.nightshift ?? null),
    pairRow('Overtime:',p.clocked.overtime,q?q.clocked.overtime:MISSING,currentEmployee.clocked.overtime,previousEmployee?.clocked.overtime ?? null),
    pairRow('Total Hours:',p.clocked.total,q?q.clocked.total:MISSING,currentEmployee.clocked.total,previousEmployee?.clocked.total ?? null)
  ]);

  return out.join('\n');
}

function generatePdfFromContents(pageContent) {
  if (!pageContent.length) throw new Error('Select at least one employee before generating the PDF.');
  const enc = new TextEncoder();
  const firstContentObj = 5;
  const pageRefs = pageContent.map((_,i)=>firstContentObj+i*2+1);
  const objects = new Map();
  objects.set(1,'<< /Type /Catalog /Pages 2 0 R >>');
  objects.set(2,`<< /Type /Pages /Count ${pageContent.length} /Kids [${pageRefs.map(n=>`${n} 0 R`).join(' ')}] >>`);
  objects.set(3,'<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');
  objects.set(4,'<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>');
  pageContent.forEach((content,i)=>{
    const contentObj=firstContentObj+i*2;
    const pageObj=contentObj+1;
    const length=enc.encode(content).length;
    objects.set(contentObj,`<< /Length ${length} >>\nstream\n${content}\nendstream`);
    objects.set(pageObj,`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PDF_W} ${PDF_H}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${contentObj} 0 R >>`);
  });
  const chunks=[];
  let offset=0;
  const header=enc.encode('%PDF-1.4\n%1234\n');
  chunks.push(header); offset+=header.length;
  const maxObj=Math.max(...objects.keys());
  const offsets=new Array(maxObj+1).fill(0);
  for (let n=1;n<=maxObj;n++) {
    offsets[n]=offset;
    const bytes=enc.encode(`${n} 0 obj\n${objects.get(n)}\nendobj\n`);
    chunks.push(bytes); offset+=bytes.length;
  }
  const xrefOffset=offset;
  let xref=`xref\n0 ${maxObj+1}\n0000000000 65535 f \n`;
  for (let n=1;n<=maxObj;n++) xref+=`${String(offsets[n]).padStart(10,'0')} 00000 n \n`;
  xref+=`trailer\n<< /Size ${maxObj+1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;
  chunks.push(enc.encode(xref));
  return concatUint8(chunks);
}

function generateComparisonPdf(comparisonState, selectedRecords = null) {
  const records = selectedRecords || comparisonState.employees.filter(r=>r.selected !== false);
  const pageContent = records.map(r => pdfContentForComparison(
    r.current,
    r.previous,
    comparisonState.currentPayroll,
    comparisonState.previousPayroll,
    comparisonState.threshold
  ));
  return generatePdfFromContents(pageContent);
}

// -----------------------------
// Browser UI
// -----------------------------

// -----------------------------
// Browser UI
// -----------------------------

let payrollState = null;
let comparisonCurrentPayroll = null;
let comparisonPreviousPayroll = null;
let comparisonState = null;
let comparisonPreviewIndex = 0;
let deferredInstallPrompt = null;

function $(id) { return document.getElementById(id); }

function setStatus(message, kind='neutral') {
  const el=$('fileStatus');
  if (!el) return;
  el.textContent=message;
  el.className=`status ${kind}`;
}

function setComparisonStatus(message, kind='neutral') {
  const el=$('comparisonStatus');
  if (!el) return;
  el.textContent=message;
  el.className=`status ${kind}`;
}

function setRoleStatus(role, message, kind='neutral') {
  const id = role === 'current' ? 'currentMonthStatus' : 'previousMonthStatus';
  const el=$(id);
  if (!el) return;
  el.textContent=message;
  el.className=`status ${kind}`;
}

async function fileToArrayBuffer(file) {
  if (typeof file.arrayBuffer === 'function') return file.arrayBuffer();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error || new Error('The selected Excel file could not be read.'));
    reader.readAsArrayBuffer(file);
  });
}

function updateSelectedCount() {
  if (!payrollState) return;
  $('selectedCount').textContent=String(payrollState.employees.filter(e=>e.selected).length);
  $('generateBtn').disabled=!payrollState.employees.some(e=>e.selected);
}

function renderEmployeeTable() {
  const body=$('employeeRows');
  body.innerHTML='';
  payrollState.employees.forEach((e,index)=>{
    const tr=document.createElement('tr');
    tr.innerHTML=`<td class="check-col"><input type="checkbox" ${e.selected?'checked':''} aria-label="Select ${esc(e.name)}"></td><td><strong>${esc(e.name)}</strong></td><td>${esc(e.code)}</td><td class="num">${esc(money(e.gross))}</td><td class="num">${esc(money(e.deductionTotal))}</td><td class="num"><strong>${esc(money(e.nett))}</strong></td><td><button class="preview-button" type="button">Preview</button></td>`;
    tr.querySelector('input').addEventListener('change',ev=>{ e.selected=ev.target.checked; updateSelectedCount(); });
    tr.querySelector('button').addEventListener('click',()=>showPreview(index));
    body.appendChild(tr);
  });
  updateSelectedCount();
}

function showPreview(index=0) {
  if (!payrollState) return;
  const e=payrollState.employees[index];
  $('previewTitle').textContent=`${e.name} (${e.code})`;
  $('payslipPreview').innerHTML=renderPreview(e,payrollState);
  $('previewCard').classList.remove('hidden');
  $('previewCard').scrollIntoView({behavior:'smooth',block:'start'});
}

async function handleFile(file) {
  if (!file) return;
  if (!/\.xlsx$/i.test(file.name)) { setStatus('Please select an .xlsx Excel workbook.','error'); return; }
  setStatus(`Reading ${file.name}...`,'neutral');
  $('summaryCard').classList.add('hidden');
  $('previewCard').classList.add('hidden');
  $('generateCard').classList.add('hidden');
  try {
    const parsed=await parsePayrollWorkbook(await fileToArrayBuffer(file));
    parsed.sourceName=file.name;
    payrollState=parsed;
    $('employeeCount').textContent=String(parsed.employees.length);
    $('periodEnd').textContent=parsed.periodEnd;
    $('payrollMeta').textContent=`${parsed.displayPeriod} · ${parsed.sheetName} · ${file.name}`;
    renderEmployeeTable();
    $('summaryCard').classList.remove('hidden');
    $('generateCard').classList.remove('hidden');
    setStatus(`${parsed.employees.length} employees loaded successfully. Payroll data remains on this device.`,'success');
    showPreview(0);
  } catch (err) {
    console.error(err);
    payrollState=null;
    setStatus(err?.message || 'The workbook could not be read.','error');
  }
}

function clearPayroll() {
  payrollState=null;
  $('fileInput').value='';
  $('employeeRows').innerHTML='';
  $('summaryCard').classList.add('hidden');
  $('previewCard').classList.add('hidden');
  $('generateCard').classList.add('hidden');
  setStatus('No pay grid loaded.','neutral');
}

function outputFilename() {
  const period = payrollState?.displayPeriod && payrollState.displayPeriod !== 'Payroll period' ? payrollState.displayPeriod : 'Payroll';
  return `XPaylo Draft Payslips - ${period}.pdf`.replace(/[\\/:*?"<>|]/g,'-');
}

function getComparisonThreshold() {
  const input=$('comparisonThreshold');
  let value=Number(input?.value);
  if (!Number.isFinite(value) || value < 0) value=10;
  if (input && String(input.value).trim() === '') value=10;
  return value;
}

function saveComparisonThreshold(value) {
  try { localStorage.setItem('xpayloComparisonThreshold', String(value)); } catch (_) {}
}

function loadComparisonThreshold() {
  let value=10;
  try {
    const saved=Number(localStorage.getItem('xpayloComparisonThreshold'));
    if (Number.isFinite(saved) && saved >= 0) value=saved;
  } catch (_) {}
  $('comparisonThreshold').value=String(value);
  $('comparisonThresholdDisplay').textContent=`${value}%`;
}

function buildComparisonState() {
  if (!comparisonCurrentPayroll || !comparisonPreviousPayroll) return;
  const previousByCode = new Map();
  for (const e of comparisonPreviousPayroll.employees) {
    const key=norm(e.code);
    if (!previousByCode.has(key)) previousByCode.set(key,e);
  }
  const threshold=getComparisonThreshold();
  const employees=comparisonCurrentPayroll.employees.map(e=>({
    current:e,
    previous:previousByCode.get(norm(e.code)) || null,
    selected:true
  }));
  comparisonState={
    currentPayroll:comparisonCurrentPayroll,
    previousPayroll:comparisonPreviousPayroll,
    threshold,
    employees
  };
  const matched=employees.filter(r=>r.previous).length;
  $('comparisonEmployeeCount').textContent=String(employees.length);
  $('comparisonMatchedCount').textContent=String(matched);
  $('comparisonUnmatchedCount').textContent=String(employees.length-matched);
  $('comparisonThresholdDisplay').textContent=`${threshold}%`;
  $('comparisonMeta').textContent=`${comparisonCurrentPayroll.displayPeriod} compared with ${comparisonPreviousPayroll.displayPeriod}`;
  renderComparisonTable();
  $('comparisonSummaryCard').classList.remove('hidden');
  $('comparisonGenerateCard').classList.remove('hidden');
  setComparisonStatus(`${employees.length} current employees loaded; ${matched} matched to last month by employee code.`,'success');
  comparisonPreviewIndex=0;
  showComparisonPreview(0);
}

function updateComparisonSelectedCount() {
  if (!comparisonState) return;
  $('generateComparisonBtn').disabled=!comparisonState.employees.some(r=>r.selected);
}

function renderComparisonTable() {
  if (!comparisonState) return;
  const body=$('comparisonEmployeeRows');
  body.innerHTML='';
  const threshold=comparisonState.threshold;
  comparisonState.employees.forEach((r,index)=>{
    const pct=changeText(r.current.gross,r.previous?.gross ?? null);
    const changed=r.previous ? exceedsThreshold(r.current.gross,r.previous.gross,threshold) : false;
    const tr=document.createElement('tr');
    tr.innerHTML=`<td class="check-col"><input type="checkbox" ${r.selected?'checked':''} aria-label="Select ${esc(r.current.name)}"></td><td><strong>${esc(r.current.name)}</strong></td><td>${esc(r.current.code)}</td><td class="num">${esc(money(r.current.gross))}</td><td class="num prior-table-value">${esc(r.previous?money(r.previous.gross):MISSING)}</td><td class="num ${changed?'change-alert':''}">${esc(pct)}</td><td><button class="preview-button" type="button">Preview</button></td>`;
    tr.querySelector('input').addEventListener('change',ev=>{ r.selected=ev.target.checked; updateComparisonSelectedCount(); });
    tr.querySelector('button').addEventListener('click',()=>showComparisonPreview(index));
    body.appendChild(tr);
  });
  updateComparisonSelectedCount();
}

function showComparisonPreview(index=0) {
  if (!comparisonState) return;
  const r=comparisonState.employees[index];
  if (!r) return;
  comparisonPreviewIndex=index;
  $('comparisonPreviewTitle').textContent=`${r.current.name} (${r.current.code}) · ${comparisonState.currentPayroll.displayPeriod} vs ${comparisonState.previousPayroll.displayPeriod}`;
  $('comparisonPayslipPreview').innerHTML=renderComparisonPreview(r.current,r.previous,comparisonState.currentPayroll,comparisonState.previousPayroll,comparisonState.threshold);
  $('comparisonPreviewCard').classList.remove('hidden');
  $('comparisonPreviewCard').scrollIntoView({behavior:'smooth',block:'start'});
}

function hideComparisonResults() {
  comparisonState=null;
  $('comparisonEmployeeRows').innerHTML='';
  $('comparisonSummaryCard').classList.add('hidden');
  $('comparisonPreviewCard').classList.add('hidden');
  $('comparisonGenerateCard').classList.add('hidden');
}

async function handleComparisonFile(file, role) {
  if (!file) return;
  if (!/\.xlsx$/i.test(file.name)) { setRoleStatus(role,'Please select an .xlsx Excel workbook.','error'); return; }
  setRoleStatus(role,`Reading ${file.name}...`,'neutral');
  hideComparisonResults();
  try {
    const parsed=await parsePayrollWorkbook(await fileToArrayBuffer(file));
    parsed.sourceName=file.name;
    if (role==='current') comparisonCurrentPayroll=parsed;
    else comparisonPreviousPayroll=parsed;
    setRoleStatus(role,`${parsed.displayPeriod} · ${parsed.employees.length} employees · ${file.name}`,'success');
    if (comparisonCurrentPayroll && comparisonPreviousPayroll) buildComparisonState();
    else setComparisonStatus('Load both pay grids to begin the comparison.','neutral');
  } catch (err) {
    console.error(err);
    if (role==='current') comparisonCurrentPayroll=null;
    else comparisonPreviousPayroll=null;
    setRoleStatus(role,err?.message || 'The workbook could not be read.','error');
    setComparisonStatus('One of the pay grids could not be read.','error');
  }
}

function clearComparison() {
  comparisonCurrentPayroll=null;
  comparisonPreviousPayroll=null;
  hideComparisonResults();
  $('currentMonthInput').value='';
  $('previousMonthInput').value='';
  setRoleStatus('current','Not loaded.','neutral');
  setRoleStatus('previous','Not loaded.','neutral');
  setComparisonStatus('Load both pay grids to begin the comparison.','neutral');
}

function comparisonOutputFilename() {
  const current=comparisonState?.currentPayroll?.displayPeriod || 'This Month';
  const previous=comparisonState?.previousPayroll?.displayPeriod || 'Last Month';
  return `XPaylo Payslip Comparison - ${current} vs ${previous}.pdf`.replace(/[\\/:*?"<>|]/g,'-');
}

function downloadBytes(bytes, filename) {
  const blob=new Blob([bytes],{type:'application/pdf'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');
  a.href=url; a.download=filename; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),3000);
}

function initDropZone(zoneId, inputId, handler) {
  const zone=$(zoneId);
  const input=$(inputId);
  if (!zone || !input) return;
  input.addEventListener('change',()=>handler(input.files?.[0]));
  ['dragenter','dragover'].forEach(evt=>zone.addEventListener(evt,e=>{e.preventDefault();zone.classList.add('dragover');}));
  ['dragleave','drop'].forEach(evt=>zone.addEventListener(evt,e=>{e.preventDefault();zone.classList.remove('dragover');}));
  zone.addEventListener('drop',e=>handler(e.dataTransfer?.files?.[0]));
}

function initTabs() {
  const tabs = [...document.querySelectorAll('[data-tab]')];
  const panels = [...document.querySelectorAll('[data-tab-panel]')];
  if (!tabs.length || !panels.length) return;
  const subtitles = {
    'payslip-generator':'Excel pay grid to one combined draft payslip PDF',
    'payslip-comparison':'Compare this month with last month on every payslip'
  };
  const activate = name => {
    tabs.forEach(tab => {
      const active = tab.dataset.tab === name;
      tab.classList.toggle('active', active);
      if (active) tab.setAttribute('aria-current', 'page');
      else tab.removeAttribute('aria-current');
    });
    panels.forEach(panel => panel.classList.toggle('active', panel.dataset.tabPanel === name));
    const activeTab = tabs.find(tab => tab.dataset.tab === name);
    if ($('pageTitle') && activeTab) $('pageTitle').textContent = activeTab.querySelector('.nav-text')?.textContent || activeTab.title || 'XPaylo';
    if ($('pageSubtitle')) $('pageSubtitle').textContent=subtitles[name] || 'XPaylo for Eldon';
  };
  tabs.forEach(tab => tab.addEventListener('click', () => activate(tab.dataset.tab)));
  activate(tabs.find(tab => tab.classList.contains('active'))?.dataset.tab || tabs[0].dataset.tab);
}

function showApplicationError(message) {
  const comparisonPanel=document.querySelector('[data-tab-panel="payslip-comparison"]');
  if (comparisonPanel?.classList.contains('active')) setComparisonStatus(`Application error: ${message}`,'error');
  else setStatus(`Application error: ${message}`,'error');
}

function initBrowser() {
  initTabs();
  loadComparisonThreshold();
  window.addEventListener('error', event => {
    console.error('Application error:', event.error || event.message);
    showApplicationError(event.message || 'unknown error');
  });
  window.addEventListener('unhandledrejection', event => {
    console.error('Unhandled application error:', event.reason);
    showApplicationError(event.reason?.message || event.reason || 'unknown error');
  });

  setStatus('Ready. Choose an .xlsx payroll pay grid.','neutral');
  initDropZone('dropZone','fileInput',handleFile);
  initDropZone('currentDropZone','currentMonthInput',file=>handleComparisonFile(file,'current'));
  initDropZone('previousDropZone','previousMonthInput',file=>handleComparisonFile(file,'previous'));

  $('selectAllBtn').addEventListener('click',()=>{ if(!payrollState)return; payrollState.employees.forEach(e=>e.selected=true); renderEmployeeTable(); });
  $('clearAllBtn').addEventListener('click',()=>{ if(!payrollState)return; payrollState.employees.forEach(e=>e.selected=false); renderEmployeeTable(); });
  $('clearPayrollBtn').addEventListener('click',clearPayroll);
  $('generateBtn').addEventListener('click',()=>{
    try {
      const selected=payrollState.employees.filter(e=>e.selected);
      const bytes=generatePayslipPdf(payrollState,selected);
      downloadBytes(bytes,outputFilename());
      setStatus(`Generated one PDF containing ${selected.length} payslip page${selected.length===1?'':'s'}.`,'success');
    } catch(err) { setStatus(err?.message || 'Could not generate PDF.','error'); }
  });

  $('comparisonSelectAllBtn').addEventListener('click',()=>{ if(!comparisonState)return; comparisonState.employees.forEach(r=>r.selected=true); renderComparisonTable(); });
  $('comparisonClearAllBtn').addEventListener('click',()=>{ if(!comparisonState)return; comparisonState.employees.forEach(r=>r.selected=false); renderComparisonTable(); });
  $('clearComparisonBtn').addEventListener('click',clearComparison);
  $('comparisonThreshold').addEventListener('input',()=>{
    const threshold=getComparisonThreshold();
    saveComparisonThreshold(threshold);
    $('comparisonThresholdDisplay').textContent=`${threshold}%`;
    if (comparisonState) {
      comparisonState.threshold=threshold;
      renderComparisonTable();
      showComparisonPreview(Math.min(comparisonPreviewIndex,comparisonState.employees.length-1));
    }
  });
  $('generateComparisonBtn').addEventListener('click',()=>{
    try {
      if (!comparisonState) throw new Error('Load both pay grids before generating the comparison PDF.');
      const selected=comparisonState.employees.filter(r=>r.selected);
      const bytes=generateComparisonPdf(comparisonState,selected);
      downloadBytes(bytes,comparisonOutputFilename());
      setComparisonStatus(`Generated one PDF containing ${selected.length} comparison payslip page${selected.length===1?'':'s'}.`,'success');
    } catch(err) { setComparisonStatus(err?.message || 'Could not generate the comparison PDF.','error'); }
  });

  window.addEventListener('beforeinstallprompt',e=>{
    e.preventDefault(); deferredInstallPrompt=e; $('installBtn').classList.remove('hidden');
  });
  $('installBtn').addEventListener('click',async()=>{
    if(!deferredInstallPrompt)return;
    deferredInstallPrompt.prompt();
    await deferredInstallPrompt.userChoice;
    deferredInstallPrompt=null; $('installBtn').classList.add('hidden');
  });
  window.addEventListener('appinstalled',()=>{ deferredInstallPrompt=null; $('installBtn').classList.add('hidden'); });

  if ('serviceWorker' in navigator && (location.protocol==='https:' || location.hostname==='localhost' || location.hostname==='127.0.0.1')) {
    navigator.serviceWorker.register('./service-worker.js').catch(err=>console.warn('Service worker registration failed',err));
  }
}

if (typeof document !== 'undefined') initBrowser();
