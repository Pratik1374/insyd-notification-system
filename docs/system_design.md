# System Design Document: Insyd Notification System POC

## Components

The Insyd Notification System Proof-of-Concept (POC) is built to demonstrate real-time notifications for a social platform, comprising a frontend client, backend server, database, job queue, and WebSocket server.

### Frontend

- **Technology**: React.js, TypeScript, and Tailwind CSS.

- **Functionality**:

  - Features three panels for hardcoded users, Alice (`u1`), Bob (`u2`), and John (`u3`), simulating their individual app dashboards on a single page.
  - Each panel includes event trigger buttons:
    - "Post Blog" generates an event sent to all other users (e.g., Alice's post notifies Bob and John).
      > **Note**: In the actual application (beyond POC), this notification would only go to users who follow Alice. The current implementation sends it to all users _except the actor_ for simplicity in the demo.
    - "Follow [User]" and "Comment on [User]'s Post" buttons for each other user (e.g., Alice's panel has buttons for "Follow Bob," "Comment on Bob's Post," "Follow John," and "Comment on John's Post").
    - Real-time notification feed displays notifications for the respective user.
  - Sends `POST /event` requests for user actions and fetches historical notifications via `GET /notifications/:user_id`.
  - Maintains WebSocket connections for real-time notification updates.
  - Each notification has a **read** state, and users can click a "Mark Read" button to mark it as read. The frontend uses:
    1.  `GET /notifications/:user_id` to load existing notifications (each with `isRead` and `seenAt` fields).
    2.  A WebSocket listener that wraps incoming messages into unread notifications (`isRead = false`, `seenAt = null`).
    3.  A helper `PATCH /notifications/:id/read` to mark any notification as read, updating its `isRead` → `true` and `seenAt` → timestamp.

- **Deployment**: Hosted at `https://insyd-notification-system.vercel.app`.

- **Key Details**:

  - A simulation note at the top of the UI explains the POC's setup, guiding evaluators on the three-panel design and button functionality for interactions among Alice, Bob, and John.
  - Uses `fetch` for direct API calls to the backend and WebSocket for real-time communication.

### Backend

- **Technology**: Express.js with TypeScript.

- **Functionality**:

  - Manages event creation (`POST /event`), notification retrieval (`GET /notifications/:user_id`), marking as read (`PATCH /notifications/:notification_id/read`), and WebSocket broadcasting.
  - Processes events asynchronously via a job queue (BullMQ + Redis).
  - Integrates with PostgreSQL for data persistence and Redis for queue management.

- **Key Details**:

  - Configured with CORS to allow requests from the frontend.
  - Routes include:
    - **`POST /event`**: Create a new event (type, `actorId`, `targetId`, optional payload).
    - **`GET /notifications/:user_id`**: Return up to 50 of that user's notifications, each with `(id, userId, eventId, message, createdAt, isRead, seenAt)`.
    - **`PATCH /notifications/:notification_id/read`**: Mark one notification as read (sets `isRead = true` and `seenAt = NOW()`).
  - Environment variables configure database, queue, and port settings.

> **Follow/Unfollow Logic**: The POC does not prevent duplicate follow events or handle unfollow actions. These behaviors are expected to be handled by the user relationship service. The Notification System consumes events as-is and is intentionally kept decoupled from business logic validations like deduplication or relationship checks.

### Database

- **Technology**: PostgreSQL.

- **Schema**:

  - **`users`**: Stores user data (`id`, `name`).

    ```
    CREATE TABLE users (
      id   VARCHAR(50) NOT NULL PRIMARY KEY,
      name VARCHAR(100) NOT NULL
    );

    ```

    - **Note**: The POC includes three hardcoded users: Alice (`u1`), Bob (`u2`), and John (`u3`). Ensure the `users` table is populated with these entries:

      ```
      INSERT INTO users (id, name) VALUES
        ('u1', 'Alice'),
        ('u2', 'Bob'),
        ('u3', 'John');

      ```

  - **`events`**: Records events (`id`, `type`, `actor_id`, `target_id`, `payload`, `created_at`).

    ```
    CREATE TABLE events (
      id         SERIAL       PRIMARY KEY,
      type       VARCHAR(50)  NOT NULL,
      actor_id   VARCHAR(50)  NOT NULL REFERENCES users(id),
      target_id  VARCHAR(50)  NOT NULL REFERENCES users(id),
      payload    JSONB DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    ```

  - **`notifications`**: Stores notifications (`id`, `user_id`, `event_id`, `message`, `created_at`, `read`, `seen_at`).

    ```
    CREATE TABLE notifications (
      id         SERIAL        PRIMARY KEY,
      user_id    VARCHAR(50)   NOT NULL REFERENCES users(id),
      event_id   INTEGER       NOT NULL REFERENCES events(id),
      message    TEXT          NOT NULL,
      created_at TIMESTAMPTZ   DEFAULT NOW(),
      "read"     BOOLEAN       NOT NULL DEFAULT FALSE,
      seen_at    TIMESTAMPTZ   NULL
    );

    ```

    - **`read`** (`BOOLEAN NOT NULL DEFAULT FALSE`): Whether the user has marked this notification as read.
    - **`seen_at`** (`TIMESTAMPTZ NULL`): Timestamp when the user clicked "Mark Read." Remains `NULL` while unread.

- **Purpose**: Stores events and notifications, with foreign keys linking notifications to events and users. The new `read` and `seen_at` columns enable **read/unread** tracking.

- **Indexes**: Recommended for performance:

  ```
  -- Quickly fetch newest notifications for a user
  CREATE INDEX idx_notifications_user_createdat
    ON notifications(user_id, created_at DESC);

  -- For "show only unread" and fetch‐by‐date
  CREATE INDEX idx_notifications_user_read_createdat
    ON notifications(user_id, "read", created_at DESC);

  ```

### Job Queue

- **Technology**: BullMQ with Redis.

- **Purpose**: Handles event processing asynchronously to generate notifications, ensuring efficient decoupling.

- **Details**:

  1.  An event (e.g., "follow," "post," "comment") is enqueued as `{ eventId, targetId }`.
  2.  The worker fetches the event row, builds a message string, and inserts into `notifications` with `read = false`.
  3.  Once inserted, the worker broadcasts via WebSocket to the target user.

### WebSocket

- **Technology**: `ws` library.

- **Purpose**: Enables real-time notification delivery to the frontend.

- **Details**:

  1.  Clients connect with a `{ userId: "u1" }` handshake (no real auth in POC).
  2.  On new notification insertion, the worker calls `sendToUser(userId, payload)`.
  3.  The server keeps an in-memory `Map<string, Set<WebSocket>>` mapping each `userId` to all open socket connections.
      > This design supports scenarios where the same user may be logged in from multiple devices or browsers (e.g., one tab in normal mode and one in incognito). All active sessions for that user will receive real-time notifications.
  4.  When scaled horizontally, this would be updated to use Redis Pub/Sub so that all nodes can broadcast to any user's connections.
  5.  Each incoming WS message (the first message) must be:

      ```
      {
        "userId": "u1"
      }

      ```

  6.  The client re-renders the notification feed in real time as new payloads arrive.

### Flow of Execution

#### Event Trigger

1.  A user clicks a button (e.g., "Follow Alice" in Bob's panel).
2.  The frontend sends:

    ```
    POST /event
    Content-Type: application/json

    {
      "type": "follow",
      "actorId": "u2",
      "targetId": "u1"
    }

    ```

#### Event Storage & Queue

1.  The backend validates inputs and inserts a new row into `events(type, actor_id, target_id, payload)`.
2.  Retrieves the generated `eventId`.
3.  Enqueues a BullMQ job in `notificationQueue` with:

    ```
    { "eventId": eventId, "targetId": "u1" }

    ```

    > **Note**: While not implemented in this POC, batching and proper fan-out mechanisms are essential when supporting a large user base to ensure scalability, reduce processing time, and avoid overwhelming the queue and database.

#### Notification Processing (Worker)

1.  The worker picks up the job `{ eventId, targetId }`.
2.  Queries `events` to get `(type, actor_id)`; then queries `users` to get `actorName`.
3.  Builds a message string:
    - `"Bob started following you."` for `type = "follow"`.
    - `"Bob published a new post."` for `type = "post"`.
    - `"Bob commented on your post."` for `type = "comment"`.
4.  Inserts into `notifications(user_id, event_id, message, "read") VALUES ($1, $2, $3, FALSE)`; returns `id, created_at`.
5.  Broadcasts the payload over WebSocket:

    ```
    {
      "id": <notificationId>,
      "userId": "u1",
      "eventId": <eventId>,
      "message": "<constructed message>",
      "createdAt": "<timestamp>"
    }

    ```

6.  The client adds it to the top of the notifications feed.

#### Historical Retrieval

1.  On page load, the frontend calls:

    ```
    GET /notifications/:userId

    ```

2.  Backend executes:

    ```
    SELECT
      id,
      user_id    AS "userId",
      event_id   AS "eventId",
      message,
      created_at AS "createdAt",
      "read"     AS "isRead",
      seen_at    AS "seenAt"
    FROM notifications
    WHERE user_id = $1
    ORDER BY created_at DESC
    LIMIT 50;

    ```

3.  The client receives an array of notifications (newest‐first).

#### Marking a Notification as Read

1.  When a user clicks "Mark Read" on an unread item (where `isRead = false`), the frontend calls:

    ```
    PATCH /notifications/:notificationId/read

    ```

2.  Backend executes:

    ```
    UPDATE notifications
    SET "read" = TRUE,
        seen_at = NOW()
    WHERE id = $1
    RETURNING
      id,
      user_id    AS "userId",
      event_id   AS "eventId",
      message,
      created_at AS "createdAt",
      "read"     AS "isRead",
      seen_at    AS "seenAt";

    ```

3.  On success, the backend returns the updated notification object. The frontend replaces that item in its local state with the new `isRead: true` and `seenAt: "<timestamp>"`.

## Scale Considerations

- **Current Capacity**: Supports 100 daily active users (DAUs) with a single PostgreSQL instance, Redis instance, and one Express + WebSocket server.

- **Scaling to 1M DAUs**:

  1.  **Database**:
      - Shard the `notifications` table by hashing `user_id` (e.g., range or consistent hash).
      - Provision read replicas for handling high-volume `GET /notifications/:userId` reads.
      - Use partitioning by date or `user_id` to keep each table smaller.
  2.  **Queue**:
      - Move to a Redis Cluster to horizontally scale BullMQ's job throughput.
      - Run multiple BullMQ worker processes (on distinct machines or containers) to process jobs in parallel.
  3.  **WebSocket**:
      - Replace the in-memory `Map<userId, Set<Socket>>` with a Redis Pub/Sub channel per user (e.g., `channel:notifications:user:<userId>`). Each Express/WS node subscribes and fans out to its local sockets.
      - Run multiple Express/WS instances behind a load balancer (AWS ALB, NGINX).
  4.  **Backend**:
      - Horizontal scale: spin up multiple Express pods/containers; use a stateless pattern (no local memory dependency for job processing).
      - Cache the 50 most recent notifications for each `user_id` in Redis, invalidating on new insertion or when read is updated.
  5.  **Indexing**:
      - Keep `(user_id, created_at DESC)` for "fetch latest."
      - Keep `(user_id, "read", created_at DESC)` to fetch unread first (e.g., "show me my unread count").
  6.  **Monitoring**:
      - Add Prometheus metrics for:
        - Queue length (`notificationQueue.getJobCounts()`).
        - Job processing time (BullMQ event handlers).
        - WebSocket connections per node.
        - HTTP request rates and latencies.
      - Use Grafana dashboards or a hosted APM (DataDog, New Relic) to catch anomalies.
  7.  **Caching**:
      - Store the 50 most recent notifications (or unread count) per `user_id` in Redis with a TTL.
      - On insert, update that cache; on marking as read, update accordingly.
      - TTL can be, for example, 24 hours for "recent" or indefinite if you want to keep a quick grab.

## Performance

- **Asynchronous Processing**: BullMQ offloads event processing, keeping request latency low (<50 ms for 100 DAUs) even under moderate load.
- **Real-Time Delivery**: WebSocket delivers notifications end-to-end in <100 ms for 100 DAUs. With Redis Pub/Sub in production, that remains sub-100 ms even with multiple nodes.
- **Database Optimization**:

  - Indexes on:

    ```
    notifications(user_id, created_at DESC)
    notifications(user_id, "read", created_at DESC)
    events(type, target_id)

    ```

  - These enhance query performance for retrieval and filtering by unread/read status.

## Limitations

1.  **Single Instance Bottlenecks**: Single PostgreSQL and Redis instances limit throughput for 100 DAUs. Beyond this, you need sharding and replication.
2.  **WebSocket Scalability**: The POC's in-memory clients map can't scale past a few thousand connections. For 1M DAUs, a Redis Pub/Sub--based fan-out is required.
3.  **Queue Contention**: A single Redis node can become saturated if too many jobs enqueue at once. In production, a Redis Cluster or alternative message broker (Kafka, SQS) is preferred.
4.  **Lack of Fault Tolerance**: No replication for PostgreSQL or Redis introduces single points of failure. Production systems need high-availability configurations (managed clusters, streaming replication, etc.).
5.  **Resource Constraints**: Memory and CPU limits on a single server restrict handling of peak loads. Horizontal scaling (multiple pods/containers) is mandatory for reliability.
6.  **Event Idempotency**: The POC does not dedupe duplicate "follow" or "comment" events. In production, adding an idempotency key or a unique constraint prevents double notifications.
7.  **Retention & Archival**: Notifications are currently stored indefinitely. Over time, the `notifications` table will grow large; a nightly archival or TTL-based cleanup should be added in a production rollout.
