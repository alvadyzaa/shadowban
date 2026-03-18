export function replayCompactForensicResult(options: {
  username: string
  forensic: any
  sendEvent: (data: unknown) => Promise<void> | void
}): Promise<void>

export function streamForensicAudit(options: {
  username: string
  sendEvent: (data: unknown) => Promise<void> | void
  fetchDeepScan: (username: string) => Promise<any>
}): Promise<void>
