# Capture — business requirements

Folder: `src/features/intake/features/capture/`  ·  Top level: [REQUIREMENTS.md](../../../../../REQUIREMENTS.md)
Parent: [Intake](../../REQUIREMENTS.md)

## Purpose

Get photos and voice notes from the owner in the simplest way possible.

## Who it serves

Parent owner (often one-handed).

## Requirements

| ID | Requirement | Priority | Acceptance |
|---|---|---|---|
| INT-CAP-01 | Accept photos from phone or browser in common formats within a size limit. | Must | JPEG, PNG and HEIC under the limit upload; others get a clear message. |
| INT-CAP-02 | Show short guidance for a good photo (flat surface, items apart, good light). | Should | Guidance is visible before capture. |
| INT-CAP-03 | Work on a phone-width screen. | Must | No horizontal scrolling at 375 px. |

Status (Oct 28): built in the page, not in this folder (`src/components/PhotoIntake.tsx`): file picker with the phone camera, guidance text above it, the photo shrunk to 1600 px in the browser (that also drops its metadata), phone width checked at 375 px. JPEG, PNG, WebP and GIF are accepted; HEIC only where the browser can open it, otherwise the owner gets a clear message (INT-CAP-01 partly).

## Out of scope

- Video capture; bulk library import.

## Traceability

BR-02, BR-17.
