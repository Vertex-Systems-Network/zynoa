import type { Probes } from "./app.js";
export interface ProbeTargets {
    databaseUrl: string;
    redisUrl: string;
    /** host:port */
    temporalAddress: string;
}
export interface ProbeHandles {
    probes: Probes;
    close(): Promise<void>;
}
export declare function createProbes(targets: ProbeTargets): ProbeHandles;
//# sourceMappingURL=probes.d.ts.map