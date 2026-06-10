---
name: Commission formula
description: How salary is calculated — formula, threshold logic, weighted deposits, call signature
---

## Formula
`salary = showUps × visitRate + (workedSecs/3600) × hourlyRate + weightedDeposits × poRate`

## Threshold rule — IMPORTANT
- Threshold check uses **unweighted** `totalDeposits` (NOT weightedDeposits): `totalDeposits > poThreshold`
- `visitRate = over ? perShowUpHigh : perShowUpLow`
- `poRate    = over ? perPoHigh     : perPoLow`
- Defaults: perShowUpHigh=350, perShowUpLow=200, perPoHigh=150, perPoLow=100, hourlyRate=85, poThreshold=140

## Weighted deposits
- `regularDeposits = (yookassaPaid || status === 'showed_up') && !isReferral`
- `referralDeposits = (yookassaPaid || status === 'showed_up') && isReferral`
- `weightedDeposits = regularDeposits + referralDeposits * 2` — used in formula
- `totalDeposits = regularDeposits + referralDeposits` — used ONLY for threshold check

## calcSalary call signature (DashboardPage + SalarySummary — must match)
`calcSalary(showUps, totalDeposits, weightedDeposits, workedSecs, rules)`

**Why:** Bug existed where `weightedDeposits` was used for the threshold check, causing rates to trigger too early for managers with referral deposits. Fixed to use `totalDeposits` for threshold per stated rule. Both components updated to match.

**How to apply:** Any future refactor of calcSalary must keep totalDeposits as 2nd param (for threshold) and weightedDeposits as 3rd (for formula).

## CommissionRules type (src/types.ts)
Fields: perShowUpHigh, perShowUpLow, perPoHigh, perPoLow, hourlyRate, poThreshold
Old fields (baseSalary, perBooking, perDepositCollected, perShowUp, targetBookings, bonusAmount) still exist in DB but unused.
