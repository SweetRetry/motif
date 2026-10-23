import { PageTransition } from "@/components/page-transition";
import { ROUTES } from "@/constants/routes";
import { ChatAppDemo } from "@/examples/chat-app";
import { GenerationCanvasDemo } from "@/examples/generation-canvas";
import { BreadcrumbJsonLd } from "@/seo/json-ld";
import { createPageMetadata } from "@/seo/metadata";

export const dynamic = "force-static";
export const revalidate = false;

export const metadata = createPageMetadata({
  description:
    "The chat app and the canvas app running whole: the pieces assembled into the two surfaces they were made for.",
  path: ROUTES.PLAYGROUND,
  title: "Playground",
});

const SECTIONS = [
  {
    demo: <ChatAppDemo />,
    description:
      "A thread that follows its own tail, a composer, and the reasoning behind each answer.",
    title: "Chat app",
  },
  {
    demo: <GenerationCanvasDemo />,
    description:
      "A prompt and its settings feeding an image node, with light travelling the edges while it generates.",
    title: "Canvas app",
  },
];

export default function PlaygroundPage() {
  return (
    <>
      <BreadcrumbJsonLd
        items={[
          { name: "Home", path: ROUTES.HOME },
          { name: "Playground", path: ROUTES.PLAYGROUND },
        ]}
      />
      <PageTransition>
        <div className="container-wrapper pb-12 lg:pb-16">
          <div className="container flex flex-col gap-12 py-10 md:py-14">
            {SECTIONS.map(({ demo, description, title }) => (
              <section className="flex flex-col gap-4" key={title}>
                <div className="flex flex-col gap-1">
                  <h2 className="font-semibold text-xl tracking-tight">
                    {title}
                  </h2>
                  <p className="text-muted-foreground text-sm">{description}</p>
                </div>
                {demo}
              </section>
            ))}
          </div>
        </div>
      </PageTransition>
    </>
  );
}
