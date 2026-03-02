export type ActionResult<T> =
  | {
      data: T
      error: null
    }
  | {
      data: null
      error: AppError
    }

export type AppError = {
  error: string
  code: string
  metadata?: Record<string, unknown>
}
