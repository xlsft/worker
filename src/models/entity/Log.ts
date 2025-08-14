import { Entity, type QueryOptions, EntityMeta } from "../Entity.ts";
import { session } from "../../main.ts";

export type LogEntity = {
    type: string
    namespace?: string;
    message: string;
    session: string;
} & EntityMeta

export class Log extends Entity<LogEntity> {

    constructor(target: Partial<LogEntity>, options?: QueryOptions) { super('Log', {

        type: { type: String, required: true },
        namespace: { type: String },
        message: { type: String, required: true },
        session: { type: String, default: () => session },

    }, target, { ...options, logs: false }) }
    

}