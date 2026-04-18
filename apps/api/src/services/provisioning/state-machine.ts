export type ProvisioningStatus = 'queued' | 'running' | 'retrying' | 'ready' | 'failed'

export function canTransition(from: ProvisioningStatus, to: ProvisioningStatus) {
  const map: Record<ProvisioningStatus, ProvisioningStatus[]> = {
    queued: ['running', 'failed'],
    running: ['ready', 'retrying', 'failed'],
    retrying: ['running', 'failed'],
    ready: ['queued'],
    failed: ['retrying']
  }
  return map[from].includes(to)
}

export function calculateRetryDelayMs(attemptNo: number) {
  const steps = [5_000, 15_000, 45_000, 120_000]
  return steps[Math.min(Math.max(attemptNo - 1, 0), steps.length - 1)]
}

export function nextRetryAt(attemptNo: number) {
  return new Date(Date.now() + calculateRetryDelayMs(attemptNo)).toISOString()
}
