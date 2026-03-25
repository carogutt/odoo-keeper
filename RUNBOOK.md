# Runbook

## Objective

Provide clear, actionable steps to diagnose and resolve issues detected by Odoo Keeper.

This document is used when a failure alert is triggered.

---

## How to Use

When an alert is received:

1. Identify:

   * site_name
   * error_step
   * error_code

2. Go to Google Sheets (`sites_runs`) for full context

3. Follow the corresponding section below

---

## Error Scenarios

---

### 1. DNS_NOT_RESOLVED

**Meaning**

* Public domain is not reachable
* Odoo subdomain is also unreachable

**Likely Causes**

* DNS misconfiguration
* Domain expired
* Hosting issue
* Network-level failure

**Actions**

1. Check domain in browser
2. Verify DNS in provider (e.g. GoDaddy)
3. Confirm domain is active (not expired)
4. Test DNS resolution:

   * `nslookup`
   * online DNS tools
5. Check Odoo status

---

### 2. DOMAIN_OR_DNS_ISSUE

**Meaning**

* Public domain fails
* Odoo subdomain is reachable

**Likely Causes**

* Domain not pointing to Odoo
* Broken DNS record (A/CNAME)
* SSL misconfiguration
* Propagation issues

**Actions**

1. Open Odoo subdomain (should work)
2. Check domain DNS records
3. Verify domain connection inside Odoo
4. Reconnect domain if needed
5. Wait for propagation if recently changed

---

### 3. LOGIN_FAILED

**Meaning**

* Login page loads
* Authentication failed

**Likely Causes**

* Wrong credentials
* Account locked
* Password changed
* Odoo authentication issue

**Actions**

1. Test login manually
2. Verify credentials in GitHub Secrets
3. Reset password if needed
4. Check if account is locked
5. Confirm correct database is being used

---

### 4. ADMIN ACCESS FAILURE

**Meaning**

* Login succeeded
* Admin panel not accessible

**Likely Causes**

* UI changes
* Permission issues
* Odoo backend issues

**Actions**

1. Login manually
2. Navigate to admin
3. Check user permissions
4. Inspect UI changes
5. Update selectors if needed

---

### 5. ACTION FAILURE

**Meaning**

* Admin loads
* Website rendering fails

**Likely Causes**

* Website module issues
* Theme problems
* Routing issues

**Actions**

1. Open website manually
2. Check frontend errors
3. Inspect logs in Odoo
4. Verify website module is active

---

### 6. GENERIC_ERROR

**Meaning**

* Unexpected failure not clearly classified

**Likely Causes**

* Script error
* Timeout
* UI change
* External dependency issue

**Actions**

1. Check GitHub Actions logs
2. Identify failing step
3. Re-run test locally
4. Inspect recent changes
5. Add logging if needed

---

## Supporting Checks

### Slack

* Confirm alert was sent
* Verify message content

### Google Sheets

* Confirm log entry exists
* Validate fields:

  * final_health
  * error_code
  * error_step

### GitHub Actions

* Check run status
* Inspect full logs

---

## Escalation Guidelines

* If issue persists after 3 attempts:

  * Stop retrying blindly
  * Investigate root cause
  * Check recent changes (DNS, Odoo, credentials)

---

## Preventive Practices

* Keep credentials updated
* Monitor domain expiration dates
* Avoid frequent manual DNS changes
* Review logs periodically

---

## Summary

* Identify the error
* Understand the classification
* Follow the corresponding action steps
* Validate resolution via re-run

Odoo Keeper provides the signal.
This runbook provides the response.
