import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import type { AuthJwtPayload } from "@your-app/shared";

export const CurrentUser = createParamDecorator(
  (data: keyof AuthJwtPayload | undefined, ctx: ExecutionContext): AuthJwtPayload | AuthJwtPayload[keyof AuthJwtPayload] => {
    const request = ctx.switchToHttp().getRequest<{ user: AuthJwtPayload }>();
    const user = request.user;

    return data ? user[data] : user;
  },
);