# Changelog

All notable changes to Odoo Keeper will be documented in this file.

---

## [v2.1] - 2026-03

### Added

* Secondary check using Odoo subdomain to improve error classification
* New error code: `DOMAIN_OR_DNS_ISSUE`
* Improved distinction between DNS failures and domain misconfiguration

### Improved

* Public failure classification logic
* Slack alerts now include more accurate error context
* Google Sheets logs reflect refined error states

---

## [v2.0] - 2026-03

### Added

* Multi-site monitoring via Google Sheets (`sites_config`)
* Sequential execution across multiple sites
* Centralized logging in Google Sheets (`sites_runs`)
* Slack alert integration
* Error classification system (ok, warning, blocked, login_failed)

### Changed

* Transition from single-site to multi-site architecture
* Refactored execution flow to support per-site isolation
* Improved logging structure and traceability

---

## [v1.0] - Initial Version

### Added

* Single-site monitoring
* Basic PUBLIC, LOGIN, AUTH, ADMIN, ACTION checks
* GitHub Actions integration
* Initial Slack alerting
* Initial Google Sheets logging

---

## Notes

* Versions are lightweight and based on functional milestones
* Future versions may include semantic versioning if complexity increases
