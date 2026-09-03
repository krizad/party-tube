# ADR-002: Room Members List, Collaborative Seeker, Host Add Toast, and Played History

## Status
Accepted (Agreed via Grilling on 2026-09-03)

## Context
Following the initial PartyTube launch and i18n/typography refactoring, users requested four key interactive features:
1. Being able to see who is currently in the room.
2. Broadcast toast notification when Host adds a song.
3. Interactive playback seeker/scrubber like YouTube.
4. Complete history of previously played songs with 1-click replay.

## Decisions

### 1. Collaborative Playback Seeker (Q1 - Option B)
- Both **Host (TV)** and **Guests (Mobile)** can interactively scrub and seek video playback time.
- Implementation:
  - Host TV runs YouTube IFrame API and emits `player:time_update` at 1000ms intervals when playing.
  - Mobile clients render an interactive timeline scrubber showing `currentTime / duration`.
  - When a user (Host or Guest) seeks to a new timestamp, a `player:seek` event (`{ roomCode, time, by }`) is emitted to the server.
  - Server broadcasts `player:seek` to the room. The Host TV calls `player.seekTo(time, true)` to jump to that timestamp instantly.
  - To avoid socket flooding, seeking emits on slider commit (`onPointerUp` / `onChange`), not continuous dragging.

### 2. Host Song Attribution Toast (Q2 - Clarified by User)
- When a song is added to the queue:
  - If added by the Host (`addedBy: 'Host (TV)'` or role is host), the server broadcasts a distinct toast notification to all clients in the room:
    - TH: `👑 Host ได้เพิ่มเพลง "{title}" เข้าสู่คิวแล้ว`
    - EN: `👑 Host added "{title}" to the queue`
  - In the queue item card, the adder is cleanly displayed.

### 3. Room Members List Modal (Q3 - Option A)
- View-only members list modal accessible by clicking on the guest counter in the top header.
- Displays:
  - Active users currently connected via WebSocket.
  - Initial avatar with neon badge.
  - Nickname.
  - Role indicator (`Host` vs `Guest`).
- Updated automatically in real time as sockets connect and disconnect via `room:members` event.

### 4. Played Song History Tab with 1-Click Re-queue (Q4 - Option A)
- Dedicated "ประวัติเพลง (History)" tab next to the Live Queue on both Host TV and Guest Mobile.
- Stores and displays up to the 50 most recently finished tracks (`status: 'PLAYED'`).
- Each history card includes:
  - Song title, channel, duration, thumbnail.
  - Who requested it.
  - A 1-click **"เปิดอีกครั้ง (Re-queue)"** button that re-adds the song to the active queue.

## Consequences
- Enhanced social party interaction where guests can participate in seeking and see who is at the party.
- Seamless replaying of party favorite songs without having to search again.
