import { Module } from "@nestjs/common";
import { AuthModule } from "./auth/auth.module";

@Module({
  imports: [AuthModule],
})
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class AppModule {}