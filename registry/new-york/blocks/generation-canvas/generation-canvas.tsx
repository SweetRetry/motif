"use client";

import "@xyflow/react/dist/base.css";
import {
  addEdge,
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
  Maximize,
  MessageSquareText,
  Play,
  RotateCcw,
  SlidersHorizontal,
  Sparkles,
  Trash2,
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
import { ResolutionSegmented } from "@/components/ui/motif/resolution-segmented";
import { StrengthSelect } from "@/components/ui/motif/strength-select";
import {
  VideoPreview,
  VideoPreviewFilmstrip,
  VideoPreviewPlayOverlay,
  VideoPreviewScreen,
  VideoPreviewTime,
} from "@/components/ui/motif/video-preview";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

import {
  canConnect,
  canRun,
  createNode,
  depthOf,
  inputsOf,
  isResult,
  jobOf,
  starterGraph,
} from "./generation-canvas-graph";
import type {
  CanvasEdge,
  CanvasNode,
  Generate,
  ImageNode,
  NodeKind,
  PromptNode,
  SettingsNode,
  VideoNode,
} from "./generation-canvas-graph";

/* -- The plane ---------------------------------------------------------------
 * A generation canvas is a graph you can work in: nodes that hold a prompt, its
 * settings or a result, edges that say which work feeds which and carry light while the
 * result is on its way, and a dock above the plane that adds nodes and runs them.
 *
 * Three things are kept apart, and each is a file. What a graph may be, which edges are
 * legal, what a node is fed by, whether it can run, is `generation-canvas-graph`, with no
 * React in it. What a model is, is `Generate`, a function you pass: the canvas owns when
 * to call it, the function owns what it means. And what this file owns is the rest: the
 * viewport, the nodes' faces, and the one place a run is started, held and stopped.
 *
 * The viewport is `@xyflow/react`. The nodes are its custom nodes and the edge is its
 * custom edge, so panning, zooming, dragging, selecting and connecting are the library's
 * and nothing here re-implements them.
 * --------------------------------------------------------------------------- */

/** Where a port sits from the top of its node: the middle of the 40px header, so the
 *  line meets the node at the same height whatever the node holds. */
const PORT_OFFSET = 20;

const HANDLE =
  "size-2! min-h-0! min-w-0! rounded-full! border! border-border! bg-card! after:absolute after:-inset-2.5 after:content-['']";

const NODE_WIDTH: Record<NodeKind, number> = {
  image: 240,
  prompt: 216,
  settings: 216,
  video: 320,
};

/** Three seats, because the settings node is narrow and five labels would not fit. */
const STRENGTHS = ["Low", "Medium", "High"];

const LABEL = "mb-2 font-medium text-muted-foreground text-xs";

const FIELD =
  "nodrag nopan nowheel h-20 w-full resize-none rounded-lg border border-border bg-transparent p-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50";

/** What a node reads from the canvas it is on: which results can be run now, and how to
 *  run one. Held in a context because the nodes are the library's to render, and the
 *  library hands them props of its own. */
interface RunContextValue {
  run: (id: string) => void;
  runnable: ReadonlySet<string>;
}

const RunContext = createContext<RunContextValue | null>(null);

const useRun = () => {
  const context = useContext(RunContext);
  if (!context) {
    throw new Error("A canvas node must be drawn inside a GenerationCanvas.");
  }

  return context;
};

/* -- Nodes ---------------------------------------------------------------------
 * Every node is the same card: a header that drags it, and a body. The header is the
 * only place a press moves the node, so the body can hold a text field, a picker or a
 * clip's strip without any of them having to ask not to be dragged.
 * --------------------------------------------------------------------------- */

interface NodeFrameProps {
  actions?: ReactNode;
  children?: ReactNode;
  selected: boolean;
  title: string;
  width: number;
}

const NodeFrame = ({
  actions,
  children,
  selected,
  title,
  width,
}: NodeFrameProps) => (
  <section
    className={cn(
      "rounded-xl border bg-card text-card-foreground",
      selected ? "border-ring" : "border-border"
    )}
    style={{ width }}
  >
    <header className="canvas-node-drag flex h-10 cursor-grab items-center justify-between gap-2 px-3 active:cursor-grabbing">
      <span className="font-medium text-muted-foreground text-xs">{title}</span>
      {actions ? <div className="nodrag">{actions}</div> : null}
    </header>
    {children}
  </section>
);

const portStyle: CSSProperties = { top: PORT_OFFSET };

const PromptNodeView = memo(({ data, id, selected }: NodeProps<PromptNode>) => {
  const { updateNodeData } = useReactFlow();

  return (
    <NodeFrame selected={selected} title="Prompt" width={NODE_WIDTH.prompt}>
      <div className="px-3 pb-3">
        <textarea
          aria-label="Prompt"
          className={FIELD}
          onChange={(event) => updateNodeData(id, { text: event.target.value })}
          placeholder="Describe what to make"
          value={data.text}
        />
      </div>
      <Handle
        className={HANDLE}
        position={Position.Right}
        style={portStyle}
        type="source"
      />
    </NodeFrame>
  );
});

const SettingsNodeView = memo(
  ({ data, id, selected }: NodeProps<SettingsNode>) => {
    const { updateNodeData } = useReactFlow();

    return (
      <NodeFrame
        selected={selected}
        title="Settings"
        width={NODE_WIDTH.settings}
      >
        <div className="nodrag nopan flex flex-col gap-4 px-3 pb-3">
          <div>
            <div className={LABEL}>Aspect ratio</div>
            <AspectRatioPicker
              aria-label="Aspect ratio"
              onChange={(aspect) => updateNodeData(id, { aspect })}
              value={data.aspect}
            />
          </div>
          <div>
            <div className={LABEL}>Resolution</div>
            <ResolutionSegmented
              aria-label="Resolution"
              onChange={(resolution) => updateNodeData(id, { resolution })}
              value={data.resolution}
            />
          </div>
          <div>
            <div className={LABEL}>Strength</div>
            <StrengthSelect
              aria-label="Strength"
              onChange={(strength) => updateNodeData(id, { strength })}
              options={STRENGTHS}
              value={data.strength}
            />
          </div>
        </div>
        <Handle
          className={HANDLE}
          position={Position.Right}
          style={portStyle}
          type="source"
        />
      </NodeFrame>
    );
  }
);

const ratio = (aspect: string) => aspect.replace(":", " / ");

/** A clip, once it exists: the picture with its play mark on it, and the whole length
 *  under it as a strip with the clock on the axis. Pressing it must not pan the plane, so
 *  it says so. */
const Clip = ({ aspect, src }: { aspect: string; src: string }) => (
  <VideoPreview className="nodrag nopan gap-2" src={src}>
    <div style={{ aspectRatio: ratio(aspect) }}>
      <VideoPreviewScreen className="aspect-auto h-full rounded-lg">
        <VideoPreviewPlayOverlay />
      </VideoPreviewScreen>
    </div>
    <VideoPreviewFilmstrip label="Seek the clip">
      <VideoPreviewTime className="absolute right-1.5 bottom-1.5 rounded-md bg-black/60 px-1.5 py-0.5 text-white" />
    </VideoPreviewFilmstrip>
  </VideoPreview>
);

/**
 * One action in the dock: a glyph that names itself in a tooltip. The one action the
 * dock exists for carries its name in the row as well, through `text`.
 */
const DockButton = ({
  disabled,
  icon,
  label,
  onClick,
  text,
}: {
  disabled?: boolean;
  icon: ReactNode;
  label: string;
  onClick: () => void;
  text?: string;
}) => (
  <Tooltip>
    <TooltipTrigger asChild>
      <Button
        aria-label={label}
        className={cn(
          "rounded-full text-muted-foreground hover:text-foreground [&_svg]:size-4.5",
          text && "w-auto gap-1.5 pr-3.5 pl-2.5 font-medium"
        )}
        disabled={disabled}
        onClick={onClick}
        size="icon"
        variant="ghost"
      >
        {icon}
        {text}
      </Button>
    </TooltipTrigger>
    <TooltipContent side="top" sideOffset={10}>
      {label}
    </TooltipContent>
  </Tooltip>
);

const DockSeparator = () => (
  <span aria-hidden="true" className="mx-0.5 h-5 w-px shrink-0 bg-border" />
);

/** What the empty frame says. Not a status badge: an empty frame has one thing to tell
 *  you, and it is what to do next. */
const Say = ({ children, tone }: { children: ReactNode; tone?: "error" }) => (
  <p
    className={cn(
      "absolute inset-0 flex items-center justify-center p-4 text-center text-xs",
      tone === "error" ? "text-destructive" : "text-muted-foreground"
    )}
    role={tone === "error" ? "alert" : undefined}
  >
    {children}
  </p>
);

const ResultNodeView = memo(
  ({ data, id, selected, type }: NodeProps<ImageNode | VideoNode>) => {
    const { run, runnable } = useRun();
    const { getEdges, getNodes } = useReactFlow<CanvasNode, CanvasEdge>();

    const isVideo = type === "video";
    const pending = data.status === "pending";
    const canRunNow = runnable.has(id);
    // Read when the node draws, which a run does by changing its data; the echo under
    // the flow is for the wait, and a prompt typed during one is the next run's.
    const prompt = pending
      ? inputsOf(id, getNodes(), getEdges()).prompt
      : undefined;

    let overlay: ReactNode;
    if (data.status === "failed") {
      overlay = <Say tone="error">{data.error ?? "It did not finish."}</Say>;
    } else if (data.status === "idle") {
      overlay = (
        <Say>{canRunNow ? "Run to generate" : "Connect a prompt to run"}</Say>
      );
    }

    let label = isVideo ? "Generate video" : "Generate image";
    if (data.status === "done") {
      label = "Run again";
    } else if (data.status === "failed") {
      label = "Retry";
    }

    return (
      <NodeFrame
        actions={
          <Button
            aria-label={label}
            className="size-7"
            disabled={!canRunNow}
            onClick={() => run(id)}
            size="icon"
            type="button"
            variant="ghost"
          >
            {data.status === "done" || data.status === "failed" ? (
              <RotateCcw className="size-3.5" />
            ) : (
              <Sparkles className="size-3.5" />
            )}
          </Button>
        }
        selected={selected}
        title={isVideo ? "Video" : "Image"}
        width={NODE_WIDTH[isVideo ? "video" : "image"]}
      >
        <div className="flex flex-col gap-2 px-3 pb-3">
          {isVideo && data.status === "done" && data.src ? (
            <Clip aspect={data.aspect} src={data.src} />
          ) : (
            <div
              className="relative w-full overflow-hidden rounded-lg border border-border"
              style={{ aspectRatio: ratio(data.aspect) }}
            >
              <GenerationOverlay
                mediaSrc={isVideo ? undefined : data.src}
                overlay={overlay}
                pending={pending}
                prompt={prompt}
                seed={`${id}-${data.seed}`}
              >
                {!isVideo && data.src ? (
                  <img
                    alt="Generated result"
                    className="h-full w-full object-cover"
                    src={data.src}
                  />
                ) : null}
              </GenerationOverlay>
            </div>
          )}
          <p className="font-mono text-muted-foreground text-xs">
            seed {data.seed} · {data.aspect} · {data.resolution}
          </p>
        </div>
        <Handle
          className={HANDLE}
          position={Position.Left}
          style={portStyle}
          type="target"
        />
        {isVideo ? null : (
          <Handle
            className={HANDLE}
            position={Position.Right}
            style={portStyle}
            type="source"
          />
        )}
      </NodeFrame>
    );
  }
);

// Module-level, so the maps keep one identity for the life of the page: a new object
// every render would make the library unmount and remount every node.
const nodeTypes = {
  image: ResultNodeView,
  prompt: PromptNodeView,
  settings: SettingsNodeView,
  video: ResultNodeView,
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
    // Light travels while the node it arrives at is waiting on a result.
    const data = useNodesData<CanvasNode>(target)?.data;
    const active = Boolean(
      data && "status" in data && data.status === "pending"
    );

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
              strokeWidth={2}
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
  "--xy-connectionline-stroke-width": "2",
  "--xy-selection-background-color":
    "color-mix(in oklab, var(--ring) 10%, transparent)",
  "--xy-selection-border": "1px solid var(--ring)",
} as CSSProperties;

const DELETE_KEYS = ["Backspace", "Delete"];
const FIT = { maxZoom: 1, padding: 0.2 };

export interface GenerationCanvasProps {
  className?: string;
  /** What a run asks. Resolves with where the result is; rejects to fail the node. */
  generate: Generate;
  /** The graph the canvas opens with, and goes back to on reset. Read once. Defaults to
   *  the starter with nothing made yet. */
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

const Canvas = ({
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
  const [selection, setSelection] = useState(0);

  useOnSelectionChange({
    onChange: useCallback(
      ({ edges: picked, nodes: held }: { edges: Edge[]; nodes: unknown[] }) =>
        setSelection(picked.length + held.length),
      []
    ),
  });

  /* -- Running -------------------------------------------------------------------
   * One place starts a run, so one place can stop it. A run is a promise kept by node
   * id: asking for a node that is already running hands back the run in flight, which
   * is what makes "run all" safe when one node is the reference for another. Each run
   * holds an `AbortController`, and deleting a node or resetting the canvas aborts it.
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
      if (!(first && isResult(first))) {
        return Promise.resolve();
      }

      const controller = new AbortController();
      controllers.current.set(id, controller);

      const task = (async () => {
        // Pending before anything is waited for, so the lines into this node light up
        // at once, including while the result it starts from is still being made.
        flow.updateNodeData(id, {
          error: undefined,
          seed: first.data.seed + 1,
          src: undefined,
          status: "pending",
        });

        try {
          const { reference } = inputsOf(id, flow.getNodes(), flow.getEdges());
          if (reference && reference.data.status !== "done") {
            await runNode(reference.id);
          }
          if (controller.signal.aborted) {
            return;
          }

          const nodesNow = flow.getNodes();
          const edgesNow = flow.getEdges();
          const node = nodesNow.find((candidate) => candidate.id === id);
          const job =
            node && isResult(node) ? jobOf(node, nodesNow, edgesNow) : null;
          if (!job) {
            throw new Error("Connect a prompt to run this.");
          }

          const started = inputsOf(id, nodesNow, edgesNow).reference;
          if (started && started.data.status !== "done") {
            throw new Error("The image it starts from did not finish.");
          }

          flow.updateNodeData(id, {
            aspect: job.aspect,
            resolution: job.resolution,
          });
          const { src } = await generate(job, controller.signal);
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
    [flow, generate]
  );

  const runAll = useCallback(() => {
    const all = flow.getNodes();
    const current = flow.getEdges();
    const ids = all
      .filter((node) => canRun(node, all, current))
      .toSorted(
        (a, b) => depthOf(a.id, all, current) - depthOf(b.id, all, current)
      )
      .map((node) => node.id);

    return Promise.all(ids.map(run));
  }, [flow, run]);

  const stopAll = useCallback(() => {
    for (const controller of controllers.current.values()) {
      controller.abort();
    }
    controllers.current.clear();
    inflight.current.clear();
  }, []);

  // A node that is deleted mid-run stops its run, and the run's result is dropped.
  const onNodesDelete = useCallback((gone: CanvasNode[]) => {
    for (const node of gone) {
      controllers.current.get(node.id)?.abort();
    }
  }, []);

  const runnableKey = useMemo(
    () =>
      nodes
        .filter((node) => canRun(node, nodes, edges))
        .map((node) => node.id)
        .join(","),
    [edges, nodes]
  );
  const runContext = useMemo<RunContextValue>(
    () => ({
      run: (id) => {
        void run(id);
      },
      // Keyed by its contents, so a node being dragged does not hand every node a new
      // set to re-render against.
      runnable: new Set(runnableKey ? runnableKey.split(",") : []),
    }),
    [run, runnableKey]
  );

  const onConnect = useCallback(
    (connection: Connection) =>
      setEdges((current) => addEdge({ ...connection, type: "flow" }, current)),
    [setEdges]
  );

  const isValidConnection = useCallback(
    (connection: Connection | Edge) =>
      canConnect(connection, flow.getNodes(), flow.getEdges()),
    [flow]
  );

  const add = useCallback(
    (kind: NodeKind) => {
      const box = frame.current?.getBoundingClientRect();
      const middle = box
        ? flow.screenToFlowPosition({
            x: box.left + box.width / 2,
            y: box.top + box.height / 2,
          })
        : { x: 0, y: 0 };
      // Stepped, so a second node added without moving the first is not on top of it.
      const step = (flow.getNodes().length % 5) * 24;
      const node = createNode(kind, newId(kind), {
        x: middle.x - NODE_WIDTH[kind] / 2 + step,
        y: middle.y - 80 + step,
      });

      setNodes((current) => [
        ...current.map((other) =>
          other.selected ? { ...other, selected: false } : other
        ),
        { ...node, selected: true },
      ]);
    },
    [flow, setNodes]
  );

  const removeSelected = useCallback(() => {
    void flow.deleteElements({
      edges: flow.getEdges().filter((edge) => edge.selected),
      nodes: flow.getNodes().filter((node) => node.selected),
    });
  }, [flow]);

  const reset = useCallback(() => {
    stopAll();
    setNodes(start.nodes);
    setEdges(start.edges);
    requestAnimationFrame(() => flow.fitView(FIT));
  }, [flow, setEdges, setNodes, start, stopAll]);

  return (
    <RunContext.Provider value={runContext}>
      <div className={cn("relative isolate size-full", className)} ref={frame}>
        <ReactFlow
          deleteKeyCode={DELETE_KEYS}
          edges={edges}
          edgeTypes={edgeTypes}
          fitView
          fitViewOptions={FIT}
          isValidConnection={isValidConnection}
          maxZoom={1.5}
          minZoom={0.3}
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
          <Background gap={20} size={1} variant={BackgroundVariant.Dots} />
          <Panel position="bottom-center">
            <div
              aria-label="Canvas"
              className="flex items-center gap-0.5 rounded-full border border-border bg-popover p-1.5 shadow-lg"
              role="toolbar"
            >
              <DockButton
                icon={<MessageSquareText />}
                label="Add a prompt"
                onClick={() => add("prompt")}
              />
              <DockButton
                icon={<SlidersHorizontal />}
                label="Add settings"
                onClick={() => add("settings")}
              />
              <DockButton
                icon={<ImageIcon />}
                label="Add an image"
                onClick={() => add("image")}
              />
              <DockButton
                icon={<Clapperboard />}
                label="Add a video"
                onClick={() => add("video")}
              />
              <DockSeparator />
              <DockButton
                disabled={runnableKey === ""}
                icon={<Play />}
                label="Run every node that can run"
                onClick={() => {
                  runAll();
                }}
                text="Run all"
              />
              <DockSeparator />
              <DockButton
                icon={<Maximize />}
                label="Fit the graph in view"
                onClick={() => flow.fitView(FIT)}
              />
              <DockButton
                disabled={selection === 0}
                icon={<Trash2 />}
                label="Delete the selection"
                onClick={removeSelected}
              />
              <DockButton
                icon={<RotateCcw />}
                label="Reset the canvas"
                onClick={reset}
              />
            </div>
          </Panel>
        </ReactFlow>
      </div>
    </RunContext.Provider>
  );
};

/**
 * The block: a plane you can pan, zoom and work in, with a dock for adding and running
 * nodes. It takes the size its parent gives it, so the parent has to give it one.
 */
export const GenerationCanvas = (props: GenerationCanvasProps) => (
  <ReactFlowProvider>
    <Canvas {...props} />
  </ReactFlowProvider>
);
