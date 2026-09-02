# XPaylo for Eldon v1.1.1

Offline-capable PWA for producing draft payslips from the Eldon payroll pay grid.

## Payslip Generator
- Upload an `.xlsx` payroll pay grid.
- Review and select employees.
- Preview payslips.
- Generate one combined A4 landscape PDF with one payslip per page.
- Missing fields remain labelled and display `####`.
- Basic Salary is calculated as Pay Rate x 195.
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

## Privacy
Payroll workbooks are processed in the browser. XPaylo does not upload payroll data to a server.


## v1.1.1 changes
- Sidebar XPaylo logo is now twice the previous desktop size.
- Removed the adjacent “XPaylo for Eldon” text from the sidebar; the logo is now the sole branding element there.
- Refreshed the PWA icon files directly from the approved XPaylo logo and added a dedicated Apple touch icon so installed web apps use the XPaylo logo.
