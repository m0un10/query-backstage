import * as core from '@actions/core'
import type {
  ActionInputs,
  AuthHeaders,
  BackstageEntity,
  CatalogQueryResponse,
  FilterSet
} from './types.js'

const MAX_RETRIES = 3
const RETRY_DELAYS_MS = [1000, 2000, 4000]

function shouldRetry(status: number): boolean {
  return status === 429 || status >= 500
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Performs a single HTTP request with retry on 429/5xx using exponential backoff.
 */
async function fetchWithRetry(
  url: string,
  headers: Record<string, string>,
  timeoutMs: number
): Promise<Response> {
  let lastError: Error | undefined

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    if (attempt > 0) {
      const delay = RETRY_DELAYS_MS[attempt - 1]
      core.debug(
        `Retrying request (attempt ${attempt}/${MAX_RETRIES}) after ${delay}ms...`
      )
      await sleep(delay)
    }

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

    let response: Response
    try {
      response = await fetch(url, { headers, signal: controller.signal })
    } catch (err) {
      clearTimeout(timeoutId)
      const msg = err instanceof Error ? err.message : String(err)
      if (err instanceof Error && err.name === 'AbortError') {
        throw new Error(`Request timed out after ${timeoutMs}ms: ${url}`, {
          cause: err
        })
      }
      lastError = new Error(`Network error fetching ${url}: ${msg}`, {
        cause: err
      })
      if (attempt < MAX_RETRIES) continue
      throw lastError
    }
    clearTimeout(timeoutId)

    if (!shouldRetry(response.status)) {
      return response
    }

    lastError = new Error(
      `Request failed with status ${response.status} ${response.statusText}`
    )
    if (attempt < MAX_RETRIES) continue
  }

  throw lastError ?? new Error('Request failed after retries')
}

export interface CatalogQueryResult {
  entities: BackstageEntity[]
  rawResponses: unknown[]
}

/**
 * Queries the Backstage Software Catalog using cursor-based pagination.
 * Supports multiple FilterSets (OR'd), field selection, ordering, and full-text search.
 */
export async function queryBackstageCatalog(
  inputs: ActionInputs,
  authHeaders: AuthHeaders,
  filterSets: FilterSet[]
): Promise<CatalogQueryResult> {
  const baseUrl = `${inputs.backstageBaseUrl}${inputs.catalogPath}/entities/by-query`
  const allEntities: BackstageEntity[] = []
  const rawResponses: unknown[] = []

  let cursor: string | undefined
  let pageCount = 0

  do {
    const params = new URLSearchParams()

    // Add filter params - each FilterSet becomes one filter param (AND within set, OR across sets)
    for (const filterSet of filterSets) {
      const filterParts: string[] = []
      for (const [key, values] of Object.entries(filterSet)) {
        for (const value of values) {
          filterParts.push(`${key}=${value}`)
        }
      }
      if (filterParts.length > 0) {
        params.append('filter', filterParts.join(','))
      }
    }

    params.set('limit', String(inputs.pageLimit))

    if (inputs.fields.length > 0) {
      params.set('fields', inputs.fields.join(','))
    }

    if (inputs.orderField) {
      params.set('orderField', inputs.orderField)
      if (inputs.orderDirection) {
        params.set('orderDirection', inputs.orderDirection)
      }
    }

    if (inputs.fullText) {
      params.set('fullTextFilter', inputs.fullText)
    }

    if (cursor) {
      params.set('after', cursor)
    }

    const url = `${baseUrl}?${params.toString()}`

    if (inputs.debugRequest) {
      core.debug(`Backstage catalog request: GET ${url}`)
    }

    const headers: Record<string, string> = {
      Accept: 'application/json',
      ...authHeaders
    }

    const response = await fetchWithRetry(url, headers, inputs.timeoutMs)

    if (!response.ok) {
      const body = await response.text().catch(() => '')
      throw new Error(
        `Backstage catalog request failed with status ${response.status} ${response.statusText}${body ? `: ${body}` : ''}`
      )
    }

    let json: unknown
    try {
      json = await response.json()
    } catch {
      throw new Error('Backstage catalog returned a non-JSON response.')
    }

    const data = json as Record<string, unknown>
    if (!Array.isArray(data['items'])) {
      throw new Error(
        'Backstage catalog response did not contain an "items" array.'
      )
    }

    const page = json as CatalogQueryResponse
    rawResponses.push(json)

    allEntities.push(...page.items)
    pageCount++

    core.debug(
      `Page ${pageCount}: received ${page.items.length} entities (total so far: ${allEntities.length})`
    )

    cursor = page.pageInfo?.nextCursor

    if (
      inputs.maxEntities !== undefined &&
      allEntities.length >= inputs.maxEntities
    ) {
      core.debug(
        `Reached max_entities limit of ${inputs.maxEntities}. Stopping pagination.`
      )
      break
    }
  } while (cursor)

  if (
    inputs.maxEntities !== undefined &&
    allEntities.length > inputs.maxEntities
  ) {
    return { entities: allEntities.slice(0, inputs.maxEntities), rawResponses }
  }

  return { entities: allEntities, rawResponses }
}
