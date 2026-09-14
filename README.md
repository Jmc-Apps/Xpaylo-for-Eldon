# XPaylo for Eldon v1.2.2

Offline-capable PWA for producing and comparing draft payslips and rebuilding a Pay Grid from payslip PDFs.

## Payslip Generator
- Upload an `.xlsx` payroll pay grid.
- Review and select employees.
- Generate one combined A4 landscape PDF with one payslip per page.
- Missing fields remain labelled and display `####`.
- Basic Salary is calculated as Pay Rate x 195.
- Every payslip has a DRAFT watermark.

## Payslip Comparison
- Upload this month and last month pay grids.
- Employees are matched primarily by employee code.
- Previous-month figures appear in grey beside current values.
- Configurable percentage-change threshold, default 10%.
- Descriptions turn red when the absolute change exceeds the threshold.

## Payslip to Pay Grid
- Upload a multi-page PDF containing employee payslips.
- Payslips can span more than one PDF page. Continuation pages are grouped into one employee record.
- Rebuilds a Pay Grid-style `.xlsx` from supported values found on the payslips.
- Uncertain records are flagged for review instead of guessed.

## v1.2.2 changes
- Fixed employee name/code extraction when PDF text from adjacent contact-information columns is interleaved on the same line.
- `EMP Name` is now reconstructed strictly from the dedicated Employee Name and Employee Code fields.
- Added explicit boundaries for Contact Person, Contact Email, Contact Number and Bank fields.
- Employee codes are validated as compact identifiers before they are used for matching/export.
- Example: `BRIGITTE HEIN` + `ADBH001` exports exactly as `BRIGITTE HEIN (ADBH001)`.

## Privacy
Payroll workbooks and PDFs are processed in the browser. XPaylo does not upload payroll data to a server.
