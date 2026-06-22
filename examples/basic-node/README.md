# Basic Node.js Example

## Usage

```javascript
const { createStacklaneClient } = require('@stacklane/sdk');

const stacklane = createStacklaneClient({
  baseUrl: 'http://localhost:4321',
  accessToken: process.env.STACKLANE_ACCESS_TOKEN,
});

async function main() {
  // Health check
  const health = await stacklane.health();
  console.log('Health:', health);

  // Create a project
  const project = await stacklane.projects.create({
    name: 'My App',
    organizationId: 'org_example',
  });
  console.log('Project:', project);

  // List projects
  const projects = await stacklane.projects.list();
  console.log('Projects:', projects);
}

main().catch(console.error);
```

## Environment

Set these in your environment:

```bash
STACKLANE_ACCESS_TOKEN=sk_lane_live_...
```
