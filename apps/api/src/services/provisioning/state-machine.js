"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.canTransition = canTransition;
exports.calculateRetryDelayMs = calculateRetryDelayMs;
exports.nextRetryAt = nextRetryAt;
function canTransition(from, to) {
    const map = {
        queued: ['running', 'failed'],
        running: ['ready', 'retrying', 'failed'],
        retrying: ['running', 'failed'],
        ready: ['queued'],
        failed: ['retrying']
    };
    return map[from].includes(to);
}
function calculateRetryDelayMs(attemptNo) {
    const steps = [5_000, 15_000, 45_000, 120_000];
    return steps[Math.min(Math.max(attemptNo - 1, 0), steps.length - 1)];
}
function nextRetryAt(attemptNo) {
    return new Date(Date.now() + calculateRetryDelayMs(attemptNo)).toISOString();
}
//# sourceMappingURL=state-machine.js.map