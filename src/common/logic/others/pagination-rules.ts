import { Model } from "mongoose";
import { HttpError } from '@root/common/errors/classes/http-error.class';
import { paginationErrors } from '@root/common/errors/messages/pagination.error.messages';

export async function paginationRules(limit: number, page: number, model: Model<any>): Promise<number | any[]> {
    if (limit <= 0)
        throw HttpError.badRequest(paginationErrors.INVALID_LIMIT);
    if (limit > 100)
        throw HttpError.badRequest(paginationErrors.LIMIT_TOO_LARGE);

    const totalDocuments = await model.countDocuments().exec();
    if (totalDocuments === 0)
        return [];

    const totalPages = Math.ceil(totalDocuments / limit);

    if (page <= 0)
        throw HttpError.badRequest(paginationErrors.INVALID_PAGE);
    if (page > totalPages)
        throw HttpError.badRequest(paginationErrors.PAGE_TOO_LARGE);
    
    const offset = (page - 1) * limit;
    return offset;
}