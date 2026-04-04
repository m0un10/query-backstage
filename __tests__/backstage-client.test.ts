import { jest } from '@jest/globals'
import * as core from '../__fixtures__/core.js'

jest.unstable_mockModule('@actions/core', () => core)

const { queryBackstageCatalog } = await import('../src/backstage-client.js')
import type { ActionInputs, AuthHeaders, FilterSet } from '../src/types.js'

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

const authHeaders: AuthHeaders = {}
const filterSets: FilterSet[] = []

describe('queryBackstageCatalog', () => {
  let originalFetch: typeof global.fetch

  beforeEach(() => {
    originalFetch = global.fetch
  })

  afterEach(() => {
    global.fetch = originalFetch
    jest.resetAllMocks()
  })

  function mockFetch(responses: { status: number; body: unknown }[]): void {
    let callCount = 0
    global.fetch = jest.fn<typeof fetch>().mockImplementation(async () => {
      const r = responses[callCount] ?? responses[responses.length - 1]
      callCount++
      return new Response(JSON.stringify(r.body), {
        status: r.status,
        headers: { 'Content-Type': 'application/json' }
      })
    }) as typeof fetch
  }

  it('returns entities from a single page response', async () => {
    const entities = [{ kind: 'Component', metadata: { name: 'my-service' } }]
    mockFetch([
      { status: 200, body: { items: entities, totalItems: 1, pageInfo: {} } }
    ])

    const result = await queryBackstageCatalog(
      makeInputs(),
      authHeaders,
      filterSets
    )
    expect(result).toEqual(entities)
  })

  it('paginates using nextCursor', async () => {
    const page1 = {
      items: [{ kind: 'Component', metadata: { name: 'svc-1' } }],
      totalItems: 2,
      pageInfo: { nextCursor: 'cursor-1' }
    }
    const page2 = {
      items: [{ kind: 'Component', metadata: { name: 'svc-2' } }],
      totalItems: 2,
      pageInfo: {}
    }
    mockFetch([
      { status: 200, body: page1 },
      { status: 200, body: page2 }
    ])

    const result = await queryBackstageCatalog(
      makeInputs(),
      authHeaders,
      filterSets
    )
    expect(result).toHaveLength(2)
    expect(result[0].metadata?.name).toBe('svc-1')
    expect(result[1].metadata?.name).toBe('svc-2')
  })

  it('truncates results to max_entities', async () => {
    const entities = Array.from({ length: 10 }, (_, i) => ({
      kind: 'Component',
      metadata: { name: `svc-${i}` }
    }))
    mockFetch([
      { status: 200, body: { items: entities, totalItems: 10, pageInfo: {} } }
    ])

    const result = await queryBackstageCatalog(
      makeInputs({ maxEntities: 3 }),
      authHeaders,
      filterSets
    )
    expect(result).toHaveLength(3)
  })

  it('retries on 429 and eventually succeeds', async () => {
    const entities = [{ kind: 'Component', metadata: { name: 'svc' } }]
    mockFetch([
      { status: 429, body: {} },
      { status: 200, body: { items: entities, totalItems: 1, pageInfo: {} } }
    ])

    const result = await queryBackstageCatalog(
      makeInputs(),
      authHeaders,
      filterSets
    )
    expect(result).toEqual(entities)
  }, 15000)

  it('retries on 503 and eventually succeeds', async () => {
    const entities = [{ kind: 'Component', metadata: { name: 'svc' } }]
    mockFetch([
      { status: 503, body: {} },
      { status: 200, body: { items: entities, totalItems: 1, pageInfo: {} } }
    ])

    const result = await queryBackstageCatalog(
      makeInputs(),
      authHeaders,
      filterSets
    )
    expect(result).toEqual(entities)
  }, 15000)

  it('does not retry on 404 and throws', async () => {
    mockFetch([{ status: 404, body: { error: 'Not Found' } }])

    await expect(
      queryBackstageCatalog(makeInputs(), authHeaders, filterSets)
    ).rejects.toThrow(/404/)
  })

  it('throws on invalid JSON response', async () => {
    global.fetch = jest
      .fn<typeof fetch>()
      .mockResolvedValue(
        new Response('not-json', {
          status: 200,
          headers: { 'Content-Type': 'text/plain' }
        })
      ) as typeof fetch

    await expect(
      queryBackstageCatalog(makeInputs(), authHeaders, filterSets)
    ).rejects.toThrow(/non-JSON/)
  })

  it('throws when response missing items array', async () => {
    mockFetch([{ status: 200, body: { notItems: [] } }])

    await expect(
      queryBackstageCatalog(makeInputs(), authHeaders, filterSets)
    ).rejects.toThrow(/items/)
  })
})
