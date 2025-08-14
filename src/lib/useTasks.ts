// deno-lint-ignore-file no-explicit-any
import { EventEmitter } from 'node:events';
import { encodeBase64 as encode } from 'jsr:@std/encoding/base64'

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
 * @example - Default usage
    ```ts
    import { useTasks } from "@xlsft/worker";
    useTasks()
    ```
 * @example - Custom logger
    ```ts
    import { useTasks } from "@xlsft/worker";
    const log = useLogger() // Some logger
    useTasks({ log })
    ```
 * @example - Disable logger
    ```ts
    import { useTasks } from "@xlsft/worker";
    useTasks({ log: false }) // Disables logging
    ```

    @example - Change tasks folder
    
    Be aware that it needs to be relative path from `Deno.cwd()`

    ```ts
    import { useTasks } from "@xlsft/worker";
    useTasks({ dir: './src/tasks' })
    ```
 * @param - Configuration options for task loading.
 */
export const useTasks = (options?: { log?: Log | boolean, dir?: string }): void => {
    event.setMaxListeners(Infinity)
    if (options?.log && (options.log as Log).info && (options.log as Log).error) log = options.log as Log
    else if (options?.log === false) log = undefined
    else if (options?.log === true) log = console
    const path = options?.dir || 'tasks'
    const dir = `${Deno.cwd()}/${path}`
    for (const entry of Deno.readDirSync(dir)) { try {
        if (!entry.isFile || !entry.name.endsWith('.task.ts')) continue
        import(`data:application/typescript;base64,${encode(Deno.readTextFileSync(`${dir}/${entry.name}`))}`)
    } catch (e) { log?.error(e) } }
}