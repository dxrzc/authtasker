import { HttpError } from 'src/common/errors/classes/http-error.class';
import { paginationErrors } from 'src/common/errors/messages/pagination.error.messages';

export function paginationRules(limit: number, page: number, totalDocuments: number) {
    if (limit <= 0) throw HttpError.badRequest(paginationErrors.INVALID_LIMIT);
    if (limit > 100) throw HttpError.badRequest(paginationErrors.LIMIT_TOO_LARGE);

    // For example: 21 documents with limit = 4, allows 6 pages (21/4 rounded up to the nearest int)
    const totalPages = Math.ceil(totalDocuments / limit);

    if (page <= 0) throw HttpError.badRequest(paginationErrors.INVALID_PAGE);
    if (page > totalPages) throw HttpError.badRequest(paginationErrors.PAGE_TOO_LARGE);

    const offset = (page - 1) * limit;
    return offset;
}
