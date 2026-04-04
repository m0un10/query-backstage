import type * as core from '@actions/core'
import { jest } from '@jest/globals'

export const debug = jest.fn<typeof core.debug>()
export const error = jest.fn<typeof core.error>()
export const info = jest.fn<typeof core.info>()
export const getInput = jest.fn<typeof core.getInput>()
export const setOutput = jest.fn<typeof core.setOutput>()
export const setFailed = jest.fn<typeof core.setFailed>()
export const warning = jest.fn<typeof core.warning>()

const summaryInstance = {
  addHeading: jest.fn().mockReturnThis(),
  addTable: jest.fn().mockReturnThis(),
  addRaw: jest.fn().mockReturnThis(),
  addEOL: jest.fn().mockReturnThis(),
  write: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
  stringify: jest.fn().mockReturnValue('')
}

export const summary = summaryInstance as unknown as typeof core.summary
