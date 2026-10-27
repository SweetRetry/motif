"use client";

import "@xyflow/react/dist/base.css";
import {
  Background,
  BackgroundVariant,
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  Handle,
  Panel,
  Position,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesData,
  useNodesState,
  useOnSelectionChange,
  useReactFlow,
} from "@xyflow/react";
import type {
  Connection,
  Edge,
  EdgeProps,
  NodeProps,
  NodeTypes,
} from "@xyflow/react";
import {
  Clapperboard,
  Image as ImageIcon,
  Plus,
  SlidersHorizontal,
} from "lucide-react";
import type { CSSProperties, ReactNode } from "react";
import {
  createContext,
  memo,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";

import { Button } from "@/components/ui/button";
import { AspectRatioPicker } from "@/components/ui/motif/aspect-ratio-picker";
import { FlowEdge } from "@/components/ui/motif/flow-edge";
import { GenerationOverlay } from "@/components/ui/motif/generation-overlay";
import {
  ModelSelect,
  ModelSelectContent,
  ModelSelectIndex,
  ModelSelectList,
  ModelSelectSearch,
  ModelSelectTrigger,
} from "@/components/ui/motif/model-select";
import type {
  ModelSelectModel,
  ModelSelectProvider,
} from "@/components/ui/motif/model-select";
import {
  PromptInput,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
} from "@/components/ui/motif/prompt-input";
import { ResolutionSegmented } from "@/components/ui/motif/resolution-segmented";
import { StrengthSelect } from "@/components/ui/motif/strength-select";
import {
  VideoPreview,
  VideoPreviewPlayOverlay,
  VideoPreviewScreen,
} from "@/components/ui/motif/video-preview";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

import {
  canConnect,
  createNode,
  DEFAULT_BRIEF,
  jobOf,
  referenceOf,
  starterGraph,
} from "./generation-canvas-graph";
import type {
  Brief,
  CanvasEdge,
  CanvasNode,
  Generate,
  NodeKind,
  ResultNode,
} from "./generation-canvas-graph";

/* -- The plane ---------------------------------------------------------------
 * A generation canvas is a plane of frames. A frame is the picture or the clip and
 * nothing else: no header, no card round a card, only a name above it and a plus at each
 * side to reach for the next one. What a frame is asked to be, its prompt and its
 * settings, is written in the composer under the plane, on whichever frame is selected,
 * or on a new one when nothing is.
 *
 * Three things are kept apart, and each is a file. What a graph may be, which edges are
 * legal, what a frame starts from, whether it can run, is `generation-canvas-graph`, with
 * no React in it. What a model is, is `Generate`, a function you pass: the canvas owns
 * when to call it, the function owns what it means. And what this file owns is the rest:
 * the viewport, the frames' faces, the composer, and the one place a run is started, held
 * and stopped.
 *
 * The viewport is `@xyflow/react`. The frames are its custom nodes and the edge is its
 * custom edge, so panning, zooming, dragging, selecting and connecting are the library's
 * and nothing here re-implements them.
 * --------------------------------------------------------------------------- */

const FRAME_WIDTH: Record<NodeKind, number> = { image: 288, video: 360 };

/** How far the plus stands off the frame it belongs to. */
const PLUS_OFFSET = 20;

const PLUS =
  "flex! size-6! items-center! justify-center! min-h-0! min-w-0! rounded-full! border! border-border! bg-background! text-muted-foreground! transition-colors hover:border-ring! hover:text-foreground! after:absolute after:-inset-2 after:content-['']";

const LABEL = "mb-2 font-medium text-muted-foreground text-xs";

/** What a frame reads from the canvas it is on: how to put a new frame beside it. Held
 *  in a context because the nodes are the library's to render, and the library hands
 *  them props of its own. */
interface CanvasContextValue {
  extend: (id: string, side: "before" | "after") => void;
}

const CanvasContext = createContext<CanvasContextValue | null>(null);

const useCanvas = () => {
  const context = useContext(CanvasContext);
  if (!context) {
    throw new Error("A canvas node must be drawn inside a GenerationCanvas.");
  }

  return context;
};

/* -- Frame ---------------------------------------------------------------------
 * The whole frame drags, because there is nothing in it to be typed into: the only
 * controls a frame has are the plus at each side and, on a clip, its play mark.
 * --------------------------------------------------------------------------- */

const ratio = (aspect: string) => aspect.replace(":", " / ");

/** A plus beside a frame. Dragging from it draws an edge, the library's own; pressing it
 *  puts a new frame there and draws the edge for you. */
const FramePlus = ({
  label,
  onPress,
  side,
}: {
  label: string;
  onPress: () => void;
  side: "left" | "right";
}) => (
  <Handle
    aria-label={label}
    className={PLUS}
    onClick={onPress}
    position={side === "left" ? Position.Left : Position.Right}
    style={side === "left" ? { left: -PLUS_OFFSET } : { right: -PLUS_OFFSET }}
    type={side === "left" ? "target" : "source"}
  >
    <Plus className="pointer-events-none size-3.5" />
  </Handle>
);

const FrameView = memo(
  ({ data, id, selected, type }: NodeProps<ResultNode>) => {
    const { extend } = useCanvas();
    const isVideo = type === "video";
    const pending = data.status === "pending";
    const Icon = isVideo ? Clapperboard : ImageIcon;

    let overlay: ReactNode;
    if (data.status === "failed") {
      overlay = (
        <p
          className="absolute inset-0 flex items-center justify-center p-4 text-center text-destructive text-xs"
          role="alert"
        >
          {data.error ?? "It did not finish."}
        </p>
      );
    } else if (data.status === "idle") {
      overlay = (
        <Icon
          aria-hidden="true"
          className="absolute top-1/2 left-1/2 size-9 -translate-x-1/2 -translate-y-1/2 text-muted-foreground/50"
          strokeWidth={1.25}
        />
      );
    }

    return (
      <div style={{ width: FRAME_WIDTH[type] }}>
        <div className="mb-2 flex items-center gap-1.5 px-0.5 text-muted-foreground text-sm">
          <Icon aria-hidden="true" className="size-4" />
          {isVideo ? "Video" : "Image"}
        </div>
        <div className="relative">
          <div
            className={cn(
              "relative overflow-hidden rounded-2xl border bg-card",
              selected ? "border-ring" : "border-border"
            )}
            style={{ aspectRatio: ratio(data.aspect) }}
          >
            {isVideo && data.status === "done" && data.src ? (
              <VideoPreview className="absolute inset-0" src={data.src}>
                <VideoPreviewScreen className="aspect-auto h-full rounded-none">
                  <VideoPreviewPlayOverlay />
                </VideoPreviewScreen>
              </VideoPreview>
            ) : (
              <GenerationOverlay
                mediaSrc={isVideo ? undefined : data.src}
                overlay={overlay}
                pending={pending}
                prompt={pending ? data.prompt : undefined}
                seed={`${id}-${data.seed}`}
              >
                {!isVideo && data.src ? (
                  <img
                    alt={data.prompt || "Generated result"}
                    className="h-full w-full object-cover"
                    draggable={false}
                    src={data.src}
                  />
                ) : null}
              </GenerationOverlay>
            )}
          </div>
          <FramePlus
            label="Start this frame from a new image"
            onPress={() => extend(id, "before")}
            side="left"
          />
          {isVideo ? null : (
            <FramePlus
              label="Make a video from this image"
              onPress={() => extend(id, "after")}
              side="right"
            />
          )}
        </div>
      </div>
    );
  }
);

// Module-level, so the maps keep one identity for the life of the page: a new object
// every render would make the library unmount and remount every node.
const nodeTypes = {
  image: FrameView,
  video: FrameView,
} as unknown as NodeTypes;

/* -- Edge ----------------------------------------------------------------------
 * The line is `FlowEdge`, drawn through the library's own path so it follows the ports
 * wherever a node is dragged. The library still draws a path of its own beneath it,
 * transparent except when the edge is selected, because that path is what a press lands
 * on and what the delete key acts on.
 * --------------------------------------------------------------------------- */

const TRACK = { "--edge-track": "var(--muted-foreground)" } as CSSProperties;

const FlowCanvasEdge = memo(
  ({
    data: edgeData,
    id,
    selected,
    sourcePosition,
    sourceX,
    sourceY,
    target,
    targetPosition,
    targetX,
    targetY,
  }: EdgeProps) => {
    // Light travels while the node it arrives at is waiting on a result, or always on an
    // edge that carries `data.active`.
    const data = useNodesData<CanvasNode>(target)?.data;
    const active = edgeData?.active === true || data?.status === "pending";

    const [path] = getBezierPath({
      sourcePosition,
      sourceX,
      sourceY,
      targetPosition,
      targetX,
      targetY,
    });
    const left = Math.min(sourceX, targetX);
    const top = Math.min(sourceY, targetY);
    const width = Math.max(Math.abs(targetX - sourceX), 1);
    const height = Math.max(Math.abs(targetY - sourceY), 1);

    return (
      <>
        <BaseEdge
          id={id}
          interactionWidth={24}
          path={path}
          style={{
            stroke: selected ? "var(--ring)" : "transparent",
            strokeWidth: 2,
          }}
        />
        <EdgeLabelRenderer>
          <div
            aria-hidden="true"
            className="pointer-events-none absolute"
            style={{
              height,
              transform: `translate(${left}px, ${top}px)`,
              width,
            }}
          >
            <FlowEdge
              active={active}
              className="text-primary"
              d={path}
              glow={2}
              strokeWidth={1.5}
              style={TRACK}
              viewBox={`${left} ${top} ${width} ${height}`}
            />
          </div>
        </EdgeLabelRenderer>
      </>
    );
  }
);

const edgeTypes = { flow: FlowCanvasEdge };

/* -- The canvas ----------------------------------------------------------------
 * The library's CSS variables, pointed at the theme's tokens. The base stylesheet gives
 * the plane no colours of its own, so a theme swap restyles it for free.
 * --------------------------------------------------------------------------- */
const THEME = {
  "--xy-attribution-background-color": "transparent",
  "--xy-background-color": "var(--background)",
  "--xy-background-pattern-dots-color": "var(--border)",
  "--xy-connectionline-stroke": "var(--muted-foreground)",
  "--xy-connectionline-stroke-width": "1.5",
  "--xy-selection-background-color":
    "color-mix(in oklab, var(--ring) 10%, transparent)",
  "--xy-selection-border": "1px solid var(--ring)",
} as CSSProperties;

const DELETE_KEYS = ["Backspace", "Delete"];
const FIT = { maxZoom: 1, padding: 0.25 };

/** What the composer can make each kind with, and who makes it. */
export interface Catalogue {
  models: Record<NodeKind, ModelSelectModel[]>;
  providers: ModelSelectProvider[];
}

/** The model a frame runs on: the one it names if the catalogue still has it, else the
 *  first of its kind. */
const modelFor = (
  catalogue: Catalogue | undefined,
  kind: NodeKind,
  id: string | undefined
) => {
  const options = catalogue?.models[kind] ?? [];

  return options.some((model) => model.id === id) ? id : options[0]?.id;
};

export interface GenerationCanvasProps {
  /** The models to offer, per kind. Omitted, the composer draws no model picker and a run
   *  carries no model. */
  catalogue?: Catalogue;
  className?: string;
  /** What a run asks. Resolves with where the result is; rejects to fail the node. */
  generate: Generate;
  /** The graph the canvas opens with. Read once. Defaults to the starter with nothing
   *  made yet. */
  initial?: { edges: CanvasEdge[]; nodes: CanvasNode[] };
  /**
   * Whether the wheel zooms the plane. `true` on a page that is the canvas. On a page
   * that merely has one on it, pass `false`: the wheel then scrolls the page, and the
   * plane zooms with Ctrl or Cmd and the wheel, or a pinch, so a scroll never gets
   * caught inside the frame.
   */
  preventScrolling?: boolean;
}

const newId = (kind: NodeKind) => `${kind}-${crypto.randomUUID().slice(0, 8)}`;

const messageOf = (error: unknown) =>
  error instanceof Error ? error.message : "It did not finish.";

/** What the composer holds when no frame is selected: the brief of the next one, and
 *  which kind it will be. */
interface Draft extends Brief {
  kind: NodeKind;
}

const STRENGTHS = ["Low", "Medium", "High"];

const Canvas = ({
  catalogue,
  className,
  generate,
  initial,
  preventScrolling = true,
}: GenerationCanvasProps) => {
  const [start] = useState(() => initial ?? starterGraph());
  const [nodes, setNodes, onNodesChange] = useNodesState<CanvasNode>(
    start.nodes
  );
  const [edges, setEdges, onEdgesChange] = useEdgesState<CanvasEdge>(
    start.edges
  );
  const flow = useReactFlow<CanvasNode, CanvasEdge>();
  const frame = useRef<HTMLDivElement>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>({
    ...DEFAULT_BRIEF,
    kind: "image",
  });

  useOnSelectionChange({
    onChange: useCallback(
      ({ nodes: held }: { nodes: Edge[] | { id: string }[] }) =>
        setSelectedId(held.length === 1 ? held[0].id : null),
      []
    ),
  });

  /* -- Running -------------------------------------------------------------------
   * One place starts a run, so one place can stop it. A run is a promise kept by node
   * id: asking for a node that is already running hands back the run in flight, which
   * is what makes a clip safe to run while the picture it starts from is still being
   * made. Each run holds an `AbortController`, and deleting a node or stopping it aborts
   * it.
   * --------------------------------------------------------------------------- */
  const inflight = useRef(new Map<string, Promise<void>>());
  const controllers = useRef(new Map<string, AbortController>());

  const run = useCallback(
    function runNode(id: string): Promise<void> {
      const running = inflight.current.get(id);
      if (running) {
        return running;
      }

      const first = flow.getNode(id);
      if (!first) {
        return Promise.resolve();
      }

      const controller = new AbortController();
      controllers.current.set(id, controller);

      const task = (async () => {
        // Pending before anything is waited for, so the line into this node lights up
        // at once, including while the picture it starts from is still being made.
        flow.updateNodeData(id, {
          error: undefined,
          seed: first.data.seed + 1,
          src: undefined,
          status: "pending",
        });

        try {
          const reference = referenceOf(id, flow.getNodes(), flow.getEdges());
          if (reference && reference.data.status !== "done") {
            await runNode(reference.id);
          }
          if (controller.signal.aborted) {
            return;
          }

          const nodesNow = flow.getNodes();
          const edgesNow = flow.getEdges();
          const node = nodesNow.find((candidate) => candidate.id === id);
          const job = node ? jobOf(node, nodesNow, edgesNow) : null;
          if (!job) {
            throw new Error("Write a prompt to run this.");
          }

          const started = referenceOf(id, nodesNow, edgesNow);
          if (started && started.data.status !== "done") {
            throw new Error("The image it starts from did not finish.");
          }

          const { src } = await generate(
            { ...job, model: modelFor(catalogue, job.kind, job.model) },
            controller.signal
          );
          if (!controller.signal.aborted) {
            flow.updateNodeData(id, { src, status: "done" });
          }
        } catch (error) {
          if (!controller.signal.aborted) {
            flow.updateNodeData(id, {
              error: messageOf(error),
              status: "failed",
            });
          }
        } finally {
          controllers.current.delete(id);
          inflight.current.delete(id);
        }
      })();

      inflight.current.set(id, task);

      return task;
    },
    [catalogue, flow, generate]
  );

  const stop = useCallback(
    (id: string) => {
      controllers.current.get(id)?.abort();
      controllers.current.delete(id);
      inflight.current.delete(id);
      flow.updateNodeData(id, { status: "idle" });
    },
    [flow]
  );

  // A node that is deleted mid-run stops its run, and the run's result is dropped.
  const onNodesDelete = useCallback((gone: CanvasNode[]) => {
    for (const node of gone) {
      controllers.current.get(node.id)?.abort();
    }
  }, []);

  const onConnect = useCallback(
    (connection: Connection) =>
      setEdges((current) => [
        ...current,
        {
          id: `e-${connection.source}-${connection.target}`,
          source: connection.source,
          target: connection.target,
          type: "flow",
        },
      ]),
    [setEdges]
  );

  const isValidConnection = useCallback(
    (connection: Connection | Edge) =>
      canConnect(connection, flow.getNodes(), flow.getEdges()),
    [flow]
  );

  /** Puts a node on the plane and selects it, so the composer is already on it. A run
   *  waits a frame, because the library's own copy of the graph is updated by a render. */
  const place = useCallback(
    (node: CanvasNode, link?: CanvasEdge) => {
      setNodes((current) => [
        ...current.map((other) =>
          other.selected ? { ...other, selected: false } : other
        ),
        { ...node, selected: true },
      ]);
      if (link) {
        setEdges((current) => [...current, link]);
      }
    },
    [setEdges, setNodes]
  );

  // A new frame beside one: an image before it, a video after it. The line between them is
  // drawn, because that is why the plus was pressed.
  const extend = useCallback(
    (id: string, side: "before" | "after") => {
      const from = flow.getNode(id);
      if (!from) {
        return;
      }

      const before = side === "before";
      if (before && referenceOf(id, flow.getNodes(), flow.getEdges())) {
        return;
      }

      const kind: NodeKind = before ? "image" : "video";
      const width = FRAME_WIDTH[before ? "image" : from.type];
      const node = createNode(
        kind,
        newId(kind),
        {
          x:
            from.position.x +
            (before ? -(width + 140) : FRAME_WIDTH[from.type] + 140),
          y: from.position.y,
        },
        { aspect: from.data.aspect }
      );
      place(
        node,
        before
          ? {
              id: `e-${node.id}-${id}`,
              source: node.id,
              target: id,
              type: "flow",
            }
          : {
              id: `e-${id}-${node.id}`,
              source: id,
              target: node.id,
              type: "flow",
            }
      );
    },
    [flow, place]
  );

  const canvasContext = useMemo<CanvasContextValue>(
    () => ({ extend }),
    [extend]
  );

  /* -- The composer --------------------------------------------------------------
   * One box, two meanings. With a frame selected it edits that frame's brief and runs
   * it. With none, it holds the brief of the next frame, and sending makes the frame and
   * runs it.
   * --------------------------------------------------------------------------- */
  const target = nodes.find((node) => node.id === selectedId);
  const brief: Brief = target ? target.data : draft;
  const kind = target ? target.type : draft.kind;
  const pending = target?.data.status === "pending";
  const models = catalogue?.models[kind] ?? [];

  const edit = (patch: Partial<Brief>) => {
    if (target) {
      flow.updateNodeData(target.id, patch);
    } else {
      setDraft((current) => ({ ...current, ...patch }));
    }
  };

  const send = () => {
    if (target) {
      void run(target.id);
      return;
    }

    const box = frame.current?.getBoundingClientRect();
    const middle = box
      ? flow.screenToFlowPosition({
          x: box.left + box.width / 2,
          y: box.top + box.height / 2,
        })
      : { x: 0, y: 0 };
    // Stepped, so a second frame made without moving the first is not on top of it.
    const step = (nodes.length % 5) * 24;
    const node = createNode(
      draft.kind,
      newId(draft.kind),
      {
        x: middle.x - FRAME_WIDTH[draft.kind] / 2 + step,
        y: middle.y - 120 + step,
      },
      draft
    );
    place(node);
    setDraft((current) => ({ ...current, prompt: "" }));
    requestAnimationFrame(() => {
      void run(node.id);
    });
  };

  return (
    <CanvasContext.Provider value={canvasContext}>
      <div className={cn("relative isolate size-full", className)} ref={frame}>
        <ReactFlow
          connectOnClick={false}
          deleteKeyCode={DELETE_KEYS}
          edges={edges}
          edgeTypes={edgeTypes}
          fitView
          fitViewOptions={FIT}
          isValidConnection={isValidConnection}
          maxZoom={1.5}
          minZoom={0.3}
          nodeDragThreshold={4}
          nodes={nodes}
          nodeTypes={nodeTypes}
          onConnect={onConnect}
          onEdgesChange={onEdgesChange}
          onNodesChange={onNodesChange}
          onNodesDelete={onNodesDelete}
          preventScrolling={preventScrolling}
          style={THEME}
          zoomActivationKeyCode={["Meta", "Control"]}
        >
          <Background gap={24} size={1} variant={BackgroundVariant.Dots} />
          <Panel position="bottom-center">
            <PromptInput
              aria-label="Describe what to make"
              className="nodrag nopan nowheel w-[min(40rem,calc(100vw-2rem))] shadow-lg"
              onStop={() => target && stop(target.id)}
              onSubmit={send}
              onValueChange={(prompt) => edit({ prompt })}
              streaming={pending}
              value={brief.prompt}
            >
              <PromptInputTextarea
                placeholder={
                  kind === "video"
                    ? "Describe the clip you want"
                    : "Describe the picture you want"
                }
              />
              <PromptInputFooter>
                {target ? null : (
                  <Button
                    className="rounded-full text-muted-foreground"
                    onClick={() =>
                      setDraft((current) => ({
                        ...current,
                        kind: current.kind === "image" ? "video" : "image",
                        model: undefined,
                      }))
                    }
                    type="button"
                    variant="ghost"
                  >
                    {draft.kind === "image" ? <ImageIcon /> : <Clapperboard />}
                    {draft.kind === "image" ? "Image" : "Video"}
                  </Button>
                )}
                {models.length > 0 && catalogue ? (
                  <ModelSelect
                    models={models}
                    onValueChange={(next) => edit({ model: next })}
                    providers={catalogue.providers}
                    value={modelFor(catalogue, kind, brief.model)}
                  >
                    <ModelSelectTrigger />
                    <ModelSelectContent>
                      <ModelSelectSearch />
                      <div className="flex min-h-0 flex-1">
                        <ModelSelectIndex />
                        <ModelSelectList />
                      </div>
                    </ModelSelectContent>
                  </ModelSelect>
                ) : null}
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      className="rounded-full font-mono text-muted-foreground text-xs"
                      type="button"
                      variant="ghost"
                    >
                      <SlidersHorizontal />
                      {brief.aspect} · {brief.resolution} · {brief.strength}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent
                    align="start"
                    className="nodrag nopan nowheel flex w-72 flex-col gap-4"
                    side="top"
                  >
                    <div>
                      <div className={LABEL}>Aspect ratio</div>
                      <AspectRatioPicker
                        aria-label="Aspect ratio"
                        onChange={(aspect) => edit({ aspect })}
                        value={brief.aspect}
                      />
                    </div>
                    <div>
                      <div className={LABEL}>Resolution</div>
                      <ResolutionSegmented
                        aria-label="Resolution"
                        onChange={(resolution) => edit({ resolution })}
                        value={brief.resolution}
                      />
                    </div>
                    <div>
                      <div className={LABEL}>Strength</div>
                      <StrengthSelect
                        aria-label="Strength"
                        onChange={(strength) => edit({ strength })}
                        options={STRENGTHS}
                        value={brief.strength}
                      />
                    </div>
                  </PopoverContent>
                </Popover>
                <PromptInputSubmit />
              </PromptInputFooter>
            </PromptInput>
          </Panel>
        </ReactFlow>
      </div>
    </CanvasContext.Provider>
  );
};

/**
 * The block: a plane you can pan, zoom and work in, with a composer under it that writes
 * to the selected frame. It takes the size its parent gives it, so the parent has to give
 * it one.
 */
export const GenerationCanvas = (props: GenerationCanvasProps) => (
  <ReactFlowProvider>
    <Canvas {...props} />
  </ReactFlowProvider>
);
