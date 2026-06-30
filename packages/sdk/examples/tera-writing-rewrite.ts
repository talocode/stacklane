import { Talocode } from '../src/index'

const talocode = new Talocode()

async function main() {
  const result = await talocode.tera.writing.rewrite({
    text: 'We shipped Agent Browser.',
    style: 'clear, founder-like, X post',
    tone: 'direct',
    maxLength: 280,
  })
  console.log('Rewritten:', result.result.text)
  console.log('Usage:', result.usage)
}

main().catch(console.error)
