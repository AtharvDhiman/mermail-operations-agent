# Tools

`mermail-relayer-sentinel` coordinates Mermail's hosted MCP tools across the Mailbox and PayBox Agent Wallet domains.

## Argument Conventions

- Pass structured arguments as **native JSON objects**. Never stringify an object into a string field such as `query`.
- Use the exact tool identifier exposed by the current host (e.g. `list_emails`, `paybox_request_transfer`, or host-qualified variants like `Mermail:list_emails`).
- Prefer mailbox `public_id` as `mailboxId` when list tools return it.
- For listing emails newest first, pass:
  ```json
  {
    "query": {
      "sortColumn": "date",
      "sortDirection": "DESC",
      "isRead": false
    }
  }
  ```
  Do not stringify: `"query": "{\"sortColumn\":\"date\"}"`.

## Orchestrated MCP Tools

| Tool | Domain | Purpose | Risk |
| --- | --- | --- | --- |
| `list_mailboxes` | Workspace | Discover active operations mailbox and resolve `public_id` | read |
| `list_emails` | Inbox | Search unread relayer alert emails matching monitoring filters | read |
| `get_email` | Inbox | Retrieve sanitized alert details via `agent_safe_content` | read |
| `get_email_context` | Inbox | Retrieve recent thread history for the alerting relayer | read |
| `get_paybox_connection` | Wallet | Verify active PayBox connectivity and delegation state | read |
| `paybox_get_portfolio` | Wallet | Read multi-chain treasury balances (SOL, USDC, ETH) | read |
| `paybox_request_swap` | Wallet | Swap treasury stablecoins (USDC) to native gas (SOL/ETH) | wallet-destructive |
| `paybox_request_transfer` | Wallet | Execute allowlisted gas transfer to relayer wallet | wallet-destructive |
| `paybox_get_request` | Wallet | Poll signing status and fetch on-chain transaction receipt | read |
| `save_draft` | Compose | Save immutable internal treasury audit log entry | write-preview |
| `reply_to_email` | Compose | Send official resolution receipt to alerting provider thread | external-effect |
| `prepare_destructive_action` | Infrastructure | Generate single-use confirmation token for administrative actions | read |

## PayBox Tool Notes

- `get_paybox_connection`: Always probe this once before attempting wallet operations. Active state returns `ACTIVE` with delegation details.
- `paybox_request_transfer`: Takes `destinationAddress`, `token`, `amount`, and `chain`. Returns `request_id` and `signing_handoff.console_url`.
- `paybox_request_swap`: Takes `fromToken`, `toToken`, `fromAmount`, and `chain`. Returns swap quote, expected output amount, and signing handoff.
- `paybox_get_request`: Reconciles transaction status (`pending_signature` -> `success` / `rejected` / `failed`).
