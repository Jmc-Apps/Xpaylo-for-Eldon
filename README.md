# XPaylo for Eldon v1.2.3

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
- Rebuilt grids can now carry printed YTD and leave values into comparison payslips.

## Payslip to Pay Grid
- Upload a multi-page PDF containing employee payslips.
- Payslips can span more than one PDF page; continuation pages are grouped into one employee record.
- Rebuilds a Pay Grid-style `.xlsx` from supported values found on the payslips.
- Keeps the original 127 Pay Grid columns and appends XPaylo comparison metadata columns for YTD and leave figures present on payslips.
- Uncertain records are flagged for review instead of guessed.

## v1.2.3 changes
- Fixed the app version display so all visible labels use one version source (`version.js`).
- Service-worker cache naming now uses the same version source and core app files use network-first update behaviour.
- Fixed `D-LOAN UNIFORM 1` / `LOAN UNIFORM 1` mapping to `D-UNIFORM 1`, with equivalent Uniform 2 support.
- Improved reconstructed Earnings, Deductions and Company Contribution totals, including fallback totals from detected line items.
- When both `Rate` and `Hourly Rate` are printed, PAY RATE now uses `Hourly Rate`.
- Preserves printed YTD Taxable Earnings, Perks, Tax and Leave values in XPaylo extension columns for comparison use.
- Payslip Comparison now displays reconstructed prior-month YTD and leave values instead of `####` where they were present in the source payslip.

## Privacy
Payroll workbooks and PDFs are processed in the browser. XPaylo does not upload payroll data to a server.
