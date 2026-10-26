// auth.ts lives at the package root, outside the `@/` (src) alias.
import { handlers } from "../../../../../auth";

export const { GET, POST } = handlers;
