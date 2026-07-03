# Parser Fixtures

This folder stores anonymized OCR regression fixtures for Telangana electricity bills.

Each sample should include:
- `*_raw_ocr.txt`: the OCR text after anonymizing names, addresses, service numbers, and account numbers
- `*_expected.json`: the fields that must be parsed correctly

Recommended usage:
- keep 3-5 real bill shapes
- include both clean and noisy OCR
- update expected output only when parser behavior changes intentionally

Run regression tests:

```bash
python -m unittest backend.tests.test_parser_regression
```
