import type { AnalyzeResponse } from "../../shared/types";

export type ProgressStage =
  | "idle"
  | "uploading"
  | "validating"
  | "extracting"
  | "analyzing-gps"
  | "resolving-location"
  | "complete"
  | "error";

export const STAGE_LABELS: Record<ProgressStage, string> = {
  idle: "Waiting",
  uploading: "Uploading...",
  validating: "Validating file...",
  extracting: "Extracting metadata...",
  "analyzing-gps": "Analyzing GPS...",
  "resolving-location": "Resolving location...",
  complete: "Complete",
  error: "Error",
};

interface StreamEvent {
  stage: ProgressStage;
  [key: string]: unknown;
}

/**
 * Uploads a file to /api/analyze and reports each real pipeline stage as the
 * server emits it (newline-delimited JSON), then resolves with the final
 * result. No progress percentage is fabricated on the client.
 */
export async function analyzeFile(
  file: File,
  onStage: (stage: ProgressStage) => void,
): Promise<AnalyzeResponse> {
  onStage("uploading");

  const formData = new FormData();
  formData.append("file", file);

  let response: Response;
  try {
    response = await fetch("/api/analyze", { method: "POST", body: formData });
  } catch {
    return {
      success: false,
      error: "Unable to analyze this file.",
      reasons: ["Network error while uploading"],
    };
  }

  if (!response.ok || !response.body) {
    let reasons = ["Unexpected server error"];
    try {
      const body = (await response.json()) as AnalyzeResponse;
      if (!body.success) reasons = body.reasons;
    } catch {
      // Non-JSON error body; fall back to the generic reason above.
    }
    return { success: false, error: "Unable to analyze this file.", reasons };
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let finalResult: AnalyzeResponse | null = null;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      if (!line.trim()) continue;
      const event = JSON.parse(line) as StreamEvent;
      onStage(event.stage);
      if (event.stage === "complete" || event.stage === "error") {
        finalResult = event as unknown as AnalyzeResponse;
      }
    }
  }

  if (buffer.trim()) {
    const event = JSON.parse(buffer) as StreamEvent;
    onStage(event.stage);
    if (event.stage === "complete" || event.stage === "error") {
      finalResult = event as unknown as AnalyzeResponse;
    }
  }

  return (
    finalResult ?? {
      success: false,
      error: "Unable to analyze this file.",
      reasons: ["Connection closed before analysis finished"],
    }
  );
}
