/**
 * Unit tests for the action's main functionality, src/main.ts
 */
import { jest } from '@jest/globals'
import * as core from '../__fixtures__/core.js'

jest.unstable_mockModule('@actions/core', () => core)

// Mock all modules that main.ts imports
const mockParseInputs = jest.fn()
const mockBuildAuthHeaders = jest.fn()
const mockBuildFilterSets = jest.fn()
const mockQueryBackstageCatalog = jest.fn()
const mockSetActionOutputs = jest.fn()
const mockWriteStepSummary = jest.fn()

jest.unstable_mockModule('../src/inputs.js', () => ({
  parseInputs: mockParseInputs
}))
jest.unstable_mockModule('../src/auth.js', () => ({
  buildAuthHeaders: mockBuildAuthHeaders
}))
jest.unstable_mockModule('../src/filters.js', () => ({
  buildFilterSets: mockBuildFilterSets
}))
jest.unstable_mockModule('../src/backstage-client.js', () => ({
  queryBackstageCatalog: mockQueryBackstageCatalog
}))
jest.unstable_mockModule('../src/outputs.js', () => ({
  setActionOutputs: mockSetActionOutputs,
  writeStepSummary: mockWriteStepSummary
}))

const { run } = await import('../src/main.js')

function makeInputs(
  overrides: Record<string, unknown> = {}
): Record<string, unknown> {
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
    ...overrides
  }
}

describe('main.ts', () => {
  beforeEach(() => {
    mockParseInputs.mockReturnValue(makeInputs())
    mockBuildAuthHeaders.mockResolvedValue({})
    mockBuildFilterSets.mockReturnValue([])
    mockQueryBackstageCatalog.mockResolvedValue({
      entities: [],
      rawResponses: []
    })
    mockSetActionOutputs.mockReturnValue(undefined)
    mockWriteStepSummary.mockResolvedValue(undefined)
  })

  afterEach(() => {
    jest.resetAllMocks()
  })

  it('calls all pipeline stages in order', async () => {
    await run()

    expect(mockParseInputs).toHaveBeenCalledTimes(1)
    expect(mockBuildAuthHeaders).toHaveBeenCalledTimes(1)
    expect(mockBuildFilterSets).toHaveBeenCalledTimes(1)
    expect(mockQueryBackstageCatalog).toHaveBeenCalledTimes(1)
    expect(mockSetActionOutputs).toHaveBeenCalledTimes(1)
    expect(mockWriteStepSummary).toHaveBeenCalledTimes(1)
  })

  it('calls setFailed when fail_on_empty is true and no entities returned', async () => {
    mockParseInputs.mockReturnValue(makeInputs({ failOnEmpty: true }))
    mockQueryBackstageCatalog.mockResolvedValue({
      entities: [],
      rawResponses: []
    })

    await run()

    expect(core.setFailed).toHaveBeenCalledWith('No entities matched the query')
    expect(mockSetActionOutputs).not.toHaveBeenCalled()
  })

  it('does not call setFailed when entities are returned even with fail_on_empty', async () => {
    mockParseInputs.mockReturnValue(makeInputs({ failOnEmpty: true }))
    mockQueryBackstageCatalog.mockResolvedValue({
      entities: [{ kind: 'Component', metadata: { name: 'svc' } }],
      rawResponses: []
    })

    await run()

    expect(core.setFailed).not.toHaveBeenCalled()
    expect(mockSetActionOutputs).toHaveBeenCalledTimes(1)
  })

  it('calls setFailed with error message on exception', async () => {
    mockParseInputs.mockImplementation(() => {
      throw new Error('invalid input')
    })

    await run()

    expect(core.setFailed).toHaveBeenCalledWith('invalid input')
  })
})
