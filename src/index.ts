import os from "os";
import cluster from "node:cluster";
import app from "./app";
import {logger} from "./configurations/logger";
import {__ENV} from "./configurations/environment";
import {DBKnex} from "./configurations/knex";
import {DBRedis} from "./configurations/redis";

const CLUSTER_SIZE_WORKER = os.cpus().length;

if (CLUSTER_SIZE_WORKER > 1 && __ENV.CLUSTER) {
    if (cluster.isPrimary) {
        logger.info(`Primary master process ${process.pid} is running. Forking ${CLUSTER_SIZE_WORKER} workers...`);

        for (let i = 0; i < CLUSTER_SIZE_WORKER; i++) {
            cluster.fork();
        }

        cluster.on("exit", function (worker) {
            logger.info(`Worker ${worker.id} has exited.`);
        });
    } else {
        startServer();
    }
} else {
    logger.info(`⚡️ No cluster is enabled. Available CPU cores: ${CLUSTER_SIZE_WORKER}`);
    startServer();
}

/**
 * Starts the express server listener
 */
function startServer() {
    app.listen(__ENV.PORT, () => {
        logger.info(`⚡️ [server local]: Server is running at http://localhost:${__ENV.PORT}`);
        logger.info(`⚡️ [server expose]: Server is running at http://localhost:${__ENV.PORT_EXPOSE}`);
    });
}

/**
 * Gracefully handle SIGINT (Ctrl+C) to close DB and Redis connections
 */
process.on("SIGINT", async () => {
    logger.info("Received SIGINT, closing DB connections...");

    try {
        if (DBKnex) {
            await DBKnex.destroy();
            logger.info("Knex connection closed");
        }

        if (DBRedis) {
            if (DBRedis.publisher) await DBRedis.publisher.quit();
            if (DBRedis.subscriber) await DBRedis.subscriber.quit();
            logger.info("Redis connection closed");
        }
    } catch (err: any) {
        logger.error(`Error while closing connections: ${err.message}`);
    } finally {
        process.exit(0);
    }
});