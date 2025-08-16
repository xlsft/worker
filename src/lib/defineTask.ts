/// <reference types="npm:@types/node-schedule@2.1.8" />

import { event as events, type Log, log } from "./useTasks.ts";
import schedule from 'npm:node-schedule@2.1.1'
/**
 * A function representing a task to be executed.
 * @typedef {Task}
 * @param {TaskEventInterface} event - The event context for the task, providing state, data, and control methods.
 * @returns {void | Promise<void>} Can return nothing or a Promise for async operations.
 */
export type Task = (event: TaskEventInterface) => void | Promise<void>;

/**
 * A worker function responsible for invoking the task logic.
 * This is typically bound to an event or scheduled execution.
 * @typedef {TaskWorker}
 * @returns {void}
 */
export type TaskWorker = () => void;

/**
 * Interface defining the shape of a task event object.
 * @typedef {TaskEventInterface}
 * @property {{ status: 'pending' | 'running' | 'success' | 'failed' | 'killed' | 'canceled', attempt?: number, more?: number }} state
 *   Current state of the task. `attempt` indicates retry attempt count, `more` shows remaining runs.
 * @property {{ name: string, trigger?: TaskTrigger, cron: boolean }} data
 *   Metadata about the task, including name, trigger, and whether it is scheduled via cron.
 * @property {Date} created - Timestamp when the task was created.
 * @property {() => void} kill - Forcefully stop the task, setting status to `killed`.
 * @property {() => void} cancel - Interrupt the task, setting status to `canceled`.
 * @property {(event: string) => void} emit - Emit a custom event related to this task.
 */
export type TaskEventInterface = {
    state: {
        status: 'pending' | 'running' | 'success' | 'failed' | 'killed' | 'canceled'
        attempt?: number
        more?: number
        active?: number
    }
    data: {
        name: string
        trigger: TaskTrigger
        cron: boolean
    }
    created: Date
    kill: () => void
    cancel: () => void
    emit: (event: string) => boolean,
    log: Log
}

/**
 * A single cron schedule specification item.
 * Can be a number, an object specifying exact values, or a range with a step.
 *
 * @typedef {TaskCronScheduleSchemaItem}
 * @property {number | { exact: number | number[] } | { start?: number; end?: number; every?: number }} 
 *   Defines either a single value, exact values, or a range with optional step.
 */
export type TaskCronScheduleSchemaItem = 
    | number
    | { exact: number | number[] }
    | { start?: number; end?: number; every?: number };

/**
 * Cron schedule schema for a task.
 * Defines minute, hour, day of month, month, and day of week.
 *
 * @typedef {TaskCronScheduleSchema}
 * @property {TaskCronScheduleSchemaItem} minute - Minute(s) to run the task (0–59).
 * @property {TaskCronScheduleSchemaItem} hour - Hour(s) to run the task (0–23).
 * @property {TaskCronScheduleSchemaItem} dayOfMonth - Day(s) of the month to run the task (1–31).
 * @property {TaskCronScheduleSchemaItem} month - Month(s) to run the task (1–12).
 * @property {TaskCronScheduleSchemaItem} dayOfWeek - Day(s) of the week to run the task (0–6, 0 = Sunday).
 */
export type TaskCronScheduleSchema = {
    minute?: TaskCronScheduleSchemaItem
    hour?: TaskCronScheduleSchemaItem
    dayOfMonth?: TaskCronScheduleSchemaItem
    month?: TaskCronScheduleSchemaItem
    dayOfWeek?: TaskCronScheduleSchemaItem
}

/**
 * Task cron schedule type.
 * Can be a cron string (e.g., `"0 0 * * *"`), a specific Date, or a detailed schema.
 *
 * @typedef {TaskTrigger}
 */
export type TaskTrigger = string | Date | TaskCronScheduleSchema;


/**
 * Options for configuring a task's execution behavior.
 * @typedef {TaskOptions}
 * @property {number} [retry] - Number of times to retry the task on failure.
 * @property {number} [delay] - Delay in milliseconds between task executions.
 * @property {number} [times] - Number of times to run the task.
 */
export type TaskOptions = {
    retry?: number
    delay?: number
    times?: number
}

/**
 * A function that defines and registers a task.
 * @typedef {TaskModule}
 * @param {Task} task - The task function to execute.
 * @param {TaskTrigger} [trigger] - Optional event name or cron schedule for triggering the task.
 * @param {TaskOptions} [options] - Optional configuration for retries, delays, and repetitions.
 * @returns {void}
 */
export type TaskModule = (task: Task, trigger?: TaskTrigger, options?: TaskOptions) => void;

