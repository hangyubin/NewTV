import { EventEmitter } from 'events';

export const configEventEmitter = new EventEmitter();
export const CONFIG_UPDATED_EVENT = 'config-updated';
export const SOURCE_DELETED_EVENT = 'source-deleted';
export const SOURCE_ADDED_EVENT = 'source-added';
