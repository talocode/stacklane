import { Talocode } from '../src/index'

const talocode = new Talocode()

async function main() {
  const result = await talocode.agentBrowser.check({
    url: 'https://example.com',
    screenshot: true,
  })
  console.log('Status:', result.status)
  console.log('Checks:', result.checks)
}

main().catch(console.error)
