import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  mockSearchResults,
  buildResearchAnswer,
  validatePublicUrl,
  getSearchLanePricing,
  getSearchLaneCapabilities,
  SEARCHLANE_VERSION,
  runSearchQuery,
  runResearch,
} from '../src/services/searchlane.js'

void describe('searchlane service', () => {
  void describe('validatePublicUrl', () => {
    void it('accepts https', () => {
      assert.equal(validatePublicUrl('https://example.com').hostname, 'example.com')
    })
    void it('rejects localhost', () => {
      assert.throws(() => validatePublicUrl('http://127.0.0.1/'), /private|localhost/i)
    })
  })

  void describe('mockSearchResults', () => {
    void it('returns scored ranked hits', () => {
      const hits = mockSearchResults('talocode api', 3)
      assert.equal(hits.length, 3)
      assert.ok(hits[0].url.startsWith('http'))
      assert.ok(hits[0].score >= 0 && hits[0].score <= 1)
      assert.equal(hits[0].position, 1)
    })
  })

  void describe('buildResearchAnswer', () => {
    void it('includes query and sources', () => {
      const hits = mockSearchResults('open source tools', 3)
      const answer = buildResearchAnswer('open source tools', hits, [])
      assert.ok(answer.includes('open source tools'))
      assert.ok(answer.includes('Key findings') || answer.includes('Summary'))
    })
  })

  void describe('pricing and capabilities', () => {
    void it('lists credits', () => {
      const p = getSearchLanePricing()
      assert.equal(p.product, 'searchlane')
      assert.equal(p.credits['searchlane.query'], 5)
      assert.equal(p.credits['searchlane.research'], 30)
      assert.equal(p.credits['searchlane.news'], 8)
    })
    void it('lists endpoints', () => {
      const c = getSearchLaneCapabilities()
      assert.ok(c.endpoints.some((e) => e.includes('/query')))
      assert.equal(c.version, SEARCHLANE_VERSION)
    })
  })

  void describe('runSearchQuery', () => {
    void it('rejects empty query', async () => {
      await assert.rejects(() => runSearchQuery(''), /query/i)
    })

    void it('returns results (network or mock)', async () => {
      const res = await runSearchQuery('javascript', { limit: 3 })
      assert.equal(res.engine, 'searchlane')
      assert.ok(res.results.length >= 1)
      assert.ok(res.provider)
      assert.ok(typeof res.durationMs === 'number')
    })
  })

  void describe('runResearch', () => {
    void it('returns answer and citations', async () => {
      const res = await runResearch('typescript', { limit: 3, fetchPages: false })
      assert.ok(res.answer.length > 20)
      assert.ok(res.citations.length >= 1)
      assert.ok(res.results.length >= 1)
    })
  })
})
