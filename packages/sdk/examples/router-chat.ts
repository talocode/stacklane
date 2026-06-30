import { Talocode } from '../src/index'

const talocode = new Talocode()

async function main() {
  const result = await talocode.router.chat({
    model: 'talocode/auto',
    messages: [{ role: 'user', content: 'Hello' }],
  })
  console.log('Response:', result.choices[0].message.content)
  console.log('Provider:', result.provider)
}

main().catch(console.error)
