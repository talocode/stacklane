"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createUsageEvent = createUsageEvent;
exports.summarizeUsageEvents = summarizeUsageEvents;
function createUsageEvent(params) {
    return {
        customerId: params.customerId,
        apiKeyId: params.apiKeyId,
        product: params.product,
        action: params.action,
        units: params.units ?? 1,
        metadata: params.metadata || {},
    };
}
function summarizeUsageEvents(events, keySelector, range) {
    const groupedTotals = {};
    let totalUnits = 0;
    for (const event of events) {
        const key = keySelector(event);
        groupedTotals[key] = (groupedTotals[key] || 0) + event.units;
        totalUnits += event.units;
    }
    return {
        totalEvents: events.length,
        totalUnits,
        groupedTotals,
        dateRangeUsed: {
            from: range?.from,
            to: range?.to,
        },
    };
}
//# sourceMappingURL=events.js.map