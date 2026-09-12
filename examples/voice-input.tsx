"use client";

import { useCallback, useRef, useState } from "react";

import {
  PromptInput,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
} from "@/registry/new-york/agents/prompt-input";
import {
  useVoiceRecorder,
  VoiceInput,
  VoiceRecording,
} from "@/registry/new-york/voice-input";

const caption = "text-xs text-muted-foreground";

/** The whole round trip: the mic starts a recording, and the composer's own frame
 *  becomes the bar — cancel on the left, the level across the middle, stop on the
 *  right. The field and the submit are swapped out rather than covered, because a
 *  recording is not a thing you type into. */
export const VoiceInputDemo = () => {
  const [taken, setTaken] = useState<string | null>(null);
  const recorder = useVoiceRecorder({
    onRecord: (blob) =>
      setTaken(`${Math.max(1, Math.round(blob.size / 1024))} KB`),
  });
  const recording = recorder.status === "recording";

  return (
    <div className="flex w-full max-w-2xl flex-col items-start gap-3">
      <PromptInput>
        {recording ? (
          <VoiceRecording
            onCancel={recorder.cancel}
            onStop={recorder.stop}
            source={recorder.readLevel}
          />
        ) : (
          <>
            <PromptInputTextarea placeholder="Press the mic and ask out loud." />
            <PromptInputFooter>
              <VoiceInput recorder={recorder} />
              <PromptInputSubmit />
            </PromptInputFooter>
          </>
        )}
      </PromptInput>

      <p aria-live="polite" className={`min-h-4 ${caption}`}>
        {taken
          ? `Recorded ${taken} — a transcript would land in the field.`
          : "The bar replaces the field while the recording runs."}
      </p>
    </div>
  );
};

/** A stand-in for the analyser: a level that moves like a voice without a microphone
 *  behind it, so the bar can be read on a page that has not been granted anything. */
const useFakeLevel = () => {
  const turn = useRef(0);

  return useCallback(() => {
    turn.current += 0.11;
    const slow = Math.sin(turn.current) * 0.5 + 0.5;
    const fast = Math.sin(turn.current * 2.7 + 1.3) * 0.5 + 0.5;
    return 0.14 + slow * fast * 0.72;
  }, []);
};

/** The bar on its own. It takes a level reader and two handlers and holds no state, so
 *  it draws the same way with no microphone at all — which is what lets it be laid out
 *  inside any frame rather than only the one the mic lives in. */
export const VoiceRecordingDemo = () => {
  const level = useFakeLevel();
  const [note, setNote] = useState(
    "Cancel, level, stop — the bar draws no surface of its own."
  );

  return (
    <div className="flex w-full max-w-2xl flex-col items-start gap-3">
      <div className="w-full rounded-3xl border border-border bg-card p-2.5">
        <VoiceRecording
          onCancel={() => setNote("Cancelled.")}
          onStop={() => setNote("Stopped, and the blob is on its way out.")}
          source={level}
        />
      </div>
      <span className={caption}>{note}</span>
    </div>
  );
};

/** The self-contained control: no wiring, no frame of the caller's. While a recording
 *  runs the mic is replaced by the bar, so the component can be dropped into any row
 *  that has the width for it. */
export const VoiceInputStandaloneDemo = () => {
  const [count, setCount] = useState(0);

  return (
    <div className="flex w-full max-w-2xl items-center gap-3">
      <VoiceInput onRecord={() => setCount((current) => current + 1)} />
      <span className={caption}>
        {count > 0
          ? `${count} recording${count > 1 ? "s" : ""} handed over.`
          : "One prop; the bar appears in place of the mic."}
      </span>
    </div>
  );
};
