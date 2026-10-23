import { chatFlow } from "@/lib/workflows/chat-flow";
import { createModelCallToUIChunkTransform } from "@ai-sdk/workflow";
import type { UIMessage } from "ai";
import { createUIMessageStreamResponse } from "ai";
import { start } from "workflow/api";
import { getOrCreateCartToken } from "@/lib/cart-token";

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json();
  // Steps run outside this request, so cookies() isn't available inside the
  // workflow: resolve the cart token here (before streaming) and pass it in.
  const cartToken = await getOrCreateCartToken();
  const run = await start(chatFlow, [messages, cartToken]);
  return createUIMessageStreamResponse({
    stream: run.readable.pipeThrough(createModelCallToUIChunkTransform()),
    headers: {
      "x-workflow-run-id": run.runId,
    },
  });
}