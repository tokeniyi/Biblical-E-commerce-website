import { Controller, Get, UseGuards } from "@nestjs/common";
import { CurrentUser } from "./current-user.decorator";
import { JwtAuthGuard } from "./jwt-auth.guard";
import type { AuthJwtPayload } from "@your-app/shared";

@Controller("auth")
export class AuthController {
  @Get("me")
  @UseGuards(JwtAuthGuard)
  getMe(@CurrentUser() user: AuthJwtPayload) {
    return {
      sub: user.sub,
      email: user.email,
      name: user.name,
    };
  }
}