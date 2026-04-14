import * as core from '@actions/core'
import type {
  ActionInputs,
  AuthMode,
  EntityRefFormat,
  OrderDirection
} from './types.js'
import { parseCommaList } from './filters.js'

export { parseCommaList }

function parseBool(value: string): boolean {
  return ['true', '1', 'yes'].includes(value.toLowerCase().trim())
}

function parseOptionalInt(value: string): number | undefined {
  if (!value.trim()) return undefined
  const n = parseInt(value, 10)
  if (isNaN(n)) throw new Error(`Expected an integer but got: "${value}"`)
  return n
}

/**
 * Parses all GitHub Actions inputs for the query-backstage-catalog action.
 */
export function parseInputs(): ActionInputs {
  const backstageBaseUrl = core
    .getInput('backstage_base_url', { required: true })
    .replace(/\/$/, '')
  const catalogPath = core.getInput('catalog_path') || '/api/catalog'
  const pageLimit = parseInt(core.getInput('page_limit') || '500', 10)
  const maxEntities = parseOptionalInt(core.getInput('max_entities'))
  const failOnEmpty = parseBool(core.getInput('fail_on_empty') || 'false')
  const includeRawResponse = parseBool(
    core.getInput('include_raw_response') || 'false'
  )
  const debugRequest = parseBool(core.getInput('debug_request') || 'false')

  const kind = parseCommaList(core.getInput('kind'))
  const namespace = parseCommaList(core.getInput('namespace'))
  const tags = parseCommaList(core.getInput('tags'))
  const name = parseCommaList(core.getInput('name'))
  const owner = parseCommaList(core.getInput('owner'))
  const system = parseCommaList(core.getInput('system'))
  const type = parseCommaList(core.getInput('type'))
  const lifecycle = parseCommaList(core.getInput('lifecycle'))
  const filter = core.getInput('filter')
  const fields = parseCommaList(core.getInput('fields'))

  const orderFieldRaw = core.getInput('order_field')
  const orderField = orderFieldRaw.trim() ? orderFieldRaw.trim() : undefined

  const orderDirectionRaw = core
    .getInput('order_direction')
    .trim()
    .toLowerCase()
  let orderDirection: OrderDirection | undefined
  if (orderDirectionRaw === 'asc' || orderDirectionRaw === 'desc') {
    orderDirection = orderDirectionRaw
  }

  const fullTextRaw = core.getInput('full_text').trim()
  const fullText = fullTextRaw || undefined

  const entityRefFormatRaw = core
    .getInput('entity_ref_format')
    .trim()
    .toLowerCase()
  const entityRefFormat: EntityRefFormat =
    entityRefFormatRaw === 'triplet' ? 'triplet' : 'compound'

  const authModeRaw = core.getInput('auth_mode').trim().toLowerCase()
  const validAuthModes = [
    'none',
    'bearer_token',
    'oauth2_client_credentials',
    'custom_header'
  ]
  const authMode: AuthMode = (
    validAuthModes.includes(authModeRaw) ? authModeRaw : 'bearer_token'
  ) as AuthMode

  const tokenRaw = core.getInput('token').trim()
  const token = tokenRaw || undefined
  const tokenEnvVarRaw = core.getInput('token_env_var').trim()
  const tokenEnvVar = tokenEnvVarRaw || undefined
  const customAuthHeaderName =
    core.getInput('custom_auth_header_name').trim() || 'Authorization'
  const customAuthHeaderValueRaw = core
    .getInput('custom_auth_header_value')
    .trim()
  const customAuthHeaderValue = customAuthHeaderValueRaw || undefined
  const oauthTokenUrlRaw = core.getInput('oauth_token_url').trim()
  const oauthTokenUrl = oauthTokenUrlRaw || undefined
  const oauthClientIdRaw = core.getInput('oauth_client_id').trim()
  const oauthClientId = oauthClientIdRaw || undefined
  const oauthClientSecretRaw = core.getInput('oauth_client_secret').trim()
  const oauthClientSecret = oauthClientSecretRaw || undefined
  const oauthScopeRaw = core.getInput('oauth_scope').trim()
  const oauthScope = oauthScopeRaw || undefined
  const oauthAudienceRaw = core.getInput('oauth_audience').trim()
  const oauthAudience = oauthAudienceRaw || undefined
  const oauthResourceRaw = core.getInput('oauth_resource').trim()
  const oauthResource = oauthResourceRaw || undefined
  const timeoutMs = parseInt(core.getInput('timeout_ms') || '30000', 10)

  return {
    backstageBaseUrl,
    catalogPath,
    pageLimit,
    maxEntities,
    failOnEmpty,
    includeRawResponse,
    debugRequest,
    kind,
    namespace,
    tags,
    name,
    owner,
    system,
    type,
    lifecycle,
    filter,
    fields,
    orderField,
    orderDirection,
    fullText,
    entityRefFormat,
    authMode,
    token,
    tokenEnvVar,
    customAuthHeaderName,
    customAuthHeaderValue,
    oauthTokenUrl,
    oauthClientId,
    oauthClientSecret,
    oauthScope,
    oauthAudience,
    oauthResource,
    timeoutMs
  }
}
