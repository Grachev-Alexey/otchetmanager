---
name: Commission formula
description: New salary calculation logic replacing the old base_salary+bonus model.
---

## Rule
salary = showUps × visitRate + (workedSecs/3600) × hourlyRate + totalBookings × poRate

Where:
- `visitRate = totalBookings > poThreshold ? perShowUpHigh : perShowUpLow`
- `poRate    = totalBookings > poThreshold ? perPoHigh     : perPoLow`
- Defaults: perShowUpHigh=350, perShowUpLow=200, perPoHigh=150, perPoLow=100, hourlyRate=85, poThreshold=140

## CommissionRules type (src/types.ts)
Fields: perShowUpHigh, perShowUpLow, perPoHigh, perPoLow, hourlyRate, poThreshold
Old fields (baseSalary, perBooking, perDepositCollected, perShowUp, targetBookings, bonusAmount) still exist in DB but are unused by the app.

**Why:** Formula changed from fixed base+bonus to variable-rate based on monthly ПО volume.

**How to apply:** totalBookings = all records in leads_reporting for that manager that month (regardless of status).
