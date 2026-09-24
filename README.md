# CosmoDoc

A lightweight native XLSX editor built for focused spreadsheet workflows.

CosmoDoc opens real Excel workbooks, preserves their existing structure, and provides a streamlined local interface for editing spreadsheet data and worksheet images without requiring Microsoft Excel for the editing workflow.

## v1.0.0

The first production release.

### Spreadsheet editing

- Open existing `.xlsx` workbooks
- Edit worksheet cell values
- Edit merged-cell values
- Preserve workbook merges, styles, geometry, and number formats
- Live formula refresh for supported workbook formulas
- Preserve numeric XLSX scalar types for native Excel interoperability
- Save changes back to XLSX

### Worksheet images

- Import photos
- Select existing worksheet images
- Move images
- Resize images
- Delete images
- Preserve worksheet media through XLSX save/reopen

### Compatibility

CosmoDoc v1.0.0 was acceptance-tested with a real reimbursement workbook through the complete round trip:

CosmoDoc → XLSX → Microsoft Excel

Edited text, numeric values, merged cells, formulas/totals, formatting, workbook geometry, logo artwork, and worksheet photos were verified through the workflow.

## Platform

Windows x64

## Technology

- Tauri
- TypeScript
- Vite
- ExcelJS
- Rust

## Status

v1.0.0 — first stable release.