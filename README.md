# Insyd Notification System POC

This Proof-of-Concept (POC) demonstrates a real-time notification system for a social platform, featuring three hardcoded users (Alice, Bob, and John) to simulate interactions.\
See `docs/system_design.md` for system design and details.

---

## Prerequisites

- Node.js v18+
- npm v8+
- PostgreSQL v15+
- Redis v7+
- Docker (for running Redis, optional but recommended)

---

## Setup

### 1\. Clone Repository

```
git clone https://github.com/Pratik1374/insyd-notification-system.git
cd insyd-notification-system

```

---

### 2\. Set Up Backend

Navigate to the backend directory:

```
cd backend

```

Install dependencies:

```
npm install

```

Create the environment file `.env`:

```
PORT=4000
PG_URL=postgresql://user:password@localhost:5432/insyd
REDIS_URL=redis://localhost:6379

```

> Replace `user:password` with your PostgreSQL credentials.

#### Start Redis using Docker

If Redis is not installed on your system, you can run it using Docker:

```
docker run -d -p 6379:6379 --name Insyd-Notification-App redis

```

> This will pull the official Redis image (if not already present) and start a container named `Insyd-Notification-App`.

#### Database Schema

Before starting the backend server, ensure the following tables exist in your `insyd` database. Run these SQL statements in `psql` or any PostgreSQL GUI:

```
-- Users table (seed with three POC users)
CREATE TABLE users (
  id   VARCHAR(50) NOT NULL PRIMARY KEY,
  name VARCHAR(100) NOT NULL
);

-- Events table (references users.id)
CREATE TABLE events (
  id         SERIAL         PRIMARY KEY,
  type       VARCHAR(50)    NOT NULL,
  actor_id   VARCHAR(50)    NOT NULL REFERENCES users(id),
  target_id  VARCHAR(50)    NOT NULL REFERENCES users(id),
  payload    JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notifications table (references events.id and users.id)
CREATE TABLE notifications (
  id          SERIAL         PRIMARY KEY,
  user_id     VARCHAR(50)    NOT NULL REFERENCES users(id),
  event_id    INTEGER        NOT NULL REFERENCES events(id),
  message     TEXT           NOT NULL,
  created_at  TIMESTAMPTZ    DEFAULT NOW(),
  "read"      BOOLEAN        NOT NULL DEFAULT FALSE,
  seen_at     TIMESTAMPTZ    NULL
);

-- Seed the users table with three POC users
INSERT INTO users (id, name) VALUES
  ('u1', 'Alice'),
  ('u2', 'Bob'),
  ('u3', 'John');

```

> **Note**: The POC uses three hardcoded users (Alice, Bob, John) to simulate interactions like posting blogs, following, and commenting. Indexes for performance (e.g., on `notifications(user_id, created_at DESC)`) are recommended in the system design document but not required for this POC.

Once the tables and seed data are in place, start the backend server:

```
npm run dev

```

---

### 3\. Set Up Frontend

Navigate to the frontend directory:

```
cd ../frontend

```

Install dependencies:

```
npm install

```

Create the environment file `.env.local`:

```
NEXT_PUBLIC_API_URL=http://localhost:4000

```

Start the frontend server:

```
npm run dev

```

Then open [http://localhost:3000](http://localhost:3000/) in your browser to view the POC.
