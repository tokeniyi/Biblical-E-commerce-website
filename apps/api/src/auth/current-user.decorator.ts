import { createParamDecorator } from "@nestjs/common";
import type { AuthJwtPayload } from "@your-app/shared";

export const CurrentUser = createParamDecorator(
  (data: keyof AuthJwtPayload | undefined, ctx): AuthJwtPayload | unknown => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user as AuthJwtPayload | undefined;

    if (!user) {
      return undefined;
    }

    return data ? user[data] : user;
  },
);
