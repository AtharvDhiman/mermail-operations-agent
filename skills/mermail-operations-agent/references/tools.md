# Mermail Autonomous Operations Agent: Tools Reference

This document outlines official Mermail MCP tools invoked during autonomous operations execution.

## Mailbox & Ingestion Tools

### `list_mailboxes`
- **Purpose**: Discovers active agent mailboxes and permissions.
- **Parameters**: None.
- **Safety**: `SAFE` (Read-only).

### `list_emails`
- **Purpose**: Fetches messages from Mermail mailboxes with filtering (`isRead`, `sortColumn`, `limit`).
- **Parameters**: `mailboxId`, `query`.
- **Safety**: `SAFE` (Read-only).

### `get_email`
- **Purpose**: Retrieves full email body, metadata, and sanitized agent-safe content.
- **Parameters**: `emailId`.
- **Safety**: `SAFE` (Read-only).

### `get_email_context`
- **Purpose**: Retrieves chronological messages and metadata within a thread.
- **Parameters**: `emailId`.
- **Safety**: `SAFE` (Read-only).

## Drafting & Communication Tools

### `save_draft`
- **Purpose**: Saves contextual email drafts in the agent mailbox for human review or subsequent delivery.
- **Parameters**: `mailboxId`, `body: { to, subject, text }`.
- **Safety**: `SAFE` (Drafts do not transmit external communications).

### `reply_to_email`
- **Purpose**: Sends a response to an email thread.
- **Parameters**: `emailId`, `body: { text }`.
- **Safety**: `HIGH_RISK` (Requires operator dual-control sign-off when addressing external recipients).

### `send_email`
- **Purpose**: Initiates a new outbound email communication.
- **Parameters**: `body: { to, subject, text }`.
- **Safety**: `HIGH_RISK` (Requires operator dual-control sign-off).

### `schedule_email_send`
- **Purpose**: Queues an email for scheduled delivery at a future timestamp.
- **Parameters**: `mailboxId`, `sendAt`, `body: { to, subject, text }`.
- **Safety**: `HIGH_RISK` (Requires operator dual-control sign-off).

## Agent Wallet & PayBox Tools

### `get_paybox_connection`
- **Purpose**: Verifies agent wallet status and active delegated roles.
- **Parameters**: None.
- **Safety**: `SAFE` (Read-only).

### `paybox_get_portfolio`
- **Purpose**: Inspects multi-chain token balances (SOL, ETH, USDC).
- **Parameters**: None or `{ chain }`.
- **Safety**: `SAFE` (Read-only).

### `paybox_request_transfer`
- **Purpose**: Prepares token transfer on Solana or EVM chains.
- **Parameters**: `chain`, `token`, `amount`, `destinationAddress`.
- **Safety**: `HIGH_RISK` (Dual-control operator approval mandatory).

### `paybox_get_request`
- **Purpose**: Polls settlement status and extracts on-chain transaction hash.
- **Parameters**: `requestId`.
- **Safety**: `SAFE` (Read-only status check).
