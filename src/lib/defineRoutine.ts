import type { TaskEventInterface } from "./defineTask.ts";

/**
 * An asynchronous worker function that processes a single payload.
 *
 * @template T The type of payload handled by the worker.
 * @typedef {TaskAsyncWorker}
 * @param {T} payload - The payload item to process.
 * @returns {Promise<void>} A promise that resolves when processing is complete.
 */
export type TaskAsyncWorker<T = unknown> = (payload: T, event: TaskAsyncEventInterface) => Promise<void>

/**
 * Event interface for asynchronous tasks.
 */
export type TaskAsyncEventInterface = TaskEventInterface & {
    state: {
        routines?: number
    }
    break: () => void
}

/**
 * Options for configuring a routine's execution behavior.
 * @typedef {TaskOptions}
 * @property {number} [retry] - Number of times to retry the routine on failure.
 * @property {number} [delay] - Delay in milliseconds between routine`s executions.
 */
export type TaskAsyncOptions = {
    retry?: number
    delay?: number
}

/**
 * Define a coroutine that processes a queue of payloads concurrently with a fixed number of worker threads.
 *
 * @template Payload The type of payload items in the queue.
 * @param {TaskEventInterface} event - The task event associated with the coroutine.  
 *   If the event state changes from `"pending"`, processing will stop.
 * @param {TaskAsyncWorker<Payload>} worker - The async worker function that processes each payload.
 * @param {number} threads - Maximum number of concurrent workers allowed.
 * @param {Payload[]} [payloads=[]] - Initial queue of payload items to process.
 * @returns {Promise<void>} Resolves when all payloads have been processed or rejects if any worker throws.
 *
 * @example
 * ```ts
import { defineTask, defineCoroutine } from "@xlsft/worker"

const fetchPage = async (page: number) => {
    await new Promise(r => setTimeout(r, 10000))
    return { page, data: [] }
}

export default defineTask(async (event) => {
    const pages = Array.from({ length: 70 }, (_, i) => i + 1)

    await defineCoroutine(event, async (payload) => { 
        await fetchPage(payload)
    }, 10, pages)
})

 * ```
 */
export const defineRoutine = <Payload = unknown>(
    e: TaskEventInterface,
    worker: TaskAsyncWorker<Payload>,
    threads: number,
    payloads?: Payload[] | (() => Promise<Payload[]>),
    options?: TaskAsyncOptions
): Promise<void> => {
    const event: TaskAsyncEventInterface = {
        ...e,
        break: () => breaked = true
    }
    let breaked = false
    let queue: Payload[] = []
    let active = 0

    return new Promise<void>((resolve, reject) => {
        const init = async () => {
            try {
                if (typeof payloads === "function") queue = await payloads()
                else if (Array.isArray(payloads)) queue = [...payloads]
                else queue = []
            } catch (err) { reject(err); return }

            const next = () => {
                if (breaked) return resolve()
                event.state.routines = undefined
                if (event.state.status !== "pending" && event.state.status !== "running") return
                if (queue.length === 0 && active === 0) return resolve()
                     
                while ((queue.length > 0 || payloads === undefined) && active < threads && !breaked) {
                    const payload = queue.length > 0 ? queue.shift()! : undefined as unknown as Payload
                    active++
                    event.state.routines = active
                    let attempt = 0
                    const job = async () => {
                        if (options?.delay) await new Promise(resolve => setTimeout(resolve, options.delay));
                        worker(payload, event).catch(reject).finally(() => {
                            active--
                            event.state.routines = active
                            next()
                        })
                    }
                    try {
                        job()
                    } catch (e) {
                        event.log.error(e);
                        if (attempt >= (options?.retry || 0)) return
                        attempt++
                        job()
                    }
        
                    if (payloads === undefined) { event.state.routines = undefined; break } 
                }
            }; next()
        }; init()
    })
}
