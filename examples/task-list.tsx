"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  TaskList,
  TaskListContent,
  TaskListHeader,
  TaskListItem,
  TaskListItemMarker,
  TaskListItemText,
  TaskListProgress,
  TaskListStatus,
  TaskListTitle,
} from "@/registry/new-york/agents/task-list";
import type { TaskStatus } from "@/registry/new-york/agents/task-list";

const TASKS = [
  "Read the session helpers in src/auth",
  "Move token refresh out of the middleware and into createSession, keeping the old export as a re-export until the callers are moved",
  "Update the three callers in src/routes",
  "Delete the re-export",
  "Run the type checker",
  "Run the auth tests",
  "Summarise what changed",
];

const STEP_MS = 1800;

const statusOf = (index: number, reached: number): TaskStatus => {
  if (index < reached) {
    return "done";
  }

  return index === reached ? "active" : "todo";
};

export const TaskListDemo = () => {
  const [reached, setReached] = useState(0);
  const [stopped, setStopped] = useState(false);

  const finished = reached >= TASKS.length;
  const running = !(finished || stopped);

  useEffect(() => {
    if (!running) {
      return;
    }

    const timeout = window.setTimeout(() => setReached(reached + 1), STEP_MS);

    return () => window.clearTimeout(timeout);
  }, [reached, running]);

  return (
    <div className="flex w-full max-w-md flex-col items-start gap-4">
      <TaskList running={running}>
        <TaskListHeader>
          <TaskListStatus status={finished ? "done" : "active"} />
          <TaskListTitle>
            {finished ? "All done" : TASKS[reached]}
          </TaskListTitle>
          <TaskListProgress done={reached} total={TASKS.length} />
        </TaskListHeader>
        <TaskListContent>
          {TASKS.map((task, index) => (
            <TaskListItem key={task} status={statusOf(index, reached)}>
              <TaskListItemMarker />
              <TaskListItemText>{task}</TaskListItemText>
            </TaskListItem>
          ))}
        </TaskListContent>
      </TaskList>
      <div className="flex gap-2">
        {running ? (
          <Button onClick={() => setStopped(true)} size="sm" variant="outline">
            Stop
          </Button>
        ) : (
          <Button
            onClick={() => {
              setStopped(false);
              if (finished) {
                setReached(0);
              }
            }}
            size="sm"
            variant="outline"
          >
            {finished ? "Run it again" : "Continue"}
          </Button>
        )}
      </div>
    </div>
  );
};
