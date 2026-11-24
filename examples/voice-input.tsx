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
        {taken ? `Recorded ${taken}` : null}
      </p>
    </div>
  );
};

const useFakeLevel = () => {
  const turn = useRef(0);

  return useCallback(() => {
    turn.current += 0.11;
    const slow = Math.sin(turn.current) * 0.5 + 0.5;
    const fast = Math.sin(turn.current * 2.7 + 1.3) * 0.5 + 0.5;
    return 0.14 + slow * fast * 0.72;
  }, []);
};

export const VoiceRecordingDemo = () => {
  const level = useFakeLevel();
  const [note, setNote] = useState<string | null>(null);

  return (
    <div className="flex w-full max-w-2xl flex-col items-start gap-3">
      <div className="w-full rounded-3xl border border-border bg-card p-2.5">
        <VoiceRecording
          onCancel={() => setNote("Cancelled.")}
          onStop={() => setNote("Stopped.")}
          source={level}
        />
      </div>
      <span className={`min-h-4 ${caption}`}>{note}</span>
    </div>
  );
};

export const VoiceInputStandaloneDemo = () => {
  const [count, setCount] = useState(0);

  return (
    <div className="flex w-full max-w-2xl items-center gap-3">
      <VoiceInput onRecord={() => setCount((current) => current + 1)} />
      {count > 0 ? (
        <span className={caption}>
          {`${count} recording${count > 1 ? "s" : ""}`}
        </span>
      ) : null}
    </div>
  );
};
