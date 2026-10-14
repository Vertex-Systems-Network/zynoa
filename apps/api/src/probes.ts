/** Real readiness probes: Postgres (SELECT 1), Valkey (PING), Temporal (TCP connect). */
import net from "node:net";
import { Pool } from "pg";
import { Redis } from "ioredis";
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

export function createProbes(targets: ProbeTargets): ProbeHandles {
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

  const tcpProbe = (address: string) => () =>
    new Promise<void>((resolve, reject) => {
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
        if (redis.status === "end" || redis.status === "wait") await redis.connect();
        await redis.ping();
      },
      temporal: tcpProbe(targets.temporalAddress),
    },
    async close() {
      await Promise.allSettled([pool.end(), redis.quit()]);
    },
  };
}
