import { Talocode } from '../src/index'

const talocode = new Talocode()

async function main() {
  const result = await talocode.agentBrowser.extract({
    url: 'https://en.wikipedia.org/wiki/Artificial_intelligence',
    includeImages: true,
    includeLinks: true,
  })

  console.log(`Title: ${result.title}`)
  console.log(`Description: ${result.description}`)
  console.log(`Language: ${result.language}`)
  console.log(`Word count: ${result.wordCount}`)
  console.log(`Headings: ${result.headings.length}`)
  console.log(`Links: ${result.links?.length ?? 0}`)
  console.log(`Images: ${result.images?.length ?? 0}`)
  console.log(`Text preview: ${result.textContent.slice(0, 300)}...`)
}

main().catch(console.error)
