import { Model } from "mongoose";
import { HttpError } from '@root/common/errors/classes';
import { errorMessages } from '@root/common/errors/messages';

export async function paginationRules(limit: number, page: number, model: Model<any>): Promise<number | any[]> {
    if (limit <= 0)
        throw HttpError.badRequest(errorMessages.INVALID_PAG_LIMIT);
    if (limit > 100)
        throw HttpError.badRequest(errorMessages.PAG_LIMIT_TOO_LARGE);

    const totalDocuments = await model.countDocuments().exec();
    if (totalDocuments === 0)
        return [];

    const totalPages = Math.ceil(totalDocuments / limit);

    if (page <= 0)
        throw HttpError.badRequest(errorMessages.INVALID_PAG_PAGE);
    if (page > totalPages)
        throw HttpError.badRequest(errorMessages.PAG_PAGE_TOO_LARGE);
    
    const offset = (page - 1) * limit;
    return offset;
}