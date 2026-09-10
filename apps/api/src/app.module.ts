import { Module } from "@nestjs/common";
import { AuthModule } from "./auth/auth.module";

// Root module — only wires AuthModule; more modules get added as features land.
@Module({
  imports: [AuthModule],
})
export class AppModule {}