// deno-lint-ignore-file no-explicit-any
import { EventEmitter } from 'node:events';
import fs from 'node:fs'
import process from "node:process";

/**
 * Interface for a logging utility.
 * Used to output informational messages and errors.
 * Compatible with `console` or any custom logger implementing the same methods.
 *
 * @typedef {Log}
 * @property {(…message: any[]) => void} error - Log one or more error messages or objects.
 * @property {(…message: any[]) => void} info - Log one or more informational messages or objects.
 */
export type Log = {
    error: (...message: any[]) => void
    info: (...message: any[]) => void
}


/**
 * Global event emitter used for task-related events.
 * @type {EventEmitter}
 */
export const event: EventEmitter = new EventEmitter();

/**
 * Global logger instance. Can be `undefined`, `console`, or a custom logger implementing `Log`.
 * @type {Log | undefined}
 */
export let log: Log | undefined = console

/**
 * Load and import all task files from the specified directory.
 * Sets up logging and global event emitter.
 */
export const useTasks = (options?: { log?: Log | boolean, dir?: string }): void => {
    event.setMaxListeners(Infinity);
    if (options?.log && (options.log as Log).info && (options.log as Log).error) log = options.log as Log
    else if (options?.log === false) log = undefined
    else if (options?.log === true) log = console
    const path = options?.dir || 'tasks'
    const dir = `${process.cwd()}/${path}`
    
    for (const entry of fs.readdirSync(dir)) { try {
        if (!['.task.ts', '.task.js', '.task.mts', '.task.mjs'].some(entry.endsWith)) continue
        import(`${dir}/${entry}`)
    } catch (e) { log?.error(e) } }
    setInterval(() => {}, 1);
}