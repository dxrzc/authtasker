import { HttpError } from 'src/errors/http-error.class';
import { paginationErrors } from 'src/messages/pagination.error.messages';

export function calculatePagination(limit: number, page: number, totalDocuments: number) {
    if (isNaN(limit)) throw HttpError.badRequest(paginationErrors.INVALID_LIMIT);
    if (isNaN(page)) throw HttpError.badRequest(paginationErrors.INVALID_PAGE);

    if (limit <= 0) throw HttpError.badRequest(paginationErrors.INVALID_LIMIT);
    if (limit > 100) throw HttpError.badRequest(paginationErrors.LIMIT_TOO_LARGE);

    // For example: 21 documents with limit = 4, allows 6 pages (21/4 rounded up to the nearest int)
    const totalPages = Math.ceil(totalDocuments / limit);

    if (page <= 0) throw HttpError.badRequest(paginationErrors.INVALID_PAGE);
    if (page > totalPages) throw HttpError.badRequest(paginationErrors.INVALID_PAGE);

    const offset = (page - 1) * limit;
    return { offset, totalPages };
}
