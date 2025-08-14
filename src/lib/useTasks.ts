import type { Log } from "../types/log.types.ts";
import { EventEmitter } from 'node:events';
import { join } from "jsr:@std/path@1.1.2";

export const event: EventEmitter = new EventEmitter();
export let log: Log | undefined = console
export const useTasks = (options?: { log?: Log | boolean, dir?: string }): void => {
    event.setMaxListeners(Infinity)
    if (options?.log && (options.log as Log).info && (options.log as Log).error) log = options.log as Log
    else if (options?.log === false) log = undefined
    else if (options?.log === true) log = console
    const path = options?.dir || './tasks'
    const dir = join(Deno.cwd(), path)
    for (const entry of Deno.readDirSync(dir)) { try {
        if (!entry.isFile || !entry.name.endsWith('task.ts')) continue
        import(`file://${join(dir, entry.name)}`)
    } catch (e) { log?.error(e) } }
}