# ìbáṣọ̀rọ̀ — chat app (frontend)

React 18 + Vite + Tailwind. Talks to the `ibasoro-backend` API (REST + Socket.IO).

```bash
cp .env.example .env     # VITE_API_URL=http://localhost:5000
npm install
npm run dev              # http://localhost:5173
npm test                 # 40 unit/component tests (vitest)
npm run lint
npm run build            # PWA-enabled production build in dist/
```

## Structure

```
src/
  main.jsx, App.jsx      providers + routes (auth screens are lazy-loaded)
  routes/                route-level pieces: layout, guards, 404
  features/
    auth/                login, signup, avatar picker, form validation
    chat/                sidebar, list, conversation, composer, dialogs, API wrappers
  components/ui/         the design-system kit: Button, IconButton, Input, Dialog, Menu,
                         Avatar, Toast, Switch, SegmentedControl, Skeleton, EmptyState…
    chat/message/        bubble content (photo, voice, file), reactions, reply quote, action menu, lightbox
  context/               Auth, Theme, Chat (socket + store) and the pure chatReducer
  lib/                   api, socket, format, chat helpers, storage, sound (no React)
  hooks/                 useDebounce, useMediaQuery, useVoiceRecorder
  styles/index.css       design tokens (light + dark) and global rules
```

Rules of thumb: components render, `lib/` and `chatReducer` hold the logic (and are the most tested), and `features/*` own everything feature-specific. Reach for `components/ui` before writing a new control.

## Design system

- **Tokens, not hex codes.** Colours are CSS variables (`--c-accent`, `--c-surface`…) in `styles/index.css`, mapped to Tailwind (`bg-surface`, `text-ink-2`, `bg-accent/10`). Dark mode is a variable swap under `[data-theme="dark"]`; there are no `dark:` variants to maintain.
- **Theme:** Auto / Light / Dark (Settings, or the toggle in the header). An inline script in `index.html` applies it before first paint, so there is no flash. Transitions are suspended for the instant of a switch.
- **Type scale** follows Apple's text styles (`text-title1 … text-caption`); body text is 16 px so iOS never zooms into inputs.
- **Touch targets** are ≥ 44 px (`IconButton` extends its hit area invisibly). Safe-area insets are respected, the layout uses `dvh`, and modals are bottom sheets on phones.
- **Motion** is purposeful and short: a strong ease-out for entrances and presses (`.press` → `scale(.97)`), an iOS-style curve for sheets, exits faster than entrances, popovers scale from the corner they came from, and `prefers-reduced-motion` removes movement.
- **Accessibility:** native `<dialog>` (focus trap, Escape, inert background), labelled icon buttons, `aria-live` for status, visible focus rings.

## Real-time model

`ChatContext` owns one authenticated socket and a reducer. Sending is optimistic: the bubble appears instantly (`sending` → `failed` with Retry/Delete); the server echoes your `clientId` so the bubble is swapped in place, never duplicated. Unread counts, read receipts, presence and typing all flow through `chatReducer`, which is pure and unit-tested.

## Messages: replies, reactions, attachments, voice

- **Message actions** live in `features/chat/message/`: a hover toolbar and right-click menu on desktop, long-press (menu) and swipe-right (reply) on touch. `MessageActionsContext` hands stable callbacks to memoised bubbles, so the composer re-rendering never re-renders the transcript.
- **Edits, deletes and reactions are optimistic** and roll back with a toast if the server refuses. The server replaces the whole message on `message:updated`; `chatReducer` swaps it wholesale because a delete removes fields.
- **Attachments** upload straight to Cloudinary (`lib/upload.js`, signed by the API when `CLOUDINARY_*` is set, otherwise the old unsigned preset) with real progress. `ChatContext` keeps the `File` in an outbox so a failed send can be retried without re-picking; photos over ~1.5 MB are downscaled in the browser first (`lib/media.js`).
- **Voice notes** record with `MediaRecorder` (`hooks/useVoiceRecorder.js`); the waveform is sampled while recording and stored with the message. Playback asks Cloudinary for an `.mp3` of the clip so it plays everywhere, and only one clip plays at a time.
- **Search** (`SearchResults.jsx`) matches chats locally and messages on the server; a result opens `/chat/:id?m=<messageId>`, which loads the page of history around it and highlights the message.
- **Push** (`lib/push.js`, `public/push-sw.js`) is opt-in from Settings. The service worker stays quiet while the app is visible. iPhones only allow Web Push once the app is added to the Home Screen.

## Discover

*New message* opens with suggestions instead of an empty box (`DiscoverFeed.jsx`): people from your groups you haven't messaged, newcomers, and an invite card (Web Share, or copies the link). **Say hi** opens the chat and sends a 👋. Typing swaps the feed for search results. Discovery never shows emails, and Settings → *Show me in Discover* lets anyone opt out of the newcomers list.

See the backend repo's `docs/ROADMAP.md` for what to build next (calls, …).
