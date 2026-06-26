"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MockProvisioningAdapter = void 0;
const node_crypto_1 = require("node:crypto");
function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
class MockProvisioningAdapter {
    name = 'mock-local-adapter';
    async provisionProject(input) {
        await sleep(350);
        const deterministic = (0, node_crypto_1.createHash)('sha1').update(`${input.projectSlug}:${input.regionCode}`).digest('hex');
        const shouldFail = deterministic.endsWith('0') || deterministic.endsWith('f');
        if (shouldFail) {
            throw new Error('Mock adapter simulated dependency timeout while allocating storage namespace.');
        }
        return {
            databaseRef: `db://${input.regionCode}/${input.projectSlug}`,
            storageRef: `s3://${input.regionCode}/${input.projectSlug}`,
            authNamespaceRef: `auth://${input.projectSlug}`,
            functionsNamespaceRef: `fn://${input.projectSlug}`,
            diagnostics: {
                adapter: this.name,
                mode: 'simulated',
                region: input.regionCode
            }
        };
    }
}
exports.MockProvisioningAdapter = MockProvisioningAdapter;
//# sourceMappingURL=mock-adapter.js.map