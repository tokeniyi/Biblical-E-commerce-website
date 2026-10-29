import { redirect } from "next/navigation";
import { safeReturnTo } from "@your-app/shared";
import { AuthFrame } from "@/components/account/AuthFrame";
import { RegisterForm } from "@/components/account/auth/RegisterForm";
import { StatusMessage } from "@/components/ui/StatusMessage";
import { ApiError } from "@/lib/api/client";
import { serverApi } from "@/lib/api/server";
import { first, type SearchParams } from "@/lib/search-params";

type Props = { searchParams: SearchParams };

/** O08 → A02: the guest order's email, read through this browser's order session only. */
async function orderEmail(orderId: string | undefined): Promise<string | null> {
  if (!orderId) return null;
  try {
    return (await (await serverApi()).orders.getConfirmation(orderId)).order.email;
  } catch (error) {
    if (error instanceof ApiError) return null;
    throw error;
  }
}

/** A02 Create your account: optional for guests; sign-up → A03, then the safe returnTo. */
export default async function RegisterPage({ searchParams }: Props) {
  const sp = await searchParams;
  const returnTo = safeReturnTo(first(sp.returnTo));
  const api = await serverApi();
  const { session } = await api.getSession();
  if (session.kind === "customer") redirect(returnTo);
  const prefill = await orderEmail(first(sp.order));

  return (
    <AuthFrame screen="A02" title="Create your account">
      <RegisterForm returnTo={returnTo} save={first(sp.save) ?? null} initialEmail={prefill ?? ""} />
      {prefill ? (
        <StatusMessage title="Your order is already placed">
          Account creation is never required to complete or track the purchase.
        </StatusMessage>
      ) : null}
    </AuthFrame>
  );
}
