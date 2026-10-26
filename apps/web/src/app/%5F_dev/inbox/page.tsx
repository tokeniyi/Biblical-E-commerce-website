import { serverApi } from "@/lib/api/server";

/**
 * Dev Inbox (spec §7.2): every email the mock server "sent". Nothing sends
 * mail until Phase 3 (verification, reset) and Phase 4 (guest codes).
 */
export default async function InboxPage() {
  const { messages } = await (await serverApi()).dev.getInbox();

  return (
    <>
      <h1 className="text-[28px] font-semibold text-ink">Dev Inbox ({messages.length})</h1>
      {messages.length === 0 ? (
        <p className="border border-line bg-panel p-4 text-sm">No messages yet.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {messages.map((m) => (
            <li key={m.id} data-testid="inbox-message" className="border border-line p-4 text-sm">
              <p className="font-semibold">{m.subject}</p>
              <p className="text-muted">
                To {m.to} · {m.kind} · {m.sentAt}
              </p>
              <p className="mt-2 whitespace-pre-wrap">{m.body}</p>
              {m.code ? (
                <p className="mt-2">
                  Code: <span className="font-mono text-base">{m.code}</span>
                </p>
              ) : null}
              {m.link ? (
                <p className="mt-2">
                  <a href={m.link} className="underline">
                    {m.link}
                  </a>
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
