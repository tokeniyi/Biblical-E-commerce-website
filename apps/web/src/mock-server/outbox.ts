// DELETE-ME-LATER: every "email" the mock server would send, shown in the
// Dev Inbox (/__dev/inbox) so A03, A05→A06 and O09 are testable.
import { nextId } from "./store";
import type { Db, OutboxMessage } from "./types";

export function sendEmail(
  db: Db,
  message: Omit<OutboxMessage, "id" | "sentAt">,
  sentAt: Date,
): OutboxMessage {
  const stored: OutboxMessage = { ...message, id: nextId(db, "msg"), sentAt: sentAt.toISOString() };
  db.outbox.unshift(stored);
  return stored;
}

export function listOutbox(db: Db): OutboxMessage[] {
  return db.outbox;
}
