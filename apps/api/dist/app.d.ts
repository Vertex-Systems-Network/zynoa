import { type ReadinessDependency } from "@zynoa/contracts";
import { type FastifyInstance } from "fastify";
export type Probe = () => Promise<void>;
export type Probes = Record<ReadinessDependency, Probe>;
export interface AppOptions {
    probes: Probes;
    /** Per-probe timeout; a probe slower than this counts as failed. */
    probeTimeoutMs?: number;
    logger?: boolean;
}
export declare function buildApp(options: AppOptions): Promise<FastifyInstance>;
//# sourceMappingURL=app.d.ts.map