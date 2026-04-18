import { createHash } from 'node:crypto'
import type { ProvisioningAdapter, ProvisioningAdapterInput, ProvisioningAdapterResult } from './adapter'

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export class MockProvisioningAdapter implements ProvisioningAdapter {
  name = 'mock-local-adapter'

  async provisionProject(input: ProvisioningAdapterInput): Promise<ProvisioningAdapterResult> {
    await sleep(350)

    const deterministic = createHash('sha1').update(`${input.projectSlug}:${input.regionCode}`).digest('hex')
    const shouldFail = deterministic.endsWith('0') || deterministic.endsWith('f')

    if (shouldFail) {
      throw new Error('Mock adapter simulated dependency timeout while allocating storage namespace.')
    }

    return {
      databaseRef: `db://${input.regionCode}/${input.projectSlug}`,
      storageRef: `s3://${input.regionCode}/${input.projectSlug}`,
      authNamespaceRef: `auth://${input.projectSlug}`,
      functionsNamespaceRef: `fn://${input.projectSlug}`,
      diagnostics: {
        adapter: this.name,
        mode: 'simulated',
        region: input.regionCode
      }
    }
  }
}
