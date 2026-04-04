import * as core from '@actions/core'
import type { ActionInputs, BackstageEntity } from './types.js'

/**
 * Formats an entity reference based on the configured format.
 * - compound: `kind:namespace/name` (kind lowercased, namespace defaults to 'default')
 * - triplet: `kind/namespace/name`
 */
function formatEntityRef(entity: BackstageEntity, format: string): string {
  const kind = (entity.kind ?? 'unknown').toLowerCase()
  const namespace = entity.metadata?.namespace ?? 'default'
  const name = entity.metadata?.name ?? 'unknown'

  if (format === 'triplet') {
    return `${kind}/${namespace}/${name}`
  }
  return `${kind}:${namespace}/${name}`
}

/**
 * Sets all GitHub Actions outputs based on the queried entities.
 */
export function setActionOutputs(
  entities: BackstageEntity[],
  inputs: ActionInputs,
  rawResponses?: unknown[]
): void {
  const count = entities.length
  const entityRefs = entities.map((e) =>
    formatEntityRef(e, inputs.entityRefFormat)
  )
  const entityNames = entities.map((e) => e.metadata?.name ?? '')

  core.setOutput('count', String(count))
  core.setOutput('entities_json', JSON.stringify(entities))
  core.setOutput('entity_refs_json', JSON.stringify(entityRefs))
  core.setOutput('entity_names_json', JSON.stringify(entityNames))
  core.setOutput(
    'first_entity_json',
    count > 0 ? JSON.stringify(entities[0]) : ''
  )
  core.setOutput('has_results', count > 0 ? 'true' : 'false')

  if (inputs.includeRawResponse && rawResponses !== undefined) {
    core.setOutput('raw_response_json', JSON.stringify(rawResponses))
  }
}

/**
 * Writes a step summary to the GitHub Actions summary with entity counts and refs.
 */
export async function writeStepSummary(
  entities: BackstageEntity[],
  inputs: ActionInputs
): Promise<void> {
  const count = entities.length
  const previewCount = Math.min(count, 10)
  const entityRefs = entities
    .slice(0, previewCount)
    .map((e) => formatEntityRef(e, inputs.entityRefFormat))

  await core.summary
    .addHeading('Backstage Catalog Query Results', 2)
    .addRaw(`<p>Total entities found: <strong>${count}</strong></p>`)
    .addRaw(
      previewCount > 0
        ? `<p>First ${previewCount} entity refs:</p><ul>${entityRefs.map((r) => `<li>${r}</li>`).join('')}</ul>`
        : '<p>No entities matched the query.</p>'
    )
    .addRaw(
      count > 10 ? `<p><em>Showing first 10 of ${count} entities.</em></p>` : ''
    )
    .addRaw(
      inputs.maxEntities !== undefined && count >= inputs.maxEntities
        ? `<p><em>Results truncated by max_entities limit of ${inputs.maxEntities}.</em></p>`
        : ''
    )
    .write()
}
