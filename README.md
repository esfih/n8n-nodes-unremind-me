# n8n-nodes-unremind-me

n8n community node for **[UnRemind.me](https://unremind.me)** — context-aware
reminders that surface when your *situation* matches (place, device,
connectivity, who's around, time and energy available), instead of firing at a
fixed time.

## Operations

| | |
|---|---|
| **Create Unreminder** | Submits one for the account owner to approve — it lands in their "Submitted to you" queue, never straight into their list |
| **List Unreminders** | Their own Unreminders, soonest due first |
| **Complete Unreminder** | Mark one done |
| **Suggest Next Task** | Given the minutes available, rank what is actually worth doing now |
| **List Context Tags** | Every valid tag, grouped — call this before inventing one |

## Credentials

Generate an access token in the UnRemind.me app under **Settings → AI agents →
MCP access**, and paste it into the *UnRemind.me API* credential.

Each token is a separate agent with its own access rights and its own audit
log, and can be revoked without affecting the others — so an n8n workflow gets
a token of its own rather than sharing one.

## Notes

- **Create is a submission, not a write.** Anything arriving from outside the
  account goes through the owner's approval, by design. Your workflow gets the
  submission back; the Unreminder appears once they accept it.
- **Context tags describe what a task REQUIRES** to be doable (a device,
  connectivity, an amount of time) — never what you happen to have now.
- **Creates are idempotent per execution item**, so an n8n retry or re-run
  cannot produce duplicates.
- **Plan limits surface as an actionable message**, not an opaque failure:
  free accounts hold 10 Unreminders, Solo 100.

Under the hood the node speaks JSON-RPC to UnRemind.me's MCP endpoint, so it
inherits the same auth, validation, quota and approval gate as every other
client.

## Install

n8n **Settings → Community nodes → Install** → `n8n-nodes-unremind-me`

## Links

[UnRemind.me](https://unremind.me) · [MCP setup](https://unremind.me/mcp/) ·
[Support](mailto:support@unremind.me)

## License

[MIT](LICENSE)
