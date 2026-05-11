const { buildFilterSets, parseCommaList } = await import('../src/filters.js')

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

describe('parseCommaList', () => {
  it('returns empty array for empty string', () => {
    expect(parseCommaList('')).toEqual([])
  })

  it('returns empty array for whitespace only', () => {
    expect(parseCommaList('   ')).toEqual([])
  })

  it('trims whitespace from items', () => {
    expect(parseCommaList(' a , b , c ')).toEqual(['a', 'b', 'c'])
  })

  it('deduplicates values', () => {
    expect(parseCommaList('a,b,a,c,b')).toEqual(['a', 'b', 'c'])
  })

  it('ignores empty items', () => {
    expect(parseCommaList('a,,b,')).toEqual(['a', 'b'])
  })
})

describe('buildFilterSets', () => {
  it('returns empty array for empty inputs', () => {
    expect(buildFilterSets(makeInputs())).toEqual([])
  })

  it('returns single kind filter set', () => {
    const result = buildFilterSets(makeInputs({ kind: ['Component'] }))
    expect(result).toEqual([{ kind: ['Component'] }])
  })

  it('returns multiple kind values in one filter set', () => {
    const result = buildFilterSets(makeInputs({ kind: ['Component', 'API'] }))
    expect(result).toEqual([{ kind: ['Component', 'API'] }])
  })

  it('maps kind and namespace to correct catalog keys', () => {
    const result = buildFilterSets(
      makeInputs({ kind: ['Component'], namespace: ['default'] })
    )
    expect(result).toEqual([
      { kind: ['Component'], 'metadata.namespace': ['default'] }
    ])
  })

  it('maps tags to metadata.tags', () => {
    const result = buildFilterSets(makeInputs({ tags: ['java', 'backend'] }))
    expect(result).toEqual([{ 'metadata.tags': ['java', 'backend'] }])
  })

  it('maps owner to spec.owner', () => {
    const result = buildFilterSets(makeInputs({ owner: ['team-a'] }))
    expect(result).toEqual([{ 'spec.owner': ['team-a'] }])
  })

  it('parses raw filter lines into separate filter sets', () => {
    const result = buildFilterSets(
      makeInputs({ filter: 'kind=Component\nkind=API' })
    )
    expect(result).toEqual([{ kind: ['Component'] }, { kind: ['API'] }])
  })

  it('merges convenience filters into each raw filter set', () => {
    const result = buildFilterSets(
      makeInputs({ filter: 'kind=Component', namespace: ['default'] })
    )
    expect(result).toEqual([
      { kind: ['Component'], 'metadata.namespace': ['default'] }
    ])
  })

  it('does not overwrite raw filter keys with convenience filters', () => {
    const result = buildFilterSets(
      makeInputs({
        filter: 'kind=Component,metadata.namespace=production',
        namespace: ['default']
      })
    )
    expect(result[0]['metadata.namespace']).toEqual(['production'])
  })

  it('throws on malformed raw filter entry (no =)', () => {
    expect(() =>
      buildFilterSets(makeInputs({ filter: 'kindComponent' }))
    ).toThrow(/malformed/i)
  })

  it('handles multiple values for same key in raw filter', () => {
    const result = buildFilterSets(
      makeInputs({ filter: 'kind=Component,kind=API' })
    )
    expect(result).toEqual([{ kind: ['Component', 'API'] }])
  })
})
