export type Platform = "serviceforce" | "jiuqiu" | "sdi" | "spos" | "workflow";

export type Sop1ErrorCode =
  | "AUTH_REQUIRED"
  | "PLATFORM_REQUEST_FAILED"
  | "PLATFORM_RESPONSE_INVALID"
  | "DATA_NOT_FOUND"
  | "WORKFLOW_FAILED";

export class Sop1Error extends Error {
  constructor(
    public readonly code: Sop1ErrorCode,
    public readonly platform: Platform,
    public readonly step: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "Sop1Error";
  }
}

export function toSop1Error(error: unknown, step: string): Sop1Error {
  if (error instanceof Sop1Error) return error;
  const message = error instanceof Error ? error.message : String(error);
  return new Sop1Error("WORKFLOW_FAILED", "workflow", step, message);
}
