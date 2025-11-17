export interface PaginationOptions {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  search?: string;
  filters?: Record<string, any>;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
}

export interface CursorPaginationMeta {
  hasNextPage: boolean;
  hasPrevPage: boolean;
  nextCursor?: string;
  prevCursor?: string;
  total?: number;
}

export interface CursorPaginatedResponse<T> {
  data: T[];
  meta: CursorPaginationMeta;
}

export function createPaginationQuery(options: PaginationOptions = {}) {
  const {
    page = 1,
    limit = 20,
    sortBy = 'created_at',
    sortOrder = 'desc',
    search,
    filters,
  } = options;

  const offset = (page - 1) * limit;

  const query: any = {
    range: [offset, offset + limit - 1] as [number, number],
    order: { [sortBy]: sortOrder },
  };

  if (search) {
    query.text = { search };
  }

  if (filters) {
    query = { ...query, ...filters };
  }

  return query;
}

export function getPaginationMeta(
  page: number,
  limit: number,
  total: number
): PaginationMeta {
  const totalPages = Math.ceil(total / limit);

  return {
    page,
    limit,
    total,
    totalPages,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,
  };
}

export function parsePaginationParams(query: any): PaginationOptions {
  const page = parseInt(query.page as string) || 1;
  const limit = parseInt(query.limit as string) || 20;
  const sortBy = (query.sortBy as string) || 'created_at';
  const sortOrder = (query.sortOrder as 'asc' | 'desc') || 'desc';
  const search = query.search as string;

  return {
    page: Math.max(1, page),
    limit: Math.min(100, Math.max(1, limit)),
    sortBy,
    sortOrder,
    search,
  };
}

export function createCursor(
  data: any[],
  sortBy: string,
  sortOrder: 'asc' | 'desc'
): string {
  if (data.length === 0) return '';

  const lastItem = data[data.length - 1];
  const cursorValue = lastItem[sortBy];

  return Buffer.from(
    JSON.stringify({
      value: cursorValue,
      sortBy,
      sortOrder,
    })
  ).toString('base64');
}

export function parseCursor(cursor?: string): {
  value: any;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
} | null {
  if (!cursor) return null;

  try {
    const decoded = Buffer.from(cursor, 'base64').toString('utf-8');
    return JSON.parse(decoded);
  } catch (error) {
    console.error('Failed to parse cursor:', error);
    return null;
  }
}

export function validatePaginationOptions(options: PaginationOptions): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (options.page && options.page < 1) {
    errors.push('Page must be greater than 0');
  }

  if (options.limit && (options.limit < 1 || options.limit > 100)) {
    errors.push('Limit must be between 1 and 100');
  }

  if (options.sortOrder && !['asc', 'desc'].includes(options.sortOrder)) {
    errors.push('Sort order must be either "asc" or "desc"');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

export function getSortOptions(validColumns: string[]): {
  [key: string]: string;
} {
  const sortMap: { [key: string]: string } = {};

  validColumns.forEach((column) => {
    sortMap[`${column}_asc`] = { [column]: 'asc' };
    sortMap[`${column}_desc`] = { [column]: 'desc' };
  });

  return sortMap;
}
