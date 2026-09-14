# XPaylo for Eldon v1.2.1

Offline-capable PWA for producing, comparing and reconstructing payroll pay grids and draft payslips.

## Payslip Generator
- Upload an `.xlsx` payroll pay grid.
- Review and select employees.
- Preview payslips.
- Generate one combined A4 landscape PDF with one payslip per page.
- Missing fields remain labelled and display `####`.
- Basic Salary is calculated as Pay Rate × 195.
- Every payslip has a DRAFT watermark.

## Payslip Comparison
- Upload this month's and last month's `.xlsx` pay grids.
- Employees are matched by employee code.
- Current-month figures remain the primary figures.
- Last-month figures are shown beside them in grey.
- A configurable absolute percentage-change threshold controls alerts; the default is 10%.
- When a comparable figure changes by more than the threshold, its description is red.
- Missing prior-month values display `####` rather than being guessed.
- Generate one combined A4 landscape PDF with one comparison payslip per page.

## Payslip to Pay Grid
- Upload a text-based PDF containing employee payslips.
- Payslips may span one, two or more PDF pages.
- Continuation pages are grouped by repeated employee code/name where possible.
- If a continuation page does not repeat employee identification, XPaylo can group it with the immediately preceding payslip by position and flags the record for review.
- Earnings, deductions, company contributions, nett pay, rate and clocked hours are mapped back into the known 127-column Pay Grid structure.
- Values that cannot be reconstructed reliably are left blank rather than invented.
- Ambiguous/conflicting page data is flagged for review.
- Export the reconstructed payroll as an `.xlsx` file.

## v1.2.1 changes
- Added multi-page payslip support to Payslip to Pay Grid.
- Continuation pages no longer become separate employees.
- Review table now shows page ranges for each grouped payslip.
- PDF page count and grouped payslip count are reported separately.
- Updated offline cache/version metadata for the new converter files.

## Privacy
Payroll workbooks and PDFs are processed in the browser. XPaylo does not upload payroll data to a server.
