[![License](https://img.shields.io/github/license/Past0ri/synapse-admin.svg)](https://github.com/Past0ri/synapse-admin/blob/master/LICENSE)

# Synapse admin ui

This project is built using [react-admin](https://marmelab.com/react-admin/).
Original upstream repository: [Awesome-Technologies/synapse-admin](https://github.com/Awesome-Technologies/synapse-admin).

### Prerequisites

You need access to the following endpoints:

- `/_matrix`
- `/_synapse/admin`

See also [Synapse administration endpoints](https://element-hq.github.io/synapse/latest/reverse_proxy.html#synapse-administration-endpoints)

- run the Docker container from your local build: `docker compose build && docker compose up -d` or use the [docker-compose.yml](docker-compose.yml): `docker-compose up -d`

  > note: if you're building on an architecture other than amd64 (for example a raspberry pi), make sure to define a maximum ram for node. otherwise the build will fail.

  ```yml
  services:
    synapse-admin:
      container_name: synapse-admin
      hostname: synapse-admin
      build:
        context: https://github.com/Past0ri/synapse-admin.git
        args:
          - BUILDKIT_CONTEXT_KEEP_GIT_DIR=1
        #   - NODE_OPTIONS="--max_old_space_size=1024"
        #   - BASE_PATH="/synapse-admin"
      ports:
        - "8080:80"
      restart: unless-stopped
  ```

- browse to http://localhost:8080

### Restricting available homeserver

You can restrict the homeserver(s), so that the user can no longer define it himself.

Edit `config.json` to restrict either to a single homeserver:

```json
{
  "restrictBaseUrl": "https://your-matrixs-erver.example.com"
}
```

or to a list of homeservers:

```json
{
  "restrictBaseUrl": ["https://your-first-matrix-server.example.com", "https://your-second-matrix-server.example.com"]
}
```

The `config.json` can be injected into a Docker container using a bind mount.

```yml
services:
  synapse-admin:
    ...
    volumes:
      - ./config.json:/app/config.json:ro
    ...
```

### Local-only testing overrides

For local development, you can override `public/config.json` without committing private IPs or domains.

- copy `public/config.local.example.json` to `public/config.local.json`
- edit `public/config.local.json` with your local values (for example `restrictBaseUrl`)
- `public/config.local.json` is gitignored by default

At runtime, `config.local.json` overrides values from `config.json`.

### Serving Synapse-Admin on a different path

The path prefix where synapse-admin is served can only be changed during the build step.

If you downloaded the source code, use `npm run build -- --base=/my-prefix` to set a path prefix.

If you want to build your own Docker container, use the `BASE_PATH` argument.

We do not support directly changing the path where Synapse-Admin is served in the pre-built Docker container. Instead please use a reverse proxy if you need to move Synapse-Admin to a different base path. If you want to serve multiple applications with different paths on the same domain, you need a reverse proxy anyway.


## Development

- Use `npm run lint` to run all style and linter checks
- Use `npm test` to run all unit tests
- Use `npm run fix` to fix the coding style
