import { ZodIssue } from "zod";

export function parseZodIssue(issues: ZodIssue[]) {
  return Object.fromEntries(
    issues.map((issue) => {
      return [issue.path.join("."), issue];
    })
  );
}
