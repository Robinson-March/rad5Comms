# Message Formatting Backend Contract

This chat UI now treats message text as a limited Markdown document. The backend should preserve that text exactly and avoid converting it into HTML before returning it to clients.

## Supported formatting

The current frontend supports this Markdown subset:

- `**bold**`
- `_italic_`
- `[label](https://example.com)`
- `- bullet list`
- `` `inline code` ``
- fenced code blocks with triple backticks
- normal line breaks between paragraphs

Anything outside this subset should still be stored safely as plain text, but the backend should not promise richer formatting unless the frontend is updated to support it.

## What the backend should do

1. Accept raw Markdown in the message `text` field.
2. Store `text` exactly as submitted, except for normalizing line endings to `\n`.
3. Return the same raw `text` on create, fetch, edit, sync, reply, forward, and audit endpoints.
4. Keep reply previews based on the raw text, plus an optional plain-text preview for truncated UI surfaces.
5. Build search indexes from a normalized plain-text version of the message so searches still match formatted content.
6. Reject or strip dangerous raw HTML if a client sends it. Do not render or persist trusted HTML as the display format.
7. Validate links if you do backend enrichment. Allow only safe protocols such as `http`, `https`, `mailto`, and `tel`.

## What the backend should not do

- Do not convert Markdown to HTML and send HTML in `text`.
- Do not escape Markdown characters like `*`, `_`, `[`, `]`, or backticks before storage.
- Do not trim internal whitespace in a way that changes formatting intent.
- Do not generate different text shapes for list/search/edit endpoints.

## Recommended payload shape

```json
{
  "id": "msg_123",
  "text": "**Daily update**\n- API deployed\n- Search fixed",
  "textPreview": "Daily update API deployed Search fixed",
  "format": "markdown",
  "createdAt": "2026-03-17T12:00:00.000Z",
  "updatedAt": "2026-03-17T12:00:00.000Z"
}
```

## Plain-text indexing guidance

When building `textPreview`, notifications, or search indexes:

1. Normalize line endings to `\n`.
2. Strip Markdown markers while keeping readable words.
3. Collapse repeated whitespace to single spaces for the index only.
4. Keep the original `text` untouched for the main API response.

## Edit flow requirement

Edits must round-trip cleanly:

1. Client sends raw Markdown text.
2. Backend stores the updated raw Markdown.
3. Backend returns the updated raw Markdown in the response.
4. Other clients receive the same raw Markdown through realtime events.

If the backend keeps this contract, the frontend formatter will stay predictable and the same message will render consistently across chat, search, reply previews, and admin audit views.
