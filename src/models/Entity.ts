// deno-lint-ignore-file no-unused-vars
import mongoose from "npm:mongoose";
import { log } from "tasks";

export type PaginatedOptions = {
    page?: number
    limit?: number
}

export type PaginationMeta = {
    page: number
    limit: number
    total: number
    pages: number
    next?: number
    prev?: number
    hasNext: boolean
    hasPrev: boolean
    label?: string
}

export type QueryOptions = mongoose.QueryOptions & {
    pagination?: PaginatedOptions,
    logs?: boolean,
}

export type EntityMeta = {
    _id: typeof EntityID
    _n: number
    created_at: Date
    updated_at: Date
    deleted_at: Date | null
}

export const EntityID = mongoose.Schema.Types.ObjectId

declare global {
    // deno-lint-ignore no-explicit-any
    var mongooseModels: Record<string, any>
}

export class Entity<Model = Record<PropertyKey, never>> {

    
    public readonly model: mongoose.Model<Model & EntityMeta>
    public readonly schema: mongoose.Schema
    public options: QueryOptions
    public target: Partial<Model & EntityMeta> = {}

    constructor(private name: string, definition: mongoose.SchemaDefinition, target: Partial<Model & EntityMeta> = {}, query?: QueryOptions) {
        if (!globalThis.mongooseModels) globalThis.mongooseModels = {}
        this.schema = new mongoose.Schema({
            _n: { type: Number, unique: true },
            deleted_at: { type: Date, default: null },
            ...definition
        }, {
            timestamps: {
                createdAt: 'created_at',
                updatedAt: 'updated_at'
            }
        })
        this.model = globalThis.mongooseModels?.[this.name] || mongoose.model<Model & EntityMeta>(this.name, this.schema)
        this.target = {
            deleted_at: null,
            ...target
        }
        this.options = {
            logs: true,
            ...query
        }
        globalThis.mongooseModels[this.name] = this.model
    }



    public async create() {
        const result = await new this.model(this.target).save()
        if (this.options.logs) log.info(`Created new "${this.name}" entity:`, result, { n: (await this.count()) + 1,  ...this.target}, this.options)
        return result?.toObject()
    }

    public async get() {
        const { logs, pagination, ...options } = this.options
        const result = (await this.model.findOne(this.target, options))
        if (this.options.logs) log.info(`Found "${this.name}" entity:`, result, this.target, this.options)
        return result?.toObject()
    }

    public async find() {
        const { logs, pagination, ...options } = this.options
        const result = await this.model.find(this.target, null, options)

        if (this.options.logs) log.info(`Found "${this.name}" entities:`, result, this.target, this.options)
        return result.map(document => document?.toObject())
    }

    public async update(data: mongoose.UpdateQuery<Model & EntityMeta> = {}) {
        const { logs, pagination, ...options } = this.options
        const result = await this.model.findOneAndUpdate(this.target, data, { ...options, new: true })
        if (this.options.logs) log.info(`Updated "${this.name}" entity:`, data, result, this.target, this.options)
        return result?.toObject()
    }

    public async delete() {
        const { logs, pagination, ...options } = this.options
        const result = await this.model.findOneAndUpdate(this.target, { deleted_at: new Date() }, options)
        if (this.options.logs) log.info(`Soft deleted "${this.name}" entity:`, result, this.target, this.options)
        return result?.toObject()
    }

    public async hardDelete() {
        const { logs, pagination, ...options } = this.options
        const result = await this.model.findOneAndDelete(this.target, options)
        if (this.options.logs) log.info(`Hard deleted "${this.name}" entity:`, result, this.target, this.options)
        return result?.toObject()
    }

    public async restore() {
        const { logs, pagination, ...options } = this.options
        const result = await this.model.findOneAndUpdate(this.target, { deleted_at: null }, this.options)
        if (this.options.logs) log.info(`Restored "${this.name}" entity:`, result, this.target, this.options)
        return result?.toObject()
    }

    public async list() {
        const _pagination = {
            page: 1,
            limit: 10,
            ...this.options?.pagination || {},
        }
        const _options = {
            skip: (_pagination.page - 1) * _pagination.limit,
            limit: _pagination.limit,
            ...this.options,
        }
        const { logs, pagination, ...options } = _options
        const data = (await this.model.find(this.target, null, options)).map(document => document?.toObject())
        // (await this.model.find(this.target, _options)).map(document => document?.toObject())
        const count = await this.model.countDocuments(this.target)
        const meta: PaginationMeta = {
            page: _pagination.page,
            limit: _pagination.limit,
            total: count,
            pages: Math.ceil(count / _pagination.limit),
            next: _pagination.page + 1 <= Math.ceil(count / _pagination.limit) ? _pagination.page + 1 : undefined,
            prev: _pagination.page - 1 > 0 ? _pagination.page - 1 : undefined,
            hasNext: data ? _pagination.page + 1 <= Math.ceil(count / _pagination.limit) : false,
            hasPrev: _pagination.page - 1 > 0,
            label: data ? `${_pagination.page} / ${Math.ceil(count / _pagination.limit)} pages | ${(_pagination.page - 1) * _pagination.limit + data.length} / ${count} items` : undefined
        }
        const result = { data, meta }
        if (this.options.logs) log.info(`Found "${this.name}" entities, paginated:`, result, this.target, this.options)
        return result
    }

    public async count() {
        const result = await this.model.countDocuments(this.target)
        if (this.options.logs) log.info(`Counted "${this.name}" entities:`, result, this.target, this.options)
        return result
    }
    
    public async exists() {
        const result = await this.model.exists(this.target)
        if (this.options.logs) log.info(`Checked "${this.name}" entity exists:`, result, this.target, this.options)
        return result
    }
}