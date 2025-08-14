// deno-lint-ignore-file no-explicit-any no-control-regex
import { Log } from '../models/entity/Log.ts';
import c from 'npm:chalk';

export type Logger = {
    log: (...message: any[]) => Logger,
    ok: (...message: any[]) => Logger,
    warn: (...message: any[]) => Logger,
    error: (...message: any[]) => Logger,
    critical: (...message: any[]) => Logger,
    info: (...message: any[]) => Logger,
}

export const useLogger = (name?: string) => {
    

    const log = (message: (string | string[])[], logger = console.log) => logger(`${message[0]}`, ...message[1])
    const template = (_prefix: string, ...message: string[]) => [`${c.dim(new Date().toLocaleTimeString())}${c.bold(c.cyan(name ? ` [${name}]`: ``))}`, [...message]]

    const entry = (leading: string, logger = console.log,  ...message: any[]): Logger => {
        const data = template(leading, ...message)
        log(data, logger);
        // Remove ANSI colors from strings before logging and storing
        const stripAnsi = (str: string) => str.replace(
            /\x1B\[[0-9;]*m/g, ''
        );
        const result = JSON.stringify(
            data.slice(1, data.length)
            .flat()
            .map((s: string) => typeof s === 'string' ? stripAnsi(s) : s)
        );
        new Log({ message: result, type: leading, namespace: name }).create()
        return chain
    }

    const chain: Logger = {
        log: (...message: any[]) => entry('log', console.log, ...message),
        ok: (...message: any[]) => entry('ok', console.log, ...message),
        warn: (...message: any[]) => entry('warn', console.warn, ...message),
        error: (...message: any[]) => entry('error', console.error, ...message),
        critical: (...message: any[]) => entry('critical', console.error, ...message),
        info: (...message: any[]) => entry('info', console.info, ...message),
    }

    return chain
}  

export const log = await useLogger()