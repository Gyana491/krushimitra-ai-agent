
import { Mastra } from '@mastra/core/mastra';
import { PinoLogger } from '@mastra/loggers';

import { kccAgent } from './agents/kcc-agent';

export const mastra = new Mastra({
  workflows: {},
  agents: { kccAgent },
  aiSdkCompat: 'v4',
  logger: new PinoLogger({
    name: 'Mastra',
    level: 'info',
  }),
});
