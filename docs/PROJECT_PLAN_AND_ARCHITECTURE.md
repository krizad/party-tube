PartyTube - MVP Project Plan & Technical Architecture Document

1. Executive Summary & Overview

Project Name: PartyTube

Goal: Build an interactive, real-time web application for party hosts and guests to collaboratively manage a YouTube music/karaoke queue.

Core Value Proposition: Eliminates the hassle of passing around a single remote/phone or sharing screen passwords. The host opens the player on a big screen/TV, guests scan a QR code on their phones, search songs, and add them to a shared live queue.

2. Core Functional Requirements (MVP Scope)

2.1 Host Player (Big Screen / TV)

Room Creation: One-click room creation with a unique 6-character Room Code and auto-generated QR Code.

Playback Engine: Embedded YouTube IFrame Player API with automated continuous playback.

Queue Display: Split-screen or sidebar view showing currently playing song with progress, and the upcoming queue list with "Added by" user badges.

Playback Controls: Host privileges for Play, Pause, Skip Track, Delete Track from queue, and Volume adjust.

Automatic Track Transition: When a video finishes (onEnded event), automatically pull and play the next song in the queue.

2.2 Guest Client (Mobile-First Web)

Seamless Join: Join via QR code scan or direct URL (/room/[roomId]) without mandatory authentication (just enter a nickname).

YouTube Search: Search bar connected to YouTube Data API v3 proxy on the backend, displaying thumbnail, title, channel name, and duration.

Add to Queue: Tap to add a song to the live party queue with immediate UI feedback.

Live Queue View: View the currently playing track and upcoming songs in real-time.

2.3 Real-time Synchronization Engine

Instant State Sync: Any song added, removed, or skipped is broadcasted in milliseconds to all connected clients in the room via WebSockets.

Optimistic UI: Fast, responsive UI on guest devices with error recovery if the server rejects an action.

3. System Architecture & Tech Stack

3.1 Finalized Tech Stack Confirmation

Frontend: Next.js (App Router), React, TypeScript, Tailwind CSS, Lucide React, Socket.io-client.

Backend: NestJS + Socket.io / WebSockets (Shared TypeScript types).

Database & ORM: MySQL 8.0 with Prisma ORM.

Testing: Jest (Unit/Integration), Playwright (Frontend E2E).

3.2 Database Schema (MySQL via Prisma)

model Room {

  id                   String         @id @default(uuid())

  code                 String         @unique

  hostToken            String

  title                String?

  status               String         @default("ACTIVE")

  currentQueueItemId   String?

  createdAt            DateTime       @default(now())

  updatedAt            DateTime       @updatedAt

  queueItems           QueueItem[]

  sessions             GuestSession[]

}

model QueueItem {

  id                String    @id @default(uuid())

  roomId            String

  room              Room      @relation(fields: [roomId], references: [id])

  videoId           String

  title             String

  thumbnailUrl      String

  channelTitle      String

  durationSeconds   Int

  addedBy           String

  status            Status    @default(PENDING)

  orderIndex        Int

  playedAt          DateTime?

  createdAt         DateTime  @default(now())

}

enum Status { PENDING; PLAYING; PLAYED; SKIPPED }

model GuestSession {

  id             String    @id @default(uuid())

  roomId         String

  room           Room      @relation(fields: [roomId], references: [id])

  socketId       String

  nickname       String

  ipHash         String

  joinedAt       DateTime  @default(now())

  lastActiveAt   DateTime  @updatedAt

}

3.3 Project Directory & Architecture

backend/

  src/

    rooms/      # Room management logic

    queue/      # Queue and playback state

    youtube/    # YouTube Data API proxy

    gateway/    # Socket.io WebSocket gateway

    common/     # Middleware, filters, Prisma service

frontend/

  app/          # Next.js App Router pages

  components/   # UI components (Atomic design)

  hooks/        # usePartySocket, useRoomState

  lib/          # API clients, utils

  types/        # Shared TypeScript interfaces

3.2 High-Level Architecture Diagram

+-------------------------------------------------------------------------+

|                              PartyTube Architecture                      |

|---|+-------------------------------------------------------------------------+

       |                                                 |

       v                                                 v

 [Host Screen (TV/Laptop)]                     [Guest Mobile Clients]

  - Next.js Web App                             - Next.js Web App

  - YouTube IFrame Player                       - Search UI & Queue List

  - QR Code Display                             - Nickname Session

       |                                                 |

       +--------------------+     +---------------------+

                            |     |

                 (HTTP & WebSocket Connection)

                            |     |

                            v     v

                  +-------------------------+

                  |  PartyTube Backend API  |

                  |  (NestJS / Go-Gin)      |

                  +-------------------------+

                     |         |         |

      +--------------+         |         +---------------+

      |                        |                         |

      v                        v                         v

[Room & Queue Hub]      [YouTube API Proxy]     [In-Memory / Redis]

 - WS Event Dispatcher   - Query Caching         - Active Rooms

 - Client Rooms Mapping  - Quota Optimization    - Song Queues

                               |

                               v

                    [YouTube Data API v3]

4. Data Flow & Event Lifecycle

4.1 Room Creation & Host Setup

User clicks "Create Room" on landing page.

Frontend sends POST /api/rooms to Backend.

Backend creates room entity in memory (roomId, hostToken, queue: [], status: "active").

Host is redirected to /host/[roomId]?token=..., establishes WebSocket connection, joins room channel room:{roomId}, and renders the QR Code and YouTube Player.

4.2 Guest Join & Handshake

Guest scans QR code -> Navigates to /room/[roomId].

Guest enters Nickname -> Submits form.

Frontend opens WebSocket connection -> Sends JOIN_ROOM event { roomId, nickname, role: "guest" }.

Backend registers client to room and replies with INITIAL_STATE payload (current track, queue list, room settings).

4.3 YouTube Search & Quota-Free Strategy

Quota Limitations: Relying solely on YouTube Data API v3 is problematic as each search costs 100 units, hitting the 10,000 daily limit after only 100 searches.

Implementation Strategy: Use youtube-sr / ytsr (InnerTube parser) on the NestJS backend to fetch live search results with zero quota usage.

Direct URL Parser: Support for youtu.be, youtube.com/watch?v=, and youtube.com/shorts/ to resolve video IDs immediately.

4.3.1 YouTube Service Implementation (youtube.service.ts)

@Injectable()

export class YoutubeService {

  async search(query: string) {

    if (this.isYoutubeUrl(query)) {

      return this.resolveVideoById(this.extractId(query));

    }

    return YouTube.search(query, { type: "video", limit: 10 }); // youtube-sr

  }

}

4.3.2 Frontend Search UI Updates

Auto-Detect Logic: The Next.js search bar detects if the input is a URL to trigger direct resolution, otherwise it debounces and executes a keyword search.

4.4 Queue Addition & Real-time Broadcast

Guest clicks "Add to Queue" on a video.

Guest sends WS event QUEUE_ADD with track metadata (videoId, title, thumbnailUrl, channelTitle, duration, addedBy).

Backend validates room status, generates unique queueItemId, and pushes to the room's queue.

Backend broadcasts QUEUE_UPDATED event to all sockets in room:{roomId}.

If the Host player is currently idle and the queue was empty, the backend sets currentTrack to the new song and broadcasts TRACK_PLAY to the Host.

4.5 Auto-playback & Track Transition

Host YouTube IFrame Player emits onStateChange with value 0 (YT.PlayerState.ENDED).

Host emits TRACK_ENDED event to backend via WebSocket.

Backend pops next track from queue, updates currentTrack, and broadcasts TRACK_PLAY + QUEUE_UPDATED to all room members.

Host player immediately loads the new videoId and resumes playback.

5. WebSocket Event & Data Schema Specification

5.1 Client to Server Events

Event Name

Payload Structure

Description

room:join

{ roomId: string, nickname: string, role: 'host' | 'guest', hostToken?: string }

Initial connection handshake.

queue:add

{ videoId: string, title: string, thumbnail: string, duration: string, addedBy: string }

Request to add a new song.

queue:remove

{ queueItemId: string }

Remove specific item (Host/Submitter only).

queue:reorder

{ sourceIndex: number, destinationIndex: number }

Change queue order (Host only).

player:state_change

{ state: 'playing' | 'paused' | 'ended', currentTime: number }

Sync playback status from Host.

player:skip

{}

Trigger next track immediately.

5.2 Server to Client Events

Event Name

Payload Structure

Description

room:state

{ roomId, currentTrack, queue, guestCount, isPlaying }

Full room snapshot on join.

queue:updated

[ { queueItemId, videoId, title, thumbnail, duration, addedBy, addedAt } ]

Broadcasted on queue changes.

track:now_playing

{ track: TrackItem | null, startedAt: number }

Instructs Host to play specific track.

error:message

{ code: string, message: string }

Error notifications for clients.

6. AI-Ready Task Breakdown & Specifications

Phase 1: Database & NestJS Backend

Task BE-01 (Prisma Setup): Initialize NestJS with Prisma and MySQL. Prompt: "Generate a Prisma schema for PartyTube with Room, QueueItem, and GuestSession models per spec." Criteria: Prisma client generated; migrations run successfully.

Task BE-02 (Queue Logic): Implement QueueService. Prompt: "Create a NestJS service for FIFO queue management including reorder and duplicate checks." Criteria: Passes unit tests for ordering logic.

BE-03: Room Management Service (Create Room, Room Expiry, In-memory state).

BE-04: Queue Engine Service (FIFO Queue, Add, Remove, Reorder, Next-track transition).

BE-05: YouTube Data API Proxy with In-Memory LRU Caching & Quota Limiter.

BE-06: Host Authentication & Permission Guard (Host Token validation for control actions).

Phase 2: Next.js Frontend & Real-time Gateway

Task FE-01 (Socket Hooks): React hooks for real-time sync. Prompt: "Create a usePartySocket hook using Socket.io-client to sync room state." Criteria: Successful state update on event receipt.

FE-02: WebSocket Client Provider & Custom React Hooks (usePartySocket, useRoomState).

FE-03: Landing Page & Room Creation / QR Join Flow.

FE-04: Host View: YouTube IFrame Player wrapper with automated playback handler.

FE-05: Host View: Big-screen UI, Room Code & QR Code display, Live Queue Sidebar.

FE-06: Guest View: Mobile Search Interface with debounced YouTube query & quick Add button.

FE-07: Guest View: Live Queue Tab showing current playing song, Up Next list, and added songs.

FE-08: Toast Notifications & Optimistic Queue Feedback.

6.3 API Integration & Testing

INT-01: YouTube Data API Key configuration and fallback mocks for local development.

INT-02: Multi-client Real-time Synchronization Load Test (1 Host + 10 Simulated Guests).

INT-03: Edge-case handling (Video deleted/unembeddable fallback, Host network disconnect recovery).

INT-04: Production Build & Deployment Setup (Vercel for Frontend, Railway / Fly.io / Render for Backend).

7. Comprehensive Test Plan & Test Suites

Unit Testing (Jest): Tests for QueueService (FIFO, reorder, auto-next, duplicate checks) and YouTubeService (caching, quota fallback).

Integration & E2E Testing: NestJS + Prisma Test Containers for DB integration. WebSocket E2E for room join and queue sync.

Frontend E2E (Playwright): Host creates room -> Guest scans/joins -> Guest adds song -> Host starts playback.