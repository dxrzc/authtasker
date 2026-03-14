import mongoose, { ClientSession, HydratedDocument, Model } from 'mongoose';

export class Repository<T> {
    constructor(private readonly model: Model<T>) {}

    async startTransaction(): Promise<ClientSession> {
        return await mongoose.startSession();
    }

    async findById(id: string): Promise<HydratedDocument<T> | null> {
        return await this.model.findById(id).exec();
    }

    async countDocuments(filter?: Partial<T>): Promise<number> {
        return await this.model.countDocuments(filter).exec();
    }

    async exists(id: string): Promise<boolean> {
        const doc = await this.model.exists({ _id: id }).exec();
        return !!doc;
    }
}
