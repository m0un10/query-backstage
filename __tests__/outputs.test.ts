import { jest } from '@jest/globals'
import * as core from '../__fixtures__/core.js'

jest.unstable_mockModule('@actions/core', () => core)

const { setActionOutputs } = await import('../src/outputs.js')
import type { ActionInputs, BackstageEntity } from '../src/types.js'

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

describe('setActionOutputs', () => {
  afterEach(() => {
    jest.resetAllMocks()
  })

  it('sets count to 0 for empty entities', () => {
    setActionOutputs([], makeInputs())
    expect(core.setOutput).toHaveBeenCalledWith('count', '0')
    expect(core.setOutput).toHaveBeenCalledWith('has_results', 'false')
    expect(core.setOutput).toHaveBeenCalledWith('first_entity_json', '')
  })

  it('sets compound entity ref format', () => {
    const entities: BackstageEntity[] = [
      {
        kind: 'Component',
        metadata: { name: 'my-service', namespace: 'default' }
      }
    ]
    setActionOutputs(entities, makeInputs({ entityRefFormat: 'compound' }))
    expect(core.setOutput).toHaveBeenCalledWith(
      'entity_refs_json',
      JSON.stringify(['component:default/my-service'])
    )
  })

  it('sets triplet entity ref format', () => {
    const entities: BackstageEntity[] = [
      {
        kind: 'Component',
        metadata: { name: 'my-service', namespace: 'default' }
      }
    ]
    setActionOutputs(entities, makeInputs({ entityRefFormat: 'triplet' }))
    expect(core.setOutput).toHaveBeenCalledWith(
      'entity_refs_json',
      JSON.stringify(['component/default/my-service'])
    )
  })

  it('defaults namespace to default in compound ref', () => {
    const entities: BackstageEntity[] = [
      { kind: 'API', metadata: { name: 'my-api' } }
    ]
    setActionOutputs(entities, makeInputs())
    expect(core.setOutput).toHaveBeenCalledWith(
      'entity_refs_json',
      JSON.stringify(['api:default/my-api'])
    )
  })

  it('sets has_results to true when entities present', () => {
    setActionOutputs(
      [{ kind: 'Component', metadata: { name: 'svc' } }],
      makeInputs()
    )
    expect(core.setOutput).toHaveBeenCalledWith('has_results', 'true')
  })

  it('sets first_entity_json to first entity JSON', () => {
    const entities: BackstageEntity[] = [
      { kind: 'Component', metadata: { name: 'svc1' } },
      { kind: 'Component', metadata: { name: 'svc2' } }
    ]
    setActionOutputs(entities, makeInputs())
    expect(core.setOutput).toHaveBeenCalledWith(
      'first_entity_json',
      JSON.stringify(entities[0])
    )
  })

  it('does NOT set raw_response_json when include_raw_response=false', () => {
    setActionOutputs([], makeInputs({ includeRawResponse: false }), [
      { items: [] }
    ])
    const calls = (core.setOutput as jest.Mock).mock.calls
    expect(calls.some((c) => c[0] === 'raw_response_json')).toBe(false)
  })

  it('sets raw_response_json when include_raw_response=true', () => {
    const raw = [{ items: [] }]
    setActionOutputs([], makeInputs({ includeRawResponse: true }), raw)
    expect(core.setOutput).toHaveBeenCalledWith(
      'raw_response_json',
      JSON.stringify(raw)
    )
  })

  it('sets entity_names_json', () => {
    const entities: BackstageEntity[] = [
      { metadata: { name: 'svc-a' } },
      { metadata: { name: 'svc-b' } }
    ]
    setActionOutputs(entities, makeInputs())
    expect(core.setOutput).toHaveBeenCalledWith(
      'entity_names_json',
      JSON.stringify(['svc-a', 'svc-b'])
    )
  })
})
