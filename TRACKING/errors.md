# Error Log
- [Fixed] Resolved TRACKING directory sync error via hard reset.
- [Pending] Signup/login error feedback: wrong password or missing user returned no UI message; fixed by surfacing server action errors and showing alert on client.
- [Pending] Landing redirect loop: localhost / -> /dashboard -> /login when session check fails; mitigated by fail-open session check in landing and proxy guard only when no session and no error; verify locally.
- [Pending] Middleware rename: migrated to proxy (`src/proxy.ts`), removing old middleware entry.

---