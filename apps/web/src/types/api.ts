export type ApiResponse<T> = {
  data: T;
  total?: number;
  page?: number;
  pageSize?: number;
};

export type ApiError = {
  code: string;
  message: string;
  details?: Record<string, unknown>;
};
