# XPaylo for Eldon v1.2.5

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

## v1.2.5 changes
- Generalized deduction matching so the Pay Grid `D-` prefix is treated as a deduction category prefix rather than part of the payslip description.
- Payslip `OTHER RECOVERY` now maps to Pay Grid `D-OTHER RECOVERY`, and the same rule applies across the deduction section instead of relying on one-off aliases.
- Made PDF payroll-row parsing more tolerant when a description and amount are flattened into one PDF text object, while preserving numbers that are genuinely part of descriptions such as `UNIFORM 1`, `3PTY`, and `SANLAM G-4000`.
- Retains the fixed-monthly Basic Salary logic and Uniform alias normalization from the previous build.

## Privacy
Payroll workbooks and PDFs are processed in the browser. XPaylo does not upload payroll data to a server.
