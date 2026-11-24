import { countsAsComment } from "./classify.mjs";

const noComments = {
  create(context) {
    const source = context.sourceCode ?? context.getSourceCode();
    return {
      Program() {
        for (const comment of source.getAllComments()) {
          if (countsAsComment(comment.value ?? "")) {
            context.report({ loc: comment.loc, messageId: "comment" });
          }
        }
      },
    };
  },
  meta: {
    docs: {
      description:
        "Comments are decisions or dead weight; decisions belong in docs/adr/, dead weight is deleted.",
    },
    messages: {
      comment:
        "Comments are banned in this path. Delete it, or move the decision it records to docs/adr/.",
    },
    schema: [],
    type: "suggestion",
  },
};

export default {
  meta: { name: "motif" },
  rules: { "no-comments": noComments },
};
