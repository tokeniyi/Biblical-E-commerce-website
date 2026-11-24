"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { fulfilmentSteps, type Fulfilment } from "@/lib/catalog";
import { orderReference } from "@/lib/input";
import { advanceFulfilment } from "@/lib/orders";
import { isOwner, ownerEnabled, signIn, signOut } from "@/lib/owner";

export async function logIn(form: FormData) {
  const value = form.get("password");
  if (
    !ownerEnabled() ||
    typeof value !== "string" ||
    value.length > 512 ||
    !(await signIn(value))
  ) {
    redirect("/owner?error=login");
  }
  redirect("/owner");
}

export async function logOut() {
  await signOut();
  redirect("/owner");
}

export async function updateOrder(form: FormData) {
  if (!(await isOwner())) redirect("/owner");
  const reference = form.get("reference");
  const current = form.get("current") as Fulfilment;
  if (
    typeof reference === "string" &&
    orderReference.test(reference) &&
    fulfilmentSteps.includes(current)
  ) {
    await advanceFulfilment(reference, current);
    revalidatePath("/owner");
  }
}
