/**
 * /version routes — exposes service identity for tooling and CI.
 */

import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { PACKAGE_NAME, PACKAGE_VERSION } from '../version.js';

export const versionRoutes: FastifyPluginAsync = async (app: FastifyInstance): Promise<void> => {
  app.get('/', async (): Promise<{ name: string; version: string }> => {
    return { name: PACKAGE_NAME, version: PACKAGE_VERSION };
  });
};
