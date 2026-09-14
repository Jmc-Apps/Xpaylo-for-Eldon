# XPaylo for Eldon v1.2.4

Offline-capable PWA for producing and comparing draft payslips and rebuilding a Pay Grid from payslip PDFs.

## Payslip Generator
- Upload an `.xlsx` payroll pay grid.
- Review and select employees.
- Generate one combined A4 landscape PDF with one payslip per page.
- Missing fields remain labelled and display `####`.
- Basic Salary uses Pay Rate directly when Pay Rate equals Normal Pay (fixed monthly wage); otherwise it is Pay Rate x 195.
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

## v1.2.4 changes
- Fixed Basic Salary for fixed-monthly employees: when PAY RATE equals NORMAL PAY to the nearest cent, Basic Salary equals PAY RATE; otherwise the existing PAY RATE x 195 calculation remains.
- Applies the Basic Salary rule independently to current and previous months in Payslip Comparison.
- Normalizes `LOAN UNIFORM 1` / `D-LOAN UNIFORM 1` and `UNIFORM 1` / `D-UNIFORM 1` as one deduction item, with the same handling for Uniform 2.
- Payslip Comparison now shows one Uniform deduction row with current and previous values side by side instead of duplicate alias rows.

## Privacy
Payroll workbooks and PDFs are processed in the browser. XPaylo does not upload payroll data to a server.
