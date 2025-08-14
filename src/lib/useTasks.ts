import type { Log } from "../types/log.types.ts";
import { EventEmitter } from 'node:events';
import { join } from "https://deno.land/std@0.224.0/path/mod.ts";


export const event = new EventEmitter();
export let log: Log | undefined = console
export const useTasks = (options?: { log?: Log | boolean, dir?: string }) => {
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