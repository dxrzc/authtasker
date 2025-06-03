import { HttpError } from "@root/rules/errors/http.error";
import { Model } from "mongoose";

export async function paginationRules(limit: number, page: number, model: Model<any>): Promise<number | any[]> {
    if (limit <= 0)
        throw HttpError.badRequest('Limit must be a valid number');
    if (limit > 100)
        throw HttpError.badRequest('Limit is too large');

    const totalDocuments = await model.countDocuments().exec();
    if (totalDocuments === 0)
        return [];

    const totalPages = Math.ceil(totalDocuments / limit);

    if (page <= 0)
        throw HttpError.badRequest('Page must be a valid number');
    if (page > totalPages)
        throw HttpError.badRequest('Invalid page');
    
    const offset = (page - 1) * limit;
    return offset;
}