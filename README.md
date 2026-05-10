# query-backstage

[![CI](https://github.com/m0un10/query-backstage/actions/workflows/ci.yml/badge.svg)](https://github.com/m0un10/query-backstage/actions)

A GitHub Action that queries the [Backstage](https://backstage.io/) Software
Catalog and exposes results as workflow outputs.

> [!TIP]
> [Demo Workflow](https://github.com/m0un10/query-backstage/actions/runs/24987902181)
> 👈 highlights the power when combined with
> [Job Summary](https://github.blog/news-insights/product-news/supercharging-github-actions-with-job-summaries/)
> and
> [`matrix` strategy](https://docs.github.com/en/actions/how-tos/write-workflows/choose-what-workflows-do/run-job-variations).

## Features

- 🔍 Filter by kind, namespace, name, owner, tags, lifecycle, system, type, or
  any raw Backstage filter expression
- 📄 Cursor-based pagination — fetches all matching entities automatically
- 🔐 Flexible authentication: bearer token, OAuth2 client credentials, custom
  header, or none
- ⚡ Native `fetch` with configurable timeout and exponential-backoff retry
  (429/5xx)
- 📤 Rich outputs: entity JSON, entity refs, counts, step summary

---

## Example: render results in the Job Summary

A complete workflow that queries the
[public Backstage demo](https://demo.backstage.io) and writes a markdown report
into the run's
[Job Summary](https://docs.github.com/en/actions/how-tos/writing-workflows/choose-what-your-workflow-does/adding-a-job-summary):

```yaml
name: Backstage Catalog Report

on:
  workflow_dispatch:

permissions:
  contents: read

jobs:
  report:
    runs-on: ubuntu-latest
    steps:
      - name: Query Backstage
        id: query
        uses: m0un10/query-backstage@v1
        with:
          backstage_base_url: https://demo.backstage.io
          auth_mode: none
          kind: Component
          lifecycle: production
          max_entities: 5
          fields: metadata.name,metadata.namespace,spec.owner,spec.type

      - name: Write Job Summary
        env:
          ENTITIES_JSON: ${{ steps.query.outputs.entities_json }}
          COUNT: ${{ steps.query.outputs.count }}
          HAS_RESULTS: ${{ steps.query.outputs.has_results }}
        run: |
          {
            echo "## 📦 Backstage Catalog Report"
            echo ""
            if [ "$HAS_RESULTS" = "true" ]; then
              echo "Found **${COUNT}** production components."
              echo ""
              echo "| Name | Namespace | Owner | Type |"
              echo "|------|-----------|-------|------|"
              printf '%s' "$ENTITIES_JSON" | jq -r '
                .[] | "| `\(.metadata.name)` | `\(.metadata.namespace)` | \(.spec.owner) | \(.spec.type) |"
              '
            else
              echo "_No production components found._"
            fi
          } >> "$GITHUB_STEP_SUMMARY"
```

The Job Summary then renders as:

---

### 📦 Backstage Catalog Report

Found **5** production components.

| Name             | Namespace | Owner  | Type    |
| ---------------- | --------- | ------ | ------- |
| `petstore`       | `default` | team-a | service |
| `wayback-search` | `default` | team-b | service |
| `artist-lookup`  | `default` | team-c | service |
| `playback-order` | `default` | team-a | service |
| `searcher`       | `default` | team-b | service |

---

## Usage

### Basic: query all Components

```yaml
- uses: m0un10/query-backstage@v1
  with:
    backstage_base_url: https://backstage.example.com
    token: ${{ secrets.BACKSTAGE_TOKEN }}
    kind: Component
```

### Filter by owner and lifecycle

```yaml
- uses: m0un10/query-backstage@v1
  with:
    backstage_base_url: https://backstage.example.com
    token: ${{ secrets.BACKSTAGE_TOKEN }}
    kind: Component
    owner: team-platform
    lifecycle: production
```

### Use OAuth2 client credentials

```yaml
- uses: m0un10/query-backstage@v1
  with:
    backstage_base_url: https://backstage.example.com
    auth_mode: oauth2_client_credentials
    oauth_token_url: https://auth.example.com/oauth/token
    oauth_client_id: ${{ secrets.OAUTH_CLIENT_ID }}
    oauth_client_secret: ${{ secrets.OAUTH_CLIENT_SECRET }}
    kind: API
```

### Use raw filter expressions

```yaml
- uses: m0un10/query-backstage@v1
  with:
    backstage_base_url: https://backstage.example.com
    token: ${{ secrets.BACKSTAGE_TOKEN }}
    filter: |
      kind=Component,spec.lifecycle=production
      kind=API,spec.lifecycle=production
```

### Fail if no results

```yaml
- uses: m0un10/query-backstage@v1
  with:
    backstage_base_url: https://backstage.example.com
    token: ${{ secrets.BACKSTAGE_TOKEN }}
    kind: Component
    fail_on_empty: 'true'
```

---

## Authentication Modes

| Mode                        | Description                                                                   |
| --------------------------- | ----------------------------------------------------------------------------- |
| `bearer_token` (default)    | Pass a token via the `token` input or via an env var named by `token_env_var` |
| `oauth2_client_credentials` | Obtain a token using OAuth2 client credentials flow                           |
| `custom_header`             | Send an arbitrary HTTP header (e.g. `X-API-Key`)                              |
| `none`                      | No authentication headers sent                                                |

---

## Inputs

### Core

| Input                  | Required | Default        | Description                          |
| ---------------------- | -------- | -------------- | ------------------------------------ |
| `backstage_base_url`   | ✅       | —              | Base URL of your Backstage instance  |
| `catalog_path`         |          | `/api/catalog` | Path to the catalog API              |
| `page_limit`           |          | `500`          | Entities per page                    |
| `max_entities`         |          | —              | Maximum total entities to return     |
| `fail_on_empty`        |          | `false`        | Fail the step if no entities matched |
| `include_raw_response` |          | `false`        | Include raw API responses in output  |
| `debug_request`        |          | `false`        | Log the request URL for debugging    |

### Convenience Filters

| Input       | Catalog Field        | Description                  |
| ----------- | -------------------- | ---------------------------- |
| `kind`      | `kind`               | Comma-separated entity kinds |
| `namespace` | `metadata.namespace` | Comma-separated namespaces   |
| `tags`      | `metadata.tags`      | Comma-separated tags         |
| `name`      | `metadata.name`      | Comma-separated entity names |
| `owner`     | `spec.owner`         | Comma-separated owners       |
| `system`    | `spec.system`        | Comma-separated systems      |
| `type`      | `spec.type`          | Comma-separated types        |
| `lifecycle` | `spec.lifecycle`     | Comma-separated lifecycles   |

### Advanced

| Input               | Default    | Description                                               |
| ------------------- | ---------- | --------------------------------------------------------- |
| `filter`            | —          | Raw filter string (one filter set per line)               |
| `fields`            | —          | Comma-separated fields to include                         |
| `order_field`       | —          | Field to sort by                                          |
| `order_direction`   | —          | `asc` or `desc`                                           |
| `full_text`         | —          | Full-text search string                                   |
| `entity_ref_format` | `compound` | `compound` (`kind:ns/name`) or `triplet` (`kind/ns/name`) |

### Authentication

| Input                      | Default         | Description                              |
| -------------------------- | --------------- | ---------------------------------------- |
| `auth_mode`                | `bearer_token`  | Authentication mode                      |
| `token`                    | —               | Bearer token value                       |
| `token_env_var`            | —               | Env var name containing the bearer token |
| `custom_auth_header_name`  | `Authorization` | Header name for `custom_header` mode     |
| `custom_auth_header_value` | —               | Header value for `custom_header` mode    |
| `oauth_token_url`          | —               | OAuth2 token endpoint                    |
| `oauth_client_id`          | —               | OAuth2 client ID                         |
| `oauth_client_secret`      | —               | OAuth2 client secret                     |
| `oauth_scope`              | —               | OAuth2 scope                             |
| `oauth_audience`           | —               | OAuth2 audience                          |
| `oauth_resource`           | —               | OAuth2 resource                          |
| `timeout_ms`               | `30000`         | HTTP timeout in milliseconds             |

---

## Outputs

| Output              | Description                                              |
| ------------------- | -------------------------------------------------------- |
| `count`             | Number of entities returned                              |
| `entities_json`     | JSON array of all matched entities                       |
| `entity_refs_json`  | JSON array of entity refs                                |
| `entity_names_json` | JSON array of `metadata.name` values                     |
| `first_entity_json` | First entity JSON or empty string                        |
| `has_results`       | `'true'` if results found, `'false'` otherwise           |
| `raw_response_json` | Raw API response (only when `include_raw_response=true`) |

---

## Security

- Token values are **never** logged, even in debug mode
- Only the request URL (not headers) is logged when `debug_request=true`
- Use GitHub Secrets for all credentials

---

## Troubleshooting

### Getting a 401 Unauthorized error

- Verify your token is valid and has access to the Backstage catalog API.

### No entities returned

- Check your filter expressions for typos
- Verify the kind value matches exactly (e.g. `Component`, not `component`)
- Use `debug_request: 'true'` to inspect the full query URL

### OAuth2 token request failing

- Confirm `oauth_token_url`, `oauth_client_id`, and `oauth_client_secret` are
  all set
- Check if a `scope` or `audience` parameter is required by your IdP
