export class AppError extends Error {
  constructor(public statusCode: number, public code: string, message: string) { super(message); }
}
export const safeError = (error: unknown) => error instanceof AppError ? { code: error.code, message: error.message } : { code: 'INTERNAL_ERROR', message: '处理失败，请稍后重试' };
