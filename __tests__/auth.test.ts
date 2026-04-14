import { jest } from '@jest/globals'
import * as core from '../__fixtures__/core.js'

jest.unstable_mockModule('@actions/core', () => core)

const { buildAuthHeaders } = await import('../src/auth.js')
import type { ActionInputs } from '../src/types.js'

function makeInputs(overrides: Partial<ActionInputs> = {}): ActionInputs {
  return {
    backstageBaseUrl: 'https://backstage.example.com',
    catalogPath: '/api/catalog',
    pageLimit: 500,
    maxEntities: undefined,
    failOnEmpty: false,
    includeRawResponse: false,
    debugRequest: false,
    kind: [],
    namespace: [],
    tags: [],
    name: [],
    owner: [],
    system: [],
    type: [],
    lifecycle: [],
    filter: '',
    fields: [],
    orderField: undefined,
    orderDirection: undefined,
    fullText: undefined,
    entityRefFormat: 'compound',
    authMode: 'none',
    token: undefined,
    tokenEnvVar: undefined,
    customAuthHeaderName: 'Authorization',
    customAuthHeaderValue: undefined,
    oauthTokenUrl: undefined,
    oauthClientId: undefined,
    oauthClientSecret: undefined,
    oauthScope: undefined,
    oauthAudience: undefined,
    oauthResource: undefined,
    timeoutMs: 30000,
    ...overrides
  }
}

describe('buildAuthHeaders', () => {
  afterEach(() => {
    jest.resetAllMocks()
    delete process.env['TEST_TOKEN']
  })

  it('returns empty headers for auth_mode=none', async () => {
    const result = await buildAuthHeaders(makeInputs({ authMode: 'none' }))
    expect(result).toEqual({})
  })

  it('returns Bearer header for auth_mode=bearer_token with direct token', async () => {
    const result = await buildAuthHeaders(
      makeInputs({ authMode: 'bearer_token', token: 'my-secret-token' })
    )
    expect(result).toEqual({ Authorization: 'Bearer my-secret-token' })
  })

  it('returns Bearer header for auth_mode=bearer_token with token_env_var', async () => {
    process.env['TEST_TOKEN'] = 'env-token-value'
    const result = await buildAuthHeaders(
      makeInputs({ authMode: 'bearer_token', tokenEnvVar: 'TEST_TOKEN' })
    )
    expect(result).toEqual({ Authorization: 'Bearer env-token-value' })
  })

  it('throws when bearer_token mode has no token', async () => {
    await expect(
      buildAuthHeaders(makeInputs({ authMode: 'bearer_token' }))
    ).rejects.toThrow(/no token was provided/i)
  })

  it('returns custom header for auth_mode=custom_header', async () => {
    const result = await buildAuthHeaders(
      makeInputs({
        authMode: 'custom_header',
        customAuthHeaderName: 'X-API-Key',
        customAuthHeaderValue: 'api-key-123'
      })
    )
    expect(result).toEqual({ 'X-API-Key': 'api-key-123' })
  })

  it('throws for custom_header mode with missing value', async () => {
    await expect(
      buildAuthHeaders(makeInputs({ authMode: 'custom_header' }))
    ).rejects.toThrow(/custom_auth_header_value is not set/i)
  })

  it('returns Bearer header for oauth2_client_credentials', async () => {
    const mockFetch = jest.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify({ access_token: 'oauth-token-123' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      })
    )
    const globalFetch = global.fetch
    global.fetch = mockFetch as typeof fetch

    try {
      const result = await buildAuthHeaders(
        makeInputs({
          authMode: 'oauth2_client_credentials',
          oauthTokenUrl: 'https://auth.example.com/token',
          oauthClientId: 'client-id',
          oauthClientSecret: 'client-secret'
        })
      )
      expect(result).toEqual({ Authorization: 'Bearer oauth-token-123' })
    } finally {
      global.fetch = globalFetch
    }
  })

  it('throws for oauth2 mode missing token url', async () => {
    await expect(
      buildAuthHeaders(
        makeInputs({
          authMode: 'oauth2_client_credentials',
          oauthClientId: 'id',
          oauthClientSecret: 'secret'
        })
      )
    ).rejects.toThrow(/oauth_token_url is not set/i)
  })
})
