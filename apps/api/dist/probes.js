/** Real readiness probes: Postgres (SELECT 1), Valkey (PING), Temporal (TCP connect). */
import net from "node:net";
import { Pool } from "pg";
import { Redis } from "ioredis";
export function createProbes(targets) {
    const pool = new Pool({ connectionString: targets.databaseUrl, max: 1 });
    pool.on("error", () => {
        /* keep an idle-connection drop from crashing the process; readyz reports it */
    });
    const redis = new Redis(targets.redisUrl, {
        lazyConnect: true,
        maxRetriesPerRequest: 1,
        enableOfflineQueue: false,
    });
    redis.on("error", () => {
        /* surfaced through the probe result, not an unhandled event */
    });
    const tcpProbe = (address) => () => new Promise((resolve, reject) => {
        const [host, port] = address.split(":");
        const socket = net.connect({ host, port: Number(port) });
        socket.once("connect", () => {
            socket.end();
            resolve();
        });
        socket.once("error", reject);
    });
    return {
        probes: {
            database: async () => {
                await pool.query("SELECT 1");
            },
            redis: async () => {
                if (redis.status === "end" || redis.status === "wait")
                    await redis.connect();
                await redis.ping();
            },
            temporal: tcpProbe(targets.temporalAddress),
        },
        async close() {
            await Promise.allSettled([pool.end(), redis.quit()]);
        },
    };
}
//# sourceMappingURL=probes.js.map