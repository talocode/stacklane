import { Talocode } from '../src/index'

const talocode = new Talocode()

async function main() {
  const result = await talocode.agentBrowser.analyze({
    url: 'https://news.ycombinator.com',
    analysis: ['summary', 'sentiment', 'topics', 'keywords'],
  })

  console.log(`Title: ${result.title}`)
  console.log(`Word count: ${result.wordCount}`)
  console.log(`Summary: ${result.analysis.summary}`)
  console.log(`Sentiment: ${result.analysis.sentiment}`)
  console.log(`Topics: ${result.analysis.topics?.join(', ')}`)
  console.log(`Keywords: ${result.analysis.keywords?.slice(0, 10).join(', ')}`)
  console.log(`Note: ${result.note ?? ''}`)
}

main().catch(console.error)
