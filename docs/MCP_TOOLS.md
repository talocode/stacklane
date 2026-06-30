# Talocode MCP Tools Reference

## Tera Writing Rewrite

**Tool:** `tera_writing_rewrite`

**Route:** `POST /v1/tera/writing/rewrite`

**Product:** `tera` | **Action:** `writing.rewrite` | **Est. Credits:** 5

### Input Schema

```json
{
  "type": "object",
  "required": ["text"],
  "properties": {
    "text": { "type": "string", "description": "Text to rewrite" },
    "style": { "type": "string", "description": "Target style (clear, concise, etc.)" },
    "tone": { "type": "string", "description": "Target tone (formal, casual, etc.)" },
    "maxLength": { "type": "number", "description": "Maximum output length" }
  }
}
```

### Example

```json
{
  "text": "We shipped Agent Browser.",
  "style": "clear, founder-like, X post",
  "maxLength": 280
}
```

---

## Tera Writing Draft

**Tool:** `tera_writing_draft`

**Route:** `POST /v1/tera/writing/draft`

**Product:** `tera` | **Action:** `writing.draft` | **Est. Credits:** 10

### Input Schema

```json
{
  "type": "object",
  "required": ["type", "brief"],
  "properties": {
    "type": { "type": "string", "enum": ["email", "social_post", "announcement", "article", "doc", "custom"] },
    "brief": { "type": "string" },
    "audience": { "type": "string" },
    "tone": { "type": "string" },
    "maxLength": { "type": "number" },
    "points": { "type": "array", "items": { "type": "string" } }
  }
}
```

---

## Tera Coding Explain

**Tool:** `tera_coding_explain`

**Route:** `POST /v1/tera/coding/explain`

**Product:** `tera` | **Action:** `coding.explain` | **Est. Credits:** 10

### Input Schema

```json
{
  "type": "object",
  "required": ["language", "code"],
  "properties": {
    "language": { "type": "string" },
    "code": { "type": "string" },
    "level": { "type": "string", "enum": ["beginner", "intermediate", "advanced"] },
    "focus": { "type": "array", "items": { "type": "string" } }
  }
}
```

---

## Tera Coding Review

**Tool:** `tera_coding_review`

**Route:** `POST /v1/tera/coding/review`

**Product:** `tera` | **Action:** `coding.review` | **Est. Credits:** 20

### Input Schema

```json
{
  "type": "object",
  "required": ["language", "code"],
  "properties": {
    "language": { "type": "string" },
    "code": { "type": "string" },
    "focus": { "type": "array", "items": { "type": "string" } },
    "strictness": { "type": "string", "enum": ["gentle", "normal", "strict"] }
  }
}
```

---

## Router Chat

**Tool:** `router_chat`

**Route:** `POST /v1/router/chat/completions`

**Product:** `router` | **Action:** `chat.completions` | **Est. Credits:** Variable

### Input Schema

```json
{
  "type": "object",
  "required": ["model", "messages"],
  "properties": {
    "model": { "type": "string" },
    "messages": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["role", "content"],
        "properties": {
          "role": { "type": "string", "enum": ["user", "assistant", "system"] },
          "content": { "type": "string" }
        }
      }
    },
    "max_tokens": { "type": "number" },
    "temperature": { "type": "number" }
  }
}
```

### Example

```json
{
  "model": "talocode/auto",
  "messages": [{ "role": "user", "content": "Summarize this log" }]
}
```

---

## Agent Browser Check

**Tool:** `agent_browser_check`

**Route:** `POST /v1/agent-browser/check`

**Product:** `agent_browser` | **Action:** `browser.check` | **Est. Credits:** 5

### Input Schema

```json
{
  "type": "object",
  "required": ["url"],
  "properties": {
    "url": { "type": "string" },
    "screenshot": { "type": "boolean" },
    "vision": { "type": "boolean" },
    "sessionId": { "type": "string" }
  }
}
```

### Example

```json
{
  "url": "https://example.com",
  "screenshot": true
}
```

---

## Agent Browser Screenshot

**Tool:** `agent_browser_screenshot`

**Route:** `POST /v1/agent-browser/screenshot`

**Product:** `agent_browser` | **Action:** `browser.screenshot` | **Est. Credits:** 8

### Input Schema

```json
{
  "type": "object",
  "required": ["url"],
  "properties": {
    "url": { "type": "string" },
    "fullPage": { "type": "boolean" },
    "width": { "type": "number" },
    "height": { "type": "number" },
    "sessionId": { "type": "string" }
  }
}
```

---

## Agent Browser Trace Report

**Tool:** `agent_browser_trace_report`

**Route:** `POST /v1/agent-browser/trace-report`

**Product:** `agent_browser` | **Action:** `browser.trace_report` | **Est. Credits:** 15

### Input Schema

```json
{
  "type": "object",
  "required": ["url", "steps"],
  "properties": {
    "url": { "type": "string" },
    "steps": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["action"],
        "properties": {
          "action": { "type": "string" },
          "selector": { "type": "string" },
          "value": { "type": "string" }
        }
      }
    },
    "sessionId": { "type": "string" }
  }
}
```

---

## ClipLoop Brief Generate

**Tool:** `cliploop_brief_generate`  
**Route:** `POST /v1/cliploop/brief/generate`  
**Product:** `cliploop` | **Action:** `brief.generate` | **Est. Credits:** 15

---

## ClipLoop Script Generate

**Tool:** `cliploop_script_generate`  
**Route:** `POST /v1/cliploop/script/generate`  
**Product:** `cliploop` | **Action:** `script.generate` | **Est. Credits:** 15

---

## ClipLoop Video Render

**Tool:** `cliploop_video_render`  
**Route:** `POST /v1/cliploop/video/render`  
**Product:** `cliploop` | **Action:** `video.render` | **Est. Credits:** 200

---

## ClipLoop Campaign Create

**Tool:** `cliploop_campaign_create`  
**Route:** `POST /v1/cliploop/campaign/create`  
**Product:** `cliploop` | **Action:** `campaign.create` | **Est. Credits:** 50

---

## ClipLoop Campaign Package

**Tool:** `cliploop_campaign_package`  
**Route:** `POST /v1/cliploop/campaign/package`  
**Product:** `cliploop` | **Action:** `campaign.package` | **Est. Credits:** 400

---

## Cloud Pricing

**Tool:** `cloud_pricing`

**Route:** `GET /api/v1/cloud/pricing`

**Product:** `cloud` | **Action:** `pricing.list` | **Est. Credits:** 0 (free)

### Input Schema

No input parameters required.
