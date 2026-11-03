import { app } from './app';
import { env } from './config/env';
import { databasePool } from './config/database';
import { logger } from './config/logger';

const server = app.listen(env.PORT, () => {
  logger.info({ port: env.PORT }, 'MagicReview API is running');
});

async function shutdown(signal: string): Promise<void> {
  logger.info({ signal }, 'Shutting down');

  server.close(async (error) => {
    if (error) {
      logger.error({ err: error }, 'HTTP server shutdown failed');
      process.exit(1);
    }

    await databasePool.end();
    process.exit(0);
  });
}

process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));