const convert = (schema: TaskCronScheduleSchema): string => {
    const field = (item?: TaskCronScheduleSchemaItem): string => {
        if (!item) return "*"
        if (typeof item === "number") return String(item);
        if ('exact' in item) return Array.isArray(item.exact) ? item.exact.join(',') : String(item.exact)
        const { start, end, every } = item
        if (start != null && end != null) {
            const base = `${start}-${end}`
            return every ? `${base}/${every}` : base
        }
        if (every != null) return `*/${every}`
        return `*`
    }
    return [field(schema.minute), field(schema.hour), field(schema.dayOfMonth), field(schema.month), field(schema.dayOfWeek)].join(` `)
}

class TaskKill extends Error { override name = 'TaskKill'; constructor() { super('') } }
class TaskCancel extends Error { override name = 'TaskCancel'; constructor() { super('') } }
/**
 * Represents a task event, including its state, data, and execution control methods.
 * Implements TaskEventInterface.
 */
export class TaskEvent implements TaskEventInterface {

    public readonly created: Date = new Date()
    public readonly state: TaskEventInterface['state'] = { status: 'pending' }
    public readonly data: TaskEventInterface['data']

    constructor(caller: string[], private worker: TaskWorker, trigger?: TaskTrigger) {
        const name = isNaN(Number(caller[0])) ? caller[0] : caller[1]


        const _trigger = trigger ? (trigger instanceof Date || typeof trigger === 'string') ? trigger : convert(trigger as TaskCronScheduleSchema) : name
        this.data = {
            name: name,
            trigger: _trigger,
            cron: isCron(trigger)
        }
    }

    public kill() {
        this.state.status = 'killed'
        log?.info(`🔪 Task killed "${this.data.name}"`, this)
        if (!this.data.cron) events.off((this.data.trigger || this.data.name) as string, this.worker)
        throw new TaskKill();
    }

    public cancel() {
        this.state.status = 'canceled'
        log?.info(`⛔️ Task canceled "${this.data.name}"`, this)
        throw new TaskCancel();
    }

    public emit(event: string): boolean {
        return emit(event)
    }

    public readonly log: Log = {
        // deno-lint-ignore no-explicit-any
        error: (...message: any[]) => (log || console).error(`[${this.data.name}]`, ...message),
        // deno-lint-ignore no-explicit-any
        info: (...message: any[]) => (log || console).info(`[${this.data.name}]`, ...message)
    }
    
}

/**
 * Emits a custom event by name.
 *
 * @param {string} event - The name of the event to emit.
 * @returns {boolean} Whether the event had listeners and was successfully emitted.
 */
export const emit = (event: string): boolean => {
    if (isCron(event)) throw new Error('Event name can`t be an cron string')
    return events.emit(event)
}

const isCron = (trigger?: TaskTrigger) => !!trigger && (
    trigger instanceof Date ||
    typeof trigger === 'object' ||
    (typeof trigger === 'string' && /^(\*|\d+(-\d+)?(\/\d+)?(,\d+)?)(\s+(\*|\d+(-\d+)?(\/\d+)?(,\d+)?)){4}$/.test(trigger.trim()))
);

/**
 * Define and register a new task.
 */
export const defineTask = (task: Task, trigger?: TaskTrigger, options?: TaskOptions): TaskEvent => {

    const caller = ((new Error().stack?.split("\n").find(l => l.match(/\.(cjs|mjs|cts|mts|js|ts)(?::\d+:\d+)?$/))?.match(/(?:file:\/\/)?(.*?):\d+:\d+/)?.[1]?.split(/[\\/]/).pop() || "00.unknown.task.ts").split('.'));

    const worker: TaskWorker = () => { 
        log?.info(`✨ Task "${event.data.name}" started`, event)
        if (event.state.status === 'killed') { return };
        let attempts = options?.retry ? options.retry - 1 : 0
        const job = async () => {
            if (options?.retry) event.state.attempt = Math.abs(attempts - options.retry)
            for (let i = 0; i < (options?.times || 1); i++) {
                if (event.state.status === 'canceled') continue
                if (options?.times) event.state.more = (options.times - i) - 1
                if (options?.delay) await new Promise(resolve => setTimeout(resolve, options.delay));
                try {
                    event.state.status = 'running'
                    await task(event as TaskEvent)
                    event.state.status = 'success'
                    log?.info(`✅ Task "${event.data.name}" successfully completed`, event)
                } catch (e) { 
                    if (e instanceof TaskKill) return
                    else if (e instanceof TaskCancel) continue
                    else { 
                        log?.error(e); event.state.status = 'failed'; log?.error(`❌ Task "${event.data.name}" failed`, event)
                        event.state.status = 'pending'
                        if (attempts === 0) return
                        attempts--
                        job()
                    }
                };
            }
            if (event.state.status === 'canceled') event.state.status = 'pending'
        }; job()
    }

    const event = new TaskEvent(caller, worker, trigger)

    log?.info(`🎯 Defining new task "${event.data.name}"`, event)
    
    if (event.data.cron === true) setTimeout(() => schedule.scheduleJob(event.data.trigger as string | Date, worker), 0)
    else events.on((event.data.trigger || event.data.name) as string, worker)
    return event

}