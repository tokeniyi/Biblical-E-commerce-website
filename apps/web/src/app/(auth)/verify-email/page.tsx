import { AuthFrame } from "@/components/account/AuthFrame";
import { VerificationPending, VerifiedSuccess, VerifyEmailLink } from "@/components/account/auth/VerifyEmail";
import { NetworkError } from "@/components/storefront/NetworkError";
import { ApiError } from "@/lib/api/client";
import { serverApi } from "@/lib/api/server";
import { first, type SearchParams } from "@/lib/search-params";

type Props = { searchParams: SearchParams };

async function loadStatus() {
  try {
    return await (await serverApi()).auth.verificationStatus();
  } catch (error) {
    if (error instanceof ApiError && error.code === "network_error") return null;
    throw error;
  }
}

/**
 * A03 Verify your email. With `?token=` it opens the emailed link (single
 * use; verified or expired variant). Without one it is the pending variant
 * for the address that is waiting. Verification never blocks guest checkout.
 */
export default async function VerifyEmailPage({ searchParams }: Props) {
  const token = first((await searchParams).token);
  if (token) {
    return (
      <AuthFrame screen="A03" title="Verify your email">
        <VerifyEmailLink token={token} />
      </AuthFrame>
    );
  }
  const status = await loadStatus();
  const { session } = await (await serverApi()).getSession();
  return (
    <AuthFrame screen="A03" title="Verify your email">
      {!status ? (
        <NetworkError />
      ) : status.verified ? (
        <VerifiedSuccess returnTo="/account" />
      ) : (
        <VerificationPending email={status.email} signedIn={session.kind === "customer"} />
      )}
    </AuthFrame>
  );
}
