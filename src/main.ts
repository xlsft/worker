import { log, useEnv, useUUID } from "tasks";
import { fromFileUrl, dirname, join } from "https://deno.land/std@0.224.0/path/mod.ts";
import mongoose from 'npm:mongoose'

export const session = useUUID()
export const env = await useEnv((count) => log.log(`🔤 ${count} environment variables loaded from .env file`))

const uri = `mongodb://${Deno.env.get(`MONGO_URI`) || '127.0.0.1:27017'}/worker`
await mongoose.connect(uri).then(() => log.log(`🍃 Mongo connected on ${uri}`))

const dir = join(dirname(fromFileUrl(import.meta.url)), "../tasks")
for (const entry of Deno.readDirSync(dir)) { try {
    if (!entry.isFile || !entry.name.endsWith('task.ts')) continue
    import(`file://${join(dir, entry.name)}`)
} catch (e) { log.error(e) } }