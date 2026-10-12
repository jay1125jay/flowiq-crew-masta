# BELTRIX always-on PAPER worker

Deploy branch `beltrix-always-on-worker` as a **persistent service**, not a cron job.
`Dockerfile` at repository root starts a Node 22 worker. No environment secrets are required.
It checks `/_api/health` for `PAPER_ONLY`, runs `/_api/cycle` every nominal 60 seconds, verifies health again, and logs failures. The Floot engine retains its database cycle cooldown and PAPER safety lock.

**Not true tick-level real-time:** Yahoo 1-minute bars and the existing engine remain unchanged.
**Important:** Only after persistent deployment is confirmed, disable the GitHub scheduled workflow to avoid duplicate triggers. Persistent hosting may incur fees.
