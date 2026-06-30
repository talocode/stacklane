import { Talocode } from '../src/index'

const talocode = new Talocode()

async function main() {
  const result = await talocode.tera.coding.review({
    language: 'typescript',
    code: `
      function add(a,b){
        return a+b
      }
    `,
    focus: ['bugs', 'types'],
    strictness: 'normal',
  })
  console.log('Issues:', result.result.issues)
  console.log('Score:', result.result.score)
}

main().catch(console.error)
