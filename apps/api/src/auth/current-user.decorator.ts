import { createParamDecorator } from "@nestjs/common";
import type { AuthJwtPayload } from "@your-app/shared";

// @CurrentUser() resolves to the validated AuthJwtPayload on the request.
// @CurrentUser("email") resolves to a single field — kept for future use.
export const CurrentUser = createParamDecorator(
  (data: keyof AuthJwtPayload | undefined, ctx): AuthJwtPayload | AuthJwtPayload[keyof AuthJwtPayload] | undefined => {
    const request = ctx.switchToHttp().getRequest() as { user?: AuthJwtPayload };
    const user = request.user;

    if (!user) {
      return undefined;
    }

    return data ? user[data] : user;
  },
);