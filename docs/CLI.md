# Stacklane CLI

Stacklane v0.4.0 adds local-first CLI workflows:

- `stacklane customers create`
- `stacklane customers list`
- `stacklane keys create`
- `stacklane keys list`
- `stacklane keys revoke`
- `stacklane usage record`
- `stacklane usage list`
- `stacklane usage summary`
- `stacklane assets create`
- `stacklane assets list`
- `stacklane assets get`
- `stacklane assets delete`
- `stacklane doctor`

Safety rules:

- Raw API keys are printed only once at creation.
- Key hashes are never printed.
- Config checks report `present` or `missing`, never raw env values.
