import * as core from '@actions/core'
import { parseInputs } from './inputs.js'
import { buildAuthHeaders } from './auth.js'
import { buildFilterSets } from './filters.js'
import { queryBackstageCatalog } from './backstage-client.js'
import { setActionOutputs, writeStepSummary } from './outputs.js'

/**
 * The main function for the action.
 *
 * @returns Resolves when the action is complete.
 */
export async function run(): Promise<void> {
  try {
    const inputs = parseInputs()
    const authHeaders = await buildAuthHeaders(inputs)
    const filterSets = buildFilterSets(inputs)
    const { entities, rawResponses } = await queryBackstageCatalog(
      inputs,
      authHeaders,
      filterSets
    )

    if (inputs.failOnEmpty && entities.length === 0) {
      core.setFailed('No entities matched the query')
      return
    }

    setActionOutputs(entities, inputs, rawResponses)
    await writeStepSummary(entities, inputs)
  } catch (error) {
    if (error instanceof Error) core.setFailed(error.message)
  }
}
