# Basic Node.js Example

Use the Stacklane SDK to manage projects, customers, files, and assets.

```javascript
const { createStacklaneClient } = require('@stacklane/sdk');

const client = createStacklaneClient({
  baseUrl: 'http://localhost:4321',
  accessToken: process.env.STACKLANE_ACCESS_TOKEN,
});

async function main() {
  const health = await client.health();
  console.log('Health:', health);

  const project = await client.projects.create({ name: 'My App', organizationId: 'org_xxx' });
  console.log('Project:', project);
}

main().catch(console.error);
```
