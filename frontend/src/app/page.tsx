"use client";
import { useState } from "react";
import UserPanel from "@/components/UserPanel";

export default function Home() {
  const [showOverview, setShowOverview] = useState(true);

  // Define the three users
  const users = [
    {
      userId: "u1",
      userName: "Alice",
      otherUsers: [
        { userId: "u2", userName: "Bob" },
        { userId: "u3", userName: "John" },
      ],
    },
    {
      userId: "u2",
      userName: "Bob",
      otherUsers: [
        { userId: "u1", userName: "Alice" },
        { userId: "u3", userName: "John" },
      ],
    },
    {
      userId: "u3",
      userName: "John",
      otherUsers: [
        { userId: "u1", userName: "Alice" },
        { userId: "u2", userName: "Bob" },
      ],
    },
  ];

  return (
    <main className="min-h-screen bg-gray-50 flex flex-col">
      <div className="bg-blue-100 px-4 py-2 border-b border-blue-200">
        <div className="mx-auto">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold text-blue-800">
              Simulation Overview
            </h2>
            <button
              onClick={() => setShowOverview(!showOverview)}
              className="text-sm underline cursor-pointer text-gray-500"
            >
              {showOverview ? "Hide Overview" : "Show Overview"}
            </button>
          </div>

          {showOverview && (
            <p className="text-sm text-blue-700 mt-2">
              This Proof-of-Concept (POC) showcases the Insyd notification
              system using three hardcoded users, Alice (u1), Bob (u2), and John
              (u3), without authentication. The UI displays their interactions
              in three side-by-side panels, each simulating their app dashboard.
              Buttons trigger actions: “Post Blog” simulates posting content,
              “Follow [User]” mimics following another user, and “Comment on
              [User]’s Post” represents commenting. When a button is clicked,
              the system processes the action and instantly delivers a
              notification to the recipient’s panel, with past notifications
              loaded on startup. This demonstrates a scalable, real-time
              notification system for a social platform, not limited to three
              users.
            </p>
          )}
        </div>
      </div>

      <div className="flex flex-1">
        {users.map((user) => (
          <div
            key={user.userId}
            className="flex-1 border-r border-gray-200 last:border-r-0"
          >
            <UserPanel
              userId={user.userId}
              userName={user.userName}
              otherUsers={user.otherUsers}
            />
          </div>
        ))}
      </div>
    </main>
  );
}
