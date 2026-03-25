# Architecture

## Overview

Odoo Keeper is a lightweight monitoring system that executes a sequence of validation steps for multiple Odoo-based websites.

It is designed as a simple, modular flow that prioritizes reliability, observability, and ease of extension.

---

## High-Level Architecture

```
Google Sheets (sites_config)
        ↓
Load active sites
        ↓
For each site (sequential loop)
        ↓
Playwright execution (test.js)
        ↓
Step-by-step validation:
  PUBLIC → LOGIN → AUTH → ADMIN → ACTION
        ↓
Error classification
        ↓
Outputs:
  - Slack (alerts)
  - Google Sheets (logs)
  - GitHub Actions (status)
```

---

## Core Components

### 1. test.js (Execution Engine)

Main script responsible for:

* Loading configuration from Google Sheets
* Iterating through active sites
* Running Playwright checks
* Classifying errors
* Sending outputs (Slack + Sheets)
* Controlling execution flow

---

### 2. Google Sheets

#### sites_config

Defines:

* Sites to monitor
* URLs
* Credentials references
* Activation flags

#### sites_runs

Stores:

* Execution logs
* Step results
* Final classifications

---

### 3. Playwright

Used to simulate real user interactions:

* Navigate to URLs
* Handle cookies
* Perform login
* Access admin
* Trigger website rendering

---

### 4. GitHub Actions

Execution environment:

* Runs on schedule or manually
* Injects secrets
* Executes `node test.js`
* Determines final run status

---

### 5. Slack

Notification layer:

* Receives alerts for failures
* Provides real-time visibility

---

## Execution Flow (Per Site)

### Step 1 - PUBLIC

* Navigate to `public_url`
* Detect:

  * DNS issues
  * Timeouts
  * unreachable domains

If fails:

* Perform secondary check using `odoo_subdomain`
* Classify:

  * DNS_NOT_RESOLVED
  * DOMAIN_OR_DNS_ISSUE

---

### Step 2 - LOGIN

* Navigate to `login_url`
* Validate page loads correctly

---

### Step 3 - AUTH

* Submit credentials
* Validate successful authentication

---

### Step 4 - ADMIN

* Confirm admin panel access
* Validate expected elements

---

### Step 5 - ACTION

* Trigger website rendering (frontend)
* Validate response

---

## Error Handling Strategy

* Each site is processed independently
* Failures do not stop execution of other sites
* Errors are captured and classified per step
* `process.exitCode = 1` is set if any site fails

---

## Error Classification Logic

### PUBLIC Failures

* If public fails AND subdomain fails:
  → DNS_NOT_RESOLVED (blocked)

* If public fails BUT subdomain works:
  → DOMAIN_OR_DNS_ISSUE (warning)

---

### Other Failures

* LOGIN / AUTH:
  → LOGIN_FAILED

* ADMIN / ACTION:
  → GENERIC_ERROR (warning)

---

## Data Flow

### Input

* Google Sheets (sites_config)
* GitHub Secrets

### Processing

* test.js executes validation logic

### Output

* Slack (alerts)
* Google Sheets (logs)
* GitHub Actions (status)

---

## Design Decisions

### Sequential Execution

* Simpler and more predictable
* Avoids concurrency issues
* Easier debugging

---

### External Configuration (Google Sheets)

* Non-technical control of monitored sites
* Easy updates without code changes

---

### Explicit Step Validation

* Clear visibility into where failures occur
* Enables precise classification

---

### Lightweight Architecture

* No backend server
* No database required
* Runs entirely via script + external services

---

## Limitations

* No parallel execution
* Hardcoded credential resolution
* Relies on UI selectors (fragile to UI changes)
* No retry mechanism
* No alert deduplication

---

## Scalability Considerations

Current system is suitable for:

* Small to medium number of sites

Potential future improvements:

* Parallel execution
* Modular step handlers
* Retry strategies
* Queue-based processing

---

## Summary

Odoo Keeper is designed as a simple but effective monitoring pipeline.

It prioritizes:

* Real-world validation (not just uptime)
* Clear error classification
* Minimal infrastructure
* Easy extensibility
