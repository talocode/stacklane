# Security

Stacklane v0.4.1 security rules:

- API keys are SHA-256 hashed before storage.
- Raw API keys are returned only once.
- Revoked keys cannot authenticate.
- Successful authenticated requests update `lastUsedAt`.
- Metadata is sanitized to avoid storing raw secrets.
- Unsafe filenames and path traversal are rejected.
- API responses are JSON only.

v0.4.1 does not add billing, hosted provisioning, or external secret platforms.

The direct runtime test suite also verifies that these customer/key/usage/asset responses remain JSON-only and do not expose raw stored secrets.
