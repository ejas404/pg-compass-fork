# Task: Support Inline SSL CA Connections

> **Status:** Implemented

Some managed PostgreSQL providers expose connection settings as environment variables where the CA certificate is delivered inline instead of as a local file path. A common shape is:

- `POSTGRES_USER`
- `POSTGRES_DB`
- `POSTGRES_HOST`
- `POSTGRES_PASSWORD`
- `POSTGRES_PORT`
- `POSTGRES_SSL_CA`

`POSTGRES_SSL_CA` may be a base64-encoded PEM certificate string. PG Compass currently supports SSL certificate/key fields as file paths selected through the desktop file picker. The main process reads those files and passes the file contents to `node-postgres`.

This task adds support for inline CA material while preserving the current file-based flow.

## Current Behavior

- The SSL CA field now has an explicit source selector: file or inline.
- File CA values are still read in the main process before constructing the `pg` config.
- Inline CA values are normalized in the main process and passed to `node-postgres` as certificate contents.
- Client certificate and client key values remain file-based.

## Desired Behavior

- Users can connect with an inline CA certificate value without first writing it to a local file.
- File-based CA, client certificate, and client key flows continue to work as they do today.
- The stored connection model makes the SSL material source explicit enough that future UI and persistence behavior is understandable.

## Implementation Notes

- `SSLConfig.caSource` distinguishes `file` from `inline`, defaulting to `file` for existing saved connections.
- Inline CA values may be pasted PEM text or base64-encoded PEM text.
- Invalid inline CA values fail before connection with a clear error that does not include the secret material.
- The connection form uses a compact File/Inline selector for CA material and keeps client certificate/key inputs unchanged.
- The File/Inline selector preserves each source's draft value while users compare or switch modes.

## Acceptance Criteria

- [x] A connection configured with a base64 `POSTGRES_SSL_CA` value produces a `pg` config whose `ssl.ca` is decoded certificate contents.
- [x] A connection configured with pasted PEM CA contents passes those contents through to `pg`.
- [x] A connection configured with a CA file path still reads the file contents in the main process.
- [x] Invalid inline CA values fail with a clear, non-secret error.
- [x] Unit tests cover file path CA, base64 inline CA, pasted PEM inline CA, and invalid inline CA handling.
- [x] Existing SSL tests continue to pass.
