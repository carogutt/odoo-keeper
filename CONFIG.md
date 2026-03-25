# Configuration Guide

## Overview

Odoo Keeper is configured using:

1. Google Sheets (site definitions)
2. GitHub Secrets (credentials and integrations)

---

## 1. Google Sheets Configuration

### Sheet: `sites_config`

Each row represents one site.

### Required Columns

| Column         | Description                                                      |
| -------------- | ---------------------------------------------------------------- |
| site_id        | Unique identifier for the site                                   |
| site_name      | Human-readable name                                              |
| public_url     | Public website URL (e.g. https://www.example.com)                |
| login_url      | Odoo login URL (e.g. https://example.odoo.com/web/login)         |
| odoo_subdomain | Odoo subdomain URL (e.g. https://example.odoo.com)               |
| login_email    | Login email                                                      |
| secret_ref     | Reference used to resolve credentials from environment variables |
| is_active      | TRUE/FALSE flag to include/exclude site                          |

---

### Example Row

| site_id | site_name | public_url | login_url | Odoo_subdomain | login_email | secret_ref | is_active |
| ------- | --------- | ---------- | --------- | -------------- | ----------| ------------ | --------- |
| webproject | WebProject | https://www.webproject.com | https://webproject.odoo.com/web/login | https://webproject.odoo.com | [admin@example.com](mailto:admin@example.com) | WEBPROJECT | TRUE |

---

## 2. Google Sheets - Logging Sheet

### Sheet: `sites_runs`

This sheet stores execution logs.

### Key Fields

* run_id
* run_at
* site_id
* site_name
* public_check_result
* login_page_result
* auth_result
* admin_result
* action_result
* final_health
* final_state
* error_step
* error_code
* error_message
* duration_seconds

---

## 3. GitHub Secrets

All sensitive values must be stored in GitHub Secrets.

### Required Secrets

#### Odoo Credentials

Format:

```
ODOO_<SECRET_REF>_EMAIL
ODOO_<SECRET_REF>_PASSWORD
```

Example:

```
ODOO_WEBPROJECT_EMAIL
ODOO_WEBPROJECT_PASSWORD
```

---

#### Google Sheets

```
GOOGLE_SERVICE_ACCOUNT_EMAIL
GOOGLE_PRIVATE_KEY
GOOGLE_SHEET_ID
```

---

#### Slack

```
SLACK_WEBHOOK_URL
```

---

## 4. Local Environment (.env)

For local testing, create a `.env` file with the same variables:

```env
ODOO_WEBPROJECT_EMAIL=...
ODOO_WEBPROJECT_PASSWORD=...

GOOGLE_SERVICE_ACCOUNT_EMAIL=...
GOOGLE_PRIVATE_KEY=...

GOOGLE_SHEET_ID=...
SLACK_WEBHOOK_URL=...
```

---

## 5. Activation Logic

Only rows with:

```
is_active = TRUE
```

will be processed.

---

## 6. URL Requirements

### public_url

* Must include protocol (https://)
* Should resolve publicly

### login_url

* Must point to Odoo login page

### odoo_subdomain

* Must be a valid Odoo subdomain URL
* Used for secondary validation when public domain fails

---

## 7. Common Setup Errors

### Missing Secret

* Symptoms: login fails
* Fix: verify GitHub Secrets

### Invalid Google Key

* Symptoms: Sheets logging fails
* Fix: check formatting of private key

### Wrong Subdomain

* Symptoms: misclassification of errors
* Fix: verify `odoo_subdomain`

### Disabled Site

* Symptoms: site not processed
* Fix: set `is_active = TRUE`

---

## Summary

* Google Sheets defines *what* to monitor
* GitHub Secrets define *how* to access it
* The script executes checks and logs results
