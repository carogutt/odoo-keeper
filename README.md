# odoo-keeper
Lightweight monitoring system for Odoo websites. Validates availability, login, admin access, and domain health.

## Demo / Example Output

Example of system behavior:

- Detects domain failure
- Classifies issue (DNS vs domain misconfiguration)
- Sends Slack alert
- Logs structured result in Google Sheets

---

## Overview

Odoo Keeper is a lightweight monitoring system designed to verify the availability and operational health of Odoo-based websites.

It goes beyond simple uptime checks by validating critical user flows such as login, admin access, and frontend rendering, ensuring that the system is not only online, but actually usable.

---

## Problem

Traditional uptime monitors only verify if a URL responds.

In Odoo environments, a site can:

* Load but fail to authenticate
* Be accessible but have a broken domain configuration
* Have a running database that is unreachable via the public domain

Odoo Keeper detects these real-world failure scenarios.

---

## Solution

Odoo Keeper performs structured checks per site:

1. Public website availability (PUBLIC)
2. Login page access (LOGIN)
3. Authentication (AUTH)
4. Admin access (ADMIN)
5. Website rendering action (ACTION)

It classifies failures, logs results, and sends alerts.

---

## Key Features

* Multi-site monitoring (Google Sheets driven)
* Deep health checks (not just uptime)
* Automatic error classification
* Slack alerts for failures
* Historical logging in Google Sheets
* GitHub Actions integration (scheduled or manual runs)

---

## System Flow

```
Google Sheets (sites_config)
        ↓
Load active sites
        ↓
For each site:
  - PUBLIC check
  - LOGIN
  - AUTH
  - ADMIN
  - ACTION
        ↓
Classify result
        ↓
Send Slack alert (if needed)
        ↓
Log result in Google Sheets
        ↓
Set GitHub Actions status
```

---

## Error Classification

| Scenario                              | Error Code          | Health       |
| ------------------------------------- | ------------------- | ------------ |
| Public domain not reachable           | DNS_NOT_RESOLVED    | blocked      |
| Domain fails but Odoo subdomain works | DOMAIN_OR_DNS_ISSUE | warning      |
| Login/auth failure                    | LOGIN_FAILED        | login_failed |
| Partial failures                      | GENERIC_ERROR       | warning      |
| All checks pass                       | -                   | ok           |

---

## Outputs

### Slack

Real-time alerts for failures, including:

* Site name
* Step where failure occurred
* Error classification
* Timestamp

### Google Sheets

Each run logs:

* Site status
* Step results
* Final health
* Error details
* Execution time

### GitHub Actions

* Green: all sites OK
* Red: at least one site failed

---

## Configuration

Sites are configured via Google Sheets (`sites_config`).

Each row represents a site with fields such as:

* public_url
* login_url
* odoo_subdomain
* credentials reference
* activation flags

Secrets are managed via GitHub Actions.

---

## Running Locally

```bash
node test.js
```

Make sure `.env` is configured with:

* Odoo credentials
* Google Sheets credentials
* Slack webhook

---

## Running via GitHub Actions

The workflow runs:

* On schedule (cron)
* Manually via workflow_dispatch

---

## Current Scope

### Covered

* Availability checks
* Login validation
* Admin access
* Domain vs Odoo subdomain detection
* Multi-site execution

### Not Covered (yet)

* Performance monitoring
* Automatic recovery
* Advanced analytics

---

## Status

This project is currently in a **production-ready lightweight monitoring stage**, suitable for small to medium Odoo deployments.

---

## Posible Future Improvements

* Better classification of database states (sleeping vs unreachable)
* Credential abstraction (remove hardcoded mapping)
* Parallel execution for scalability
* Alert aggregation and deduplication

---

## License

Internal / private use (customize as needed).

