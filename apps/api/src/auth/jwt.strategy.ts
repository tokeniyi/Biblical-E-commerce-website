import { Injectable } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { Strategy as PassportJwtStrategy, ExtractJwt } from "passport-jwt";
import { validateJwtPayload } from "./jwt-payload.schema";
import { AUTH_SECRET } from "../../infrastructure/config/env";
import type { AuthJwtPayload } from "@your-app/shared";

@Injectable()
export class JwtStrategy extends PassportStrategy(PassportJwtStrategy, "jwt") {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: AUTH_SECRET,
    });
  }

  validate(payload: unknown): AuthJwtPayload {
    return validateJwtPayload(payload);
  }
}