# Data Model: Grade Entry & Student Status Dashboard

## Overview
This document defines the key entities and relationships for the Grade Entry feature.

## Entities

### `Class` (Existing or extended)
- `_id`: ObjectId
- `name`: String
- `courseCode`: String
- `semester`: String
- `lecturer`: ObjectId (ref: User)
- `profile`: Object (grading weights)

### `Student` (Existing or extended)
- `_id`: ObjectId
- `mssv`: String
- `name`: String
- `email`: String
- `classId`: ObjectId (ref: Class)
- `grades`: Object (Mapping of assessment names to scores, e.g., `{"Lab 1": 8, "Quiz 1": 9}`)
- `totalScore`: Number
- `status`: String (`"passed"`, `"failed"`, `"at-risk"`)

## Validation Rules
- `grades` values must be between 0 and 10.
- `totalScore` is calculated based on class grading profile.
- `status` is determined based on `totalScore` relative to pass threshold.
