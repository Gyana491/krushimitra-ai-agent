import { MastraClient } from "@mastra/client-js";

import {mastra} from '../mastra'

async function main() {
  const agent = mastra.getAgent("weatherAgent");

  // streamVNext yields structured events and includes helpers (text, textStream, usage, toolCalls)
  const stream = await agent.streamVNext([
    { role: "user", content: "What is the weather in Mumbai today?" },
  ]);

  // 1) Log structured events AND 2) stream text live
  // You can either:
  // - read events and extract deltas, or
  // - concurrently read stream.textStream for straight text tokens.
  //
  // Here we do both: events loop logs tool lifecycle, and textStream prints tokens.

  // A) Event loop (tool calls/results, other lifecycle events)
  const eventsDone = (async () => {
    for await (const evt of stream) {
      switch (evt.type) {
        case "tool_call": {
          // evt.payload often includes { id, toolName, args }
          console.log("\n[tool call]", evt.payload);
          break;
        }
        case "tool_result": {
          // evt.payload often includes { id, toolName, result, error }
          console.log("\n[tool result]", evt.payload);
          break;
        }
        case "message_delta": {
          // If you prefer deltas from events instead of textStream:
          // const delta = evt.payload?.delta ?? "";
          // if (delta) process.stdout.write(delta);
          break;
        }
        default: {
          // Other lifecycle/trace events (run_started, step_started, etc.)
          // Helpful for debugging
          // console.log("[event]", evt.type, evt.payload ?? {});
          break;
        }
      }
    }
  })();

  // B) Plain text token stream for easy rendering
  const textDone = (async () => {
    for await (const chunk of stream.textStream) {
      process.stdout.write(chunk);
    }
  })();

  // Wait for both loops to complete
  await Promise.all([eventsDone, textDone]);

  // Final helpers
  if ("text" in stream) {
    console.log("\n\nFinal text:\n", await stream.text);
  }
  if ("usage" in stream) {
    console.log("[usage]", await stream.usage);
  }
  if ("toolCalls" in stream) {
    console.log("[toolCalls]", await stream.toolCalls);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});