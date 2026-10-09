# DATEV Exporter for [Billy](https://usebilly.app)

A [Billy](https://usebilly.app) plugin that exports invoices as a **DATEV Buchungsstapel** CSV in the **EXTF** format (version 13)—for import testing in DATEV Rechnungswesen. Requires Billy with structured plugin exports and export settings support.

## What it Does

- **Buchungsstapel export.** Produces one EXTF file per calendar year with metadata header, fixed column headers, and booking rows.
- **One row per VAT rate.** Invoices with multiple VAT rates get a separate booking row for each (gross amount, mapped to the matching SKR03 Erlöskonto).
- **Outgoing invoices as Soll on Debitor.** Normal invoices debit the configured collective debtor account (default `10000`); cancellations use `"H"` (Haben) instead of `"S"`.
- **SKR03 revenue accounts.** 19% → `8400`, 7% → `8300`, Kleinunternehmer (§ 19 UStG) → `8195`, all other rates → `8120`.
- **Invoice metadata on each row.** Belegdatum (`DDMM`), Belegfeld 1 (invoice number), Buchungstext (customer name), and Leistungsdatum (`DDMMYYYY`).
- **Foreign currency.** Sets `WKZ Umsatz` when an invoice currency is not EUR.

Sorting, invoice numbers, and the export period (earliest to latest invoice date) follow Billy’s usual invoice order and your active profile.

## Install

1. In Billy, open **Settings → Plugins**.
2. Click **Add Plugin…** and select the `DATEV.billyplugin` folder—or drag it onto the list.

## Use

1. In Billy, choose **Profiles → Export Invoices… → Plugins → DATEV**.
2. Pick **Full List** or **Filtered List**.
3. Enter the target Beraternummer and Mandantennummer and confirm the Sammeldebitor (default `10000`). Billy remembers these values per plugin and profile.
4. Save each yearly CSV as prompted (`EXTF_Buchungsstapel_2025.csv`, `EXTF_Buchungsstapel_2026.csv`, etc.). Cancelling stops the remaining save dialogs; files already saved remain.

Import each file into its corresponding DATEV year. Only calendar-aligned fiscal years (January 1–December 31) are supported. All customers use the configured collective debtor account; individual customer accounts are not assigned automatically.

## Export Format

The file uses UTF-8 with a BOM (`EF BB BF`) and is a semicolon-separated CSV with `\r\n` line endings:

| Line | Content |
| ---- | ------- |
| 1 | EXTF metadata (format `700`, category `21`, Buchungsstapel v13, period, currency, …) |
| 2 | Fixed DATEV column headers (125 columns) |
| 3+ | Booking rows |

Important fields per booking row:

| Field | Example | Notes |
| ----- | ------- | ----- |
| Umsatz | `120,00` | Gross amount, German decimal comma, always positive |
| Soll/Haben | `"S"` / `"H"` | S = invoice, H = cancellation |
| Konto | `10000` | Configurable collective debtor (Personenkonto) |
| Gegenkonto | `8400` | SKR03 Erlöskonto for the VAT rate |
| Belegdatum | `1305` | Invoice date as `DDMM` |
| Belegfeld 1 | `"2026-001"` | Invoice number |
| Buchungstext | `"Simon Lou"` | Customer name |
| Leistungsdatum | `12052026` | Service start date as `DDMMYYYY` |

Berater- and Mandantennummer are required and validated before export. Text is CSV-escaped. The plugin prepends `\uFEFF` to each file so DATEV can identify the UTF-8 encoding; Unicode characters are preserved.

## Building / Contributing

This folder is a worked example for the Billy [plugin specification](https://usebilly.app/support/plugin-spec). See [`main.js`](./main.js) and [`helpers.js`](./helpers.js) for the implementation.
