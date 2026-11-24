"use client";

import {
  Diff,
  DiffContent,
  DiffFile,
  DiffHeader,
  DiffStat,
} from "@/registry/new-york/agents/diff";
import {
  ToolCall,
  ToolCallContent,
  ToolCallHeader,
  ToolCallName,
  ToolCallStatus,
  ToolCallSummary,
} from "@/registry/new-york/agents/tool-call";

const SESSION_PATCH = `diff --git a/src/auth/session.ts b/src/auth/session.ts
index 3f1c2a9..8d0e4b1 100644
--- a/src/auth/session.ts
+++ b/src/auth/session.ts
@@ -12,8 +12,13 @@ export interface Session {
   userId: string;
   createdAt: number;
+  /** When the session stops being accepted, in ms since the epoch. */
+  expiresAt: number;
 }

-export const createSession = (userId: string): Session => ({
-  userId,
-  createdAt: Date.now(),
-});
+const TTL = 1000 * 60 * 60 * 24 * 7;
+
+export const createSession = (userId: string, now = Date.now()): Session => ({
+  userId,
+  createdAt: now,
+  expiresAt: now + TTL,
+});
@@ -31,3 +36,4 @@ export const readSession = (token: string) => {
   const session = store.get(token);
-  return session ?? null;
+  if (!session || session.expiresAt < Date.now()) return null;
+  return session;
 };`;

const EDIT_PATCH = `   useLayoutEffect(() => {
-    end.current?.scrollIntoView({ behavior: "smooth" });
+    const viewport = scroller.current;
+    if (viewport && pinned.current) {
+      viewport.scrollTop = viewport.scrollHeight;
+    }
   }, [turns]);`;

const EDIT_CALL = {
  firstLine: 18,
  new_string: `  useLayoutEffect(() => {
    const viewport = scroller.current;
    if (viewport && pinned.current) {
      viewport.scrollTop = viewport.scrollHeight;
    }
  }, [turns]);`,
  old_string: `  useLayoutEffect(() => {
    end.current?.scrollIntoView({ behavior: "smooth" });
  }, [turns]);`,
};

const README_BEFORE = `## Install

Run the command below in the root of your project and the component will be copied into your components folder.

Every component is yours to edit after it is installed.
`;

const README_AFTER = `## Install

Run the command below in the root of your app and the component will be copied into \`components/ui\`.

Every component is yours to edit after it is installed.
`;

export const DiffDemo = () => (
  <Diff className="w-full max-w-xl" patch={SESSION_PATCH}>
    <DiffHeader>
      <DiffFile />
      <DiffStat />
    </DiffHeader>
    <DiffContent />
  </Diff>
);

export const DiffToolCallDemo = () => (
  <ToolCall className="w-full max-w-xl" defaultOpen status="done">
    <ToolCallHeader>
      <ToolCallStatus />
      <ToolCallName>edit_file</ToolCallName>
      <ToolCallSummary>components/thread.tsx</ToolCallSummary>
    </ToolCallHeader>
    <ToolCallContent>
      <Diff
        after={EDIT_CALL.new_string}
        before={EDIT_CALL.old_string}
        firstLine={EDIT_CALL.firstLine}
      >
        <DiffContent />
      </Diff>
    </ToolCallContent>
  </ToolCall>
);

export const DiffFilesDemo = () => (
  <div className="flex w-full max-w-xl flex-col gap-2">
    {[
      SESSION_PATCH,
      `--- a/components/thread.tsx\n+++ b/components/thread.tsx\n${EDIT_PATCH}`,
    ].map((patch) => (
      <Diff key={patch} patch={patch}>
        <DiffHeader className="border-b-0">
          <DiffFile />
          <DiffStat />
        </DiffHeader>
      </Diff>
    ))}
  </div>
);

export const DiffProseDemo = () => (
  <Diff
    after={README_AFTER}
    before={README_BEFORE}
    className="w-full max-w-xl"
    file="README.md"
    firstLine={1}
  >
    <DiffHeader>
      <DiffFile />
      <DiffStat />
    </DiffHeader>
    <DiffContent />
  </Diff>
);
