import { createParamDecorator } from "@nestjs/common";
import type { AuthJwtPayload } from "@your-app/shared";

export const CurrentUser = createParamDecorator(
  (data: keyof AuthJwtPayload | undefined, ctx): unknown => {
    const request = ctx.switchToHttp().getRequest<{ user?: AuthJwtPayload }>();
    const user = request.user;

    if (!user) {
      return undefined;
    }

    return data ? user[data] : user;
  },
);
