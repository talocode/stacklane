import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  parseRobotsForBot,
  analyzeCitationReadiness,
  scoreLlmsTxt,
  generateLlmsTxt,
  validatePublicUrl,
  getGeoLanePricing,
  getGeoLaneCapabilities,
  AI_CRAWLERS,
} from '../src/services/geolane.js'

void describe('geolane service', () => {
  void describe('validatePublicUrl', () => {
    void it('accepts https URLs', () => {
      const u = validatePublicUrl('https://example.com/page')
      assert.equal(u.hostname, 'example.com')
    })

    void it('rejects localhost', () => {
      assert.throws(() => validatePublicUrl('http://localhost/x'), /private|localhost/i)
    })

    void it('rejects private IPs', () => {
      assert.throws(() => validatePublicUrl('http://192.168.1.1/'), /private/i)
    })
  })

  void describe('parseRobotsForBot', () => {
    void it('allows when no matching rules', () => {
      const r = parseRobotsForBot('User-agent: *\nDisallow:', 'GPTBot')
      assert.equal(r.allowed, true)
    })

    void it('blocks Disallow: / for specific bot', () => {
      const robots = `User-agent: GPTBot\nDisallow: /\n\nUser-agent: *\nDisallow:`
      const r = parseRobotsForBot(robots, 'GPTBot')
      assert.equal(r.allowed, false)
      assert.ok(r.rule.includes('Disallow'))
    })

    void it('blocks via wildcard User-agent: *', () => {
      const robots = `User-agent: *\nDisallow: /`
      const r = parseRobotsForBot(robots, 'ClaudeBot')
      assert.equal(r.allowed, false)
    })

    void it('allows when specific bot is not blocked', () => {
      const robots = `User-agent: GPTBot\nAllow: /\n\nUser-agent: *\nDisallow: /`
      const r = parseRobotsForBot(robots, 'GPTBot')
      assert.equal(r.allowed, true)
    })
  })

  void describe('analyzeCitationReadiness', () => {
    void it('scores rich pages higher', () => {
      const rich = `<!doctype html><html lang="en"><head>
<title>Acme Platform — Product Overview and Guide</title>
<meta name="description" content="Acme helps teams ship AI agents with secure APIs, billing, and observability built in for production." />
<link rel="canonical" href="https://acme.test/product" />
<script type="application/ld+json">{"@type":"Article","author":{"@type":"Person","name":"Ada"},"datePublished":"2026-01-01"}</script>
<meta name="author" content="Ada Lovelace" />
<meta property="article:published_time" content="2026-01-01" />
</head><body>
<h1>Acme Platform Overview</h1>
${'<p>' + 'word '.repeat(150) + '</p>'.repeat(4)}
<h2>FAQ</h2>
<script type="application/ld+json">{"@type":"FAQPage"}</script>
<a href="/docs">Docs</a><a href="/pricing">Pricing</a><a href="/blog">Blog</a>
</body></html>`
      const thin = `<html><head><title>x</title></head><body>hi</body></html>`
      const richScore = analyzeCitationReadiness(rich, 'https://acme.test/product')
      const thinScore = analyzeCitationReadiness(thin, 'https://acme.test/')
      assert.ok(richScore.score > thinScore.score)
      assert.ok(richScore.score >= 60)
      assert.equal(richScore.signals.hasTitle, true)
      assert.equal(richScore.signals.hasJsonLd, true)
      assert.ok(Array.isArray(richScore.recommendations))
    })

    void it('flags missing title and description', () => {
      const r = analyzeCitationReadiness('<html><body><p>hello world</p></body></html>', 'https://x.test/')
      assert.ok(r.gaps.some((g) => /title/i.test(g)))
    })
  })

  void describe('llms.txt', () => {
    void it('scores empty as zero', () => {
      const r = scoreLlmsTxt(undefined)
      assert.equal(r.score, 0)
      assert.ok(r.issues.length > 0)
    })

    void it('scores good llms.txt higher', () => {
      const content = `# Acme
> Product for builders

https://acme.test/
https://acme.test/docs
https://acme.test/api

## Sitemap
https://acme.test/sitemap.xml

## Optional
Docs and product pages for agents.
`
      const r = scoreLlmsTxt(content)
      assert.ok(r.score >= 60)
    })

    void it('generates draft with domain and urls', () => {
      const draft = generateLlmsTxt({
        domain: 'acme.test',
        title: 'Acme',
        description: 'Ship faster',
        url: 'https://acme.test/',
        jsonLdTypes: ['Organization'],
      })
      assert.ok(draft.includes('Acme'))
      assert.ok(draft.includes('https://acme.test'))
      assert.ok(draft.includes('llms.txt') || draft.includes('Key pages'))
    })
  })

  void describe('pricing and capabilities', () => {
    void it('lists credit costs', () => {
      const p = getGeoLanePricing()
      assert.equal(p.product, 'geolane')
      assert.equal(p.credits['geolane.audit'], 40)
      assert.equal(p.credits['geolane.compare'], 50)
    })

    void it('lists crawlers and endpoints', () => {
      const c = getGeoLaneCapabilities()
      assert.ok(c.endpoints.some((e) => e.includes('/audit')))
      assert.ok(c.crawlersTracked.includes('GPTBot'))
      assert.ok(AI_CRAWLERS.length >= 10)
    })
  })
})
