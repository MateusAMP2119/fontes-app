# Fontes API integration

`services/api` is a Git submodule pointing to an exact commit of
https://github.com/MateusAMP2119/fontes-api. `npm run setup:api` fetches that commit
and installs its dependencies; `npm run dev` starts Vite and the API together.
The frontend continues using Better Auth’s browser client on `location.origin`.

Production routes remain `/api/auth/*` and `/api/projects*` on
`builder.fonteslabs.com`, served by the `fontes-api` Worker. D1 is named
`fontes-app` and bound as `APP_DB`. Deploy the API before the frontend. Publishing
or updating the submodule does not deploy the Worker; its README describes secrets,
Google callbacks, email configuration and deployment commands. Development also executes the Worker
in Cloudflare, using the configured remote D1 database. No schema initialization is run.

To adopt a reviewed API update, check out that commit in `services/api`, run
`npm run check:api` and the app checks, then commit the updated Git submodule pointer.

The earlier Rust prototype and private database backups remain in this checkout’s
ignored `.wrangler/` directory for recovery. They are not part of either repository.

The API uses model and controller classes under `worker/`, minified Worker
builds, and combined/batched D1 queries. Its HTTP routes remain unchanged.
