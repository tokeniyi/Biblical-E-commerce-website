import { Module } from "@nestjs/common";
import { PassportModule } from "@nestjs/passport";
import { AuthController } from "./auth.controller";
import { JwtStrategy } from "./jwt.strategy";

@Module({
  imports: [PassportModule.register({ defaultStrategy: "jwt" })],
  controllers: [AuthController],
  providers: [JwtStrategy],
  exports: [JwtStrategy, PassportModule],
})
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class AuthModule {}