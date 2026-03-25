# Product Requirements Document (PRD)

## Product Name

Odoo Keeper

---

## Objective

Ensure Odoo-based websites remain accessible and operational by continuously monitoring critical user flows and reporting failures in real time.

---

## Problem

Standard monitoring tools only check if a website responds.

In Odoo environments, this is insufficient. A site can:

* Respond but fail authentication
* Load but not allow admin access
* Be unreachable via public domain while still running internally
* Appear active while the database is sleeping or blocked

These issues impact real usability but are not detected by traditional uptime checks.

---

## Solution

Odoo Keeper performs structured, multi-step validation of each site:

1. PUBLIC - Website availability
2. LOGIN - Access to login page
3. AUTH - Authentication success
4. ADMIN - Admin panel accessibility
5. ACTION - Website rendering validation

Each step is validated and classified.

Failures are:

* Detected
* Classified
* Logged
* Reported

---

## Inputs

### Primary Input

Google Sheets (`sites_config`)

Defines:

* Sites to monitor
* URLs
* Credentials references
* Activation flags

### Secondary Inputs

* GitHub Secrets (credentials)
* Slack webhook
* Google Service Account

---

## Outputs

### Slack Alerts

Triggered on failures:

* Site name
* Error step
* Error classification
* Timestamp

### Google Sheets Logs (`sites_runs`)

Stores:

* Step-level results
* Final classification
* Execution metadata

### GitHub Actions Status

* Success (all sites OK)
* Failure (at least one site failed)

---

## Core Features

* Multi-site monitoring
* Sequential execution (one site at a time)
* Deep validation beyond uptime
* Error classification system
* Slack alerting
* Persistent logging
* GitHub Actions integration

---

## Error Classification Model

| Category     | Description                         |
| ------------ | ----------------------------------- |
| ok           | All checks passed                   |
| warning      | Partial failure or degraded state   |
| blocked      | Critical failure (site unreachable) |
| login_failed | Authentication issue                |

---

## Key Scenarios Covered

* Domain unreachable (DNS failure)
* Domain misconfiguration (Odoo subdomain reachable)
* Login failure
* Admin access failure
* Website rendering failure

---

## Out of Scope (Current Version)

* Performance monitoring
* Automatic recovery actions
* Advanced analytics dashboards
* Parallel execution
* Multi-tenant isolation beyond simple configuration

---

## Constraints

* Sequential execution (no parallelism)
* Hardcoded credential mapping via environment variables
* Dependency on Google Sheets for configuration and logging
* Dependency on Slack for alerting

---

## Success Criteria

The system is considered successful if:

* All configured sites are processed
* Failures are correctly classified
* Slack alerts are triggered for failures
* Logs are correctly written to Google Sheets
* GitHub Actions reflects accurate run status

---

## Risks

### False Positives

* DNS vs domain misconfiguration confusion

### Credential Drift

* Secrets not updated or mismatched

### UI Changes (Odoo)

* Selectors may break login or admin checks

### External Dependencies

* Google Sheets downtime
* Slack webhook issues

---

## Mitigations

* Secondary check using Odoo subdomain
* Clear error classification
* Logging for traceability
* Retry-safe execution (continue per site)

---

## Roadmap (Suggested)

### Phase 1 (Current)

* Multi-site monitoring
* Error classification
* Slack + Sheets integration

### Phase 2 (ETA may not be defined)

* Better DB state detection (sleeping vs blocked)
* Improved credential abstraction

### Phase 3  (ETA may not be defined)  

* Parallel execution
* Alert deduplication
* Dashboard / analytics

---

## Summary

Odoo Keeper ensures that monitored sites are not only online, but fully functional.

It provides actionable visibility into real-world failure scenarios that traditional monitoring tools miss.
