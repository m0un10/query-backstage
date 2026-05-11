import type { ActionInputs, FilterSet } from './types.js'

/**
 * Parses a comma-separated input string into a deduplicated, trimmed array.
 * Exported for reuse across modules.
 */
export function parseCommaList(input: string): string[] {
  if (!input.trim()) return []
  const seen = new Set<string>()
  const result: string[] = []
  for (const item of input.split(',')) {
    const trimmed = item.trim()
    if (trimmed && !seen.has(trimmed)) {
      seen.add(trimmed)
      result.push(trimmed)
    }
  }
  return result
}

/** Maps convenience input names to Backstage catalog filter keys. */
const CONVENIENCE_KEY_MAP: Record<string, string> = {
  kind: 'kind',
  namespace: 'metadata.namespace',
  tags: 'metadata.tags',
  name: 'metadata.name',
  owner: 'spec.owner',
  system: 'spec.system',
  type: 'spec.type',
  lifecycle: 'spec.lifecycle'
}

/**
 * Parses a single raw filter line into a FilterSet.
 * Format: `key=value,key2=value2` (comma-separated key=value pairs).
 */
function parseRawFilterLine(line: string): FilterSet {
  const filterSet: FilterSet = {}
  for (const pair of line.split(',')) {
    const trimmed = pair.trim()
    if (!trimmed) continue
    const eqIdx = trimmed.indexOf('=')
    if (eqIdx === -1) {
      throw new Error(
        `Malformed filter entry "${trimmed}": expected format is key=value`
      )
    }
    const key = trimmed.slice(0, eqIdx).trim()
    const value = trimmed.slice(eqIdx + 1).trim()
    if (!filterSet[key]) filterSet[key] = []
    filterSet[key].push(value)
  }
  return filterSet
}

/**
 * Builds an array of FilterSet objects from action inputs.
 *
 * If raw filter lines are provided, each line becomes its own FilterSet with
 * convenience filters merged in. If no raw filter lines exist, a single
 * FilterSet is returned containing only the convenience filters (or an empty
 * array if no filters are set at all).
 */
export function buildFilterSets(inputs: ActionInputs): FilterSet[] {
  // Build convenience filter set
  const convenience: FilterSet = {}
  const convenienceInputs: Record<string, string[]> = {
    kind: inputs.kind,
    namespace: inputs.namespace,
    tags: inputs.tags,
    name: inputs.name,
    owner: inputs.owner,
    system: inputs.system,
    type: inputs.type,
    lifecycle: inputs.lifecycle
  }
  for (const [inputKey, values] of Object.entries(convenienceInputs)) {
    if (values.length > 0) {
      convenience[CONVENIENCE_KEY_MAP[inputKey]] = values
    }
  }

  // Parse raw filter lines
  const rawLines = inputs.filter
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0)

  if (rawLines.length === 0) {
    if (Object.keys(convenience).length === 0) return []
    return [convenience]
  }

  // Merge convenience filters into each raw filter set
  return rawLines.map((line) => {
    const rawSet = parseRawFilterLine(line)
    // Convenience values are added for keys not already present in raw set
    for (const [key, values] of Object.entries(convenience)) {
      if (!rawSet[key]) {
        rawSet[key] = values
      }
    }
    return rawSet
  })
}
