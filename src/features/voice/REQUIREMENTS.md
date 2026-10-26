# Voice — business requirements

Folder: `src/features/voice/`  ·  Top level: [REQUIREMENTS.md](../../../REQUIREMENTS.md)
Parent: [Source](../../REQUIREMENTS.md)

## Purpose

Let busy parents use the platform by speaking.

## Who it serves

Parent owner.

## Requirements

| ID | Requirement | Priority | Acceptance |
|---|---|---|---|
| VOI-01 | Accept spoken input for onboarding, listing and answering cards. | Must | Each flow works by voice. |
| VOI-02 | Always show the transcript for confirmation before acting. | Must | No action happens on an unconfirmed transcript. |
| VOI-03 | Offer spoken replies and a short digest. | Could | Digest plays in under 30 seconds. |

## Out of scope

- Phone calls; wake words.

## Traceability

BR-17.

## Sub-features

- [Speak](features/speak/REQUIREMENTS.md)
- [Transcribe](features/transcribe/REQUIREMENTS.md)
- [Voice UI](features/voice-ui/REQUIREMENTS.md)
