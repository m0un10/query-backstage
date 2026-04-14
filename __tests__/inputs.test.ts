import { jest } from '@jest/globals'
import * as core from '../__fixtures__/core.js'

jest.unstable_mockModule('@actions/core', () => core)

const { parseInputs } = await import('../src/inputs.js')
const { parseCommaList } = await import('../src/inputs.js')

describe('parseCommaList', () => {
  it('returns empty array for empty string', () => {
    expect(parseCommaList('')).toEqual([])
  })

  it('trims whitespace', () => {
    expect(parseCommaList(' a , b ')).toEqual(['a', 'b'])
  })

  it('deduplicates', () => {
    expect(parseCommaList('a,b,a')).toEqual(['a', 'b'])
  })

  it('ignores empty items', () => {
    expect(parseCommaList('a,,b')).toEqual(['a', 'b'])
  })
})

describe('parseInputs', () => {
  afterEach(() => {
    jest.resetAllMocks()
  })

  function mockInput(map: Record<string, string>): void {
    core.getInput.mockImplementation((name: string) => map[name] ?? '')
  }

  it('parses required backstage_base_url and normalizes trailing slash', () => {
    mockInput({ backstage_base_url: 'https://backstage.example.com/' })
    const inputs = parseInputs()
    expect(inputs.backstageBaseUrl).toBe('https://backstage.example.com')
  })

  it('applies default values', () => {
    mockInput({ backstage_base_url: 'https://backstage.example.com' })
    const inputs = parseInputs()
    expect(inputs.catalogPath).toBe('/api/catalog')
    expect(inputs.pageLimit).toBe(500)
    expect(inputs.failOnEmpty).toBe(false)
    expect(inputs.includeRawResponse).toBe(false)
    expect(inputs.debugRequest).toBe(false)
    expect(inputs.authMode).toBe('bearer_token')
    expect(inputs.timeoutMs).toBe(30000)
    expect(inputs.customAuthHeaderName).toBe('Authorization')
    expect(inputs.entityRefFormat).toBe('compound')
  })

  it('parses boolean inputs: true', () => {
    mockInput({
      backstage_base_url: 'https://backstage.example.com',
      fail_on_empty: 'true'
    })
    expect(parseInputs().failOnEmpty).toBe(true)
  })

  it('parses boolean inputs: 1', () => {
    mockInput({
      backstage_base_url: 'https://backstage.example.com',
      fail_on_empty: '1'
    })
    expect(parseInputs().failOnEmpty).toBe(true)
  })

  it('parses boolean inputs: yes', () => {
    mockInput({
      backstage_base_url: 'https://backstage.example.com',
      fail_on_empty: 'yes'
    })
    expect(parseInputs().failOnEmpty).toBe(true)
  })

  it('parses boolean inputs: false', () => {
    mockInput({
      backstage_base_url: 'https://backstage.example.com',
      fail_on_empty: 'false'
    })
    expect(parseInputs().failOnEmpty).toBe(false)
  })

  it('parses comma-separated kind input', () => {
    mockInput({
      backstage_base_url: 'https://backstage.example.com',
      kind: 'Component, API'
    })
    expect(parseInputs().kind).toEqual(['Component', 'API'])
  })

  it('parses max_entities as int', () => {
    mockInput({
      backstage_base_url: 'https://backstage.example.com',
      max_entities: '100'
    })
    expect(parseInputs().maxEntities).toBe(100)
  })

  it('leaves max_entities undefined when not set', () => {
    mockInput({ backstage_base_url: 'https://backstage.example.com' })
    expect(parseInputs().maxEntities).toBeUndefined()
  })

  it('parses order_direction asc', () => {
    mockInput({
      backstage_base_url: 'https://backstage.example.com',
      order_direction: 'asc'
    })
    expect(parseInputs().orderDirection).toBe('asc')
  })

  it('sets order_direction undefined for invalid value', () => {
    mockInput({
      backstage_base_url: 'https://backstage.example.com',
      order_direction: 'invalid'
    })
    expect(parseInputs().orderDirection).toBeUndefined()
  })

  it('uses triplet entity_ref_format', () => {
    mockInput({
      backstage_base_url: 'https://backstage.example.com',
      entity_ref_format: 'triplet'
    })
    expect(parseInputs().entityRefFormat).toBe('triplet')
  })
})
