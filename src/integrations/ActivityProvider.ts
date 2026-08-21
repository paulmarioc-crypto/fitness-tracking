import type { CrossTrainingEntry, BodyWeightEntry } from '../types'

/**
 * Contract for a future external activity source (Google Fit, Fitbit).
 * Manual entry writes directly via db/queries.ts; a provider implementing
 * this interface would instead fetch from the external API and write rows
 * with `source` set to that provider's name, keeping ingestion separate
 * from manual entry so no rewrite is needed when a real sync is added.
 */
export interface ActivityProvider {
  readonly source: 'google_fit' | 'fitbit'
  isConnected(): Promise<boolean>
  connect(): Promise<void>
  disconnect(): Promise<void>
  /** Fetch and upsert activity + body-weight rows for the given date range. */
  syncRange(startDate: string, endDate: string): Promise<{ activities: CrossTrainingEntry[]; bodyWeight: BodyWeightEntry[] }>
}

/** No-op placeholder so the UI can show "Connect Google Fit" without a real integration yet. */
export class UnconfiguredProvider implements ActivityProvider {
  readonly source: 'google_fit' | 'fitbit'
  constructor(source: 'google_fit' | 'fitbit') {
    this.source = source
  }
  async isConnected() {
    return false
  }
  async connect(): Promise<void> {
    throw new Error(`${this.source} integration is not configured yet. Log entries manually for now.`)
  }
  async disconnect() {}
  async syncRange() {
    return { activities: [], bodyWeight: [] }
  }
}
