// src/server.ts

import os from "node:os";
import cluster from "node:cluster";
import app, {bootstrap} from "./app";
import {logger} from "./config/logger";
import {__ENV} from "./config/environment";
import {DBKnex} from "./config/knex";
import {disconnectRedis} from "./config/redis";

const CLUSTER_SIZE_WORKER = os.cpus().length;

if (__ENV.CLUSTER && CLUSTER_SIZE_WORKER > 1) {
    if (cluster.isPrimary) {
        logger.info(`[Primary ${process.pid}] Main process active. Allocating ${CLUSTER_SIZE_WORKER} workers...`);

        // Fork workers.
        for (let i = 0; i < CLUSTER_SIZE_WORKER; i++) {
            cluster.fork();
        }

        // Auto-resurrection: If a worker dies, spin up a new one to maintain capacity.
        cluster.on("exit", (worker, code, signal) => {
            logger.warn(`[Primary] Worker ${worker.process.pid} died (Code: ${code}, Signal: ${signal}). Reviving worker...`);
            cluster.fork();
        });

    } else {
        // Handle the promise returned by starting the worker server
        startServer().catch((error) => {
            logger.error(`[Worker ${process.pid}] Critical initialization failure: ${error.message}`);
            process.exit(1);
        });
    }
} else {
    logger.info(`⚡️ Run mode: Standalone. Available CPU Cores: ${CLUSTER_SIZE_WORKER}`);

    // Handle the promise returned by starting the standalone server
    startServer().catch((error) => {
        logger.error(`Critical standalone initialization failure: ${error.message}`);
        process.exit(1);
    });
}

/**
 * Handles dependency boot-up sequences and starts listening
 */
async function startServer(): Promise<void> {
    // Warm L1/L2 caches and establish listeners first
    await bootstrap();

    const server = app.listen(__ENV.PORT, () => {
        logger.info(`🚀 [Worker ${process.pid}] Server online: http://localhost:${__ENV.PORT}`);
    });

    // Graceful Worker Shutdown (SIGINT / SIGTERM)
    const gracefulShutdown = async (signal: string) => {
        logger.info(`[Worker ${process.pid}] Received ${signal}. Starting safe termination...`);

        server.close(async () => {
            logger.info("Express engine closed. Cleaning up storage links...");
            try {
                if (DBKnex) {
                    await DBKnex.destroy();
                    logger.info("Database pool safely drained.");
                }
                await disconnectRedis();
            } catch (err: any) {
                logger.error(`Error during cleanup sequence: ${err.message}`);
            } finally {
                process.exit(0);
            }
        });

        // Force close connections if graceful shutdown hangs
        setTimeout(() => {
            logger.error("Shutdown timed out. Forcing shutdown.");
            process.exit(1);
        }, 10000);
    };

    process.on("SIGINT", () => {
        gracefulShutdown("SIGINT").catch((err) => {
            logger.error(`Failed executing SIGINT cleanup: ${err.message}`);
            process.exit(1);
        });
    });

    process.on("SIGTERM", () => {
        gracefulShutdown("SIGTERM").catch((err) => {
            logger.error(`Failed executing SIGTERM cleanup: ${err.message}`);
            process.exit(1);
        });
    });
}