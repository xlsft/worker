import { EventEmitter } from 'node:events';

class Emitter extends EventEmitter {}

export const events = new Emitter(); events.setMaxListeners(Infinity)
