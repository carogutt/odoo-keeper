# QA Guide

## Objective

Validate that Odoo Keeper correctly detects, classifies, and reports different types of failures across monitored sites.

This document defines test scenarios and expected outcomes.

---

## How to Run Tests

### Local

```bash
node test.js
```

### GitHub Actions

* Go to Actions
* Run workflow manually
* Inspect logs and outputs

---

## Test Scenarios

### 1. Healthy Site (Happy Path)

**Setup**

* Valid domain
* Valid credentials
* Odoo working normally

**Expected**

* public_check_result: ok
* login_page_result: ok
* auth_result: ok
* admin_result: ok
* action_result: ok
* final_health: ok
* No Slack alert
* Sheets log created

---

### 2. Public Domain Down (DNS Failure)

**Setup**

* Break DNS or use invalid domain

**Expected**

* error_step: PUBLIC
* error_code: DNS_NOT_RESOLVED
* final_health: blocked
* Slack alert sent
* Login not executed
* Sheets log created

---

### 3. Domain Broken but Odoo Subdomain Works

**Setup**

* Public domain misconfigured
* Odoo subdomain still accessible

**Expected**

* error_step: PUBLIC
* error_code: DOMAIN_OR_DNS_ISSUE
* final_health: warning
* SECONDARY_CHECK_OK in logs
* Slack alert sent
* Sheets log created

---

### 4. Login Failure

**Setup**

* Wrong password or email

**Expected**

* login_page_result: ok
* auth_result: failed
* error_code: LOGIN_FAILED
* final_health: login_failed
* Slack alert sent
* Sheets log created

---

### 5. Admin Not Accessible

**Setup**

* Login works but admin page fails

**Expected**

* auth_result: ok
* admin_result: failed
* final_health: warning
* Slack alert sent
* Sheets log created

---

### 6. Action Failure (Website Rendering)

**Setup**

* Admin loads but website preview fails

**Expected**

* action_result: failed
* final_health: warning
* Slack alert sent
* Sheets log created

---

### 7. Cookies Blocking Interaction

**Setup**

* Enable cookie banner

**Expected**

* Cookie banner dismissed automatically
* Flow continues successfully
* No failure triggered

---

## What to Validate in Logs

Look for:

* SECONDARY_CHECK_OK or FAILED
* AUTH_OK
* ADMIN_OK
* ACTION_OK
* Error classification messages

---

## What to Validate in Sheets

Each run should include:

* Correct site_id
* Correct final_health
* Correct error_code
* Duration populated

---

## What to Validate in Slack

When failure occurs:

* Message is sent
* Correct site name
* Correct error_step
* Correct error_code

---

## Common Failure Indicators

| Symptom                  | Likely Cause             |
| ------------------------ | ------------------------ |
| No Slack alert           | Missing webhook          |
| No Sheets log            | Google credentials issue |
| Login fails unexpectedly | Wrong credentials        |
| Misclassified DNS issue  | Incorrect odoo_subdomain |

---

## Acceptance Criteria

Odoo Keeper is considered working if:

* All scenarios above produce expected classifications
* Slack alerts are triggered correctly
* Google Sheets logs are consistent
* GitHub Actions reflects run status accurately

---

## Notes

* Tests should be run after any change to `test.js`
* Prefer testing locally before pushing to GitHub
* If something fails 3 times, re-evaluate root cause before retrying
