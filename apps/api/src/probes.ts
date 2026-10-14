/** Real readiness probes: Postgres (SELECT 1), Valkey (PING), Temporal (TCP connect). */
import net from "node:net";
import { Pool } from "pg";
import { Redis } from "ioredis";
import type { Probes } from "./app.js";

export interface ProbeTargets {
  databaseUrl: string;
  redisUrl: string;
  /** host:port (bracketed IPv6 is not supported; the env schema enforces host:port). */
  temporalAddress: string;
  /** Connect/query deadline per probe attempt; keep aligned with the app's probeTimeoutMs. */
  timeoutMs?: number;
}

export interface ProbeHandles {
  probes: Probes;
  close(): Promise<void>;
}

export function createProbes(targets: ProbeTargets): ProbeHandles {
  const timeoutMs = targets.timeoutMs ?? 2000;
  // Without its own deadlines a blackholed Postgres would hang the single client forever and
  // queue every later readyz query behind it.
  const pool = new Pool({
    connectionString: targets.databaseUrl,
    max: 1,
    connectionTimeoutMillis: timeoutMs,
    query_timeout: timeoutMs,
  });
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
      // destroy() on every path: an abandoned SYN_SENT socket would otherwise leak an fd
      // until the kernel's ~2 min connect timeout.
      const socket = net.connect({ host, port: Number(port) });
      socket.setTimeout(timeoutMs, () =>
        socket.destroy(new Error(`connect timed out after ${timeoutMs}ms`)),
      );
      socket.once("connect", () => {
        socket.destroy();
        resolve();
      });
      socket.once("error", (error) => {
        socket.destroy();
        reject(error);
      });
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
