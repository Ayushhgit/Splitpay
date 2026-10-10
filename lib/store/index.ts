import { localRepo } from './local-repo';
import type { Repository } from './repository';

/** The one place the app decides where its ledger lives. */
export const repo: Repository = localRepo;

export * from './repository';
export * from './types';
