import { AuthFrame } from "@/components/account/AuthFrame";
import { ResetLinkInvalid, ResetPasswordForm } from "@/components/account/auth/PasswordReset";
import { NetworkError } from "@/components/storefront/NetworkError";
import { ApiError } from "@/lib/api/client";
import { serverApi } from "@/lib/api/server";
import { first, type SearchParams } from "@/lib/search-params";

/** The server checks the token before any field is enabled (E10 otherwise). */
async function tokenState(token: string | undefined): Promise<"valid" | "invalid" | "offline"> {
  if (!token) return "invalid";
  try {
    await (await serverApi()).auth.checkResetToken(token);
    return "valid";
  } catch (error) {
    if (error instanceof ApiError && error.code === "network_error") return "offline";
    if (error instanceof ApiError) return "invalid";
    throw error;
  }
}

/** A06 Set a new password: valid, success and expired (E10) variants. */
export default async function ResetPasswordPage({ searchParams }: { searchParams: SearchParams }) {
  const token = first((await searchParams).token);
  const state = await tokenState(token);
  return (
    <AuthFrame screen="A06" title="Set a new password" aside={null}>
      {state === "offline" ? (
        <NetworkError />
      ) : state === "valid" && token ? (
        <ResetPasswordForm token={token} />
      ) : (
        <ResetLinkInvalid />
      )}
    </AuthFrame>
  );
}
