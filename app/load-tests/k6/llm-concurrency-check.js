import http from "k6/http";
import { check, sleep } from "k6";
import { Counter, Rate } from "k6/metrics";
import { buildPayload } from "./payload.js";

const failureRate = new Rate("llm_concurrency_failures");
const successCount = new Counter("llm_concurrency_success");

export const options = {
  scenarios: {
    above_five_users: {
      executor: "ramping-vus",
      startVUs: 1,
      stages: [
        { duration: "30s", target: 6 },
        { duration: "1m", target: 6 },
        { duration: "30s", target: 10 },
        { duration: "1m", target: 10 },
        { duration: "30s", target: 15 },
        { duration: "1m", target: 15 },
        { duration: "30s", target: 0 },
      ],
      gracefulRampDown: "20s",
    },
  },
  thresholds: {
    http_req_failed: ["rate<0.15"],
    http_req_duration: ["p(95)<60000"],
    llm_concurrency_failures: ["rate<0.15"],
  },
};

const BASE_URL = __ENV.BASE_URL || "http://127.0.0.1:8000";

function buildLlmPayload() {
  const uniqueSuffix = `${__VU}-${__ITER}`;

  return buildPayload({
    Personal_Info: {
      Nama: `LLM Concurrent User ${uniqueSuffix}`,
      Email: `llm-concurrency-${uniqueSuffix}@example.com`,
      Summary:
        "Entry-level professional testing concurrent LLM polishing workflow under load.",
    },
    Language: __ENV.CV_LANGUAGE || "English",
  });
}

export default function () {
  const payload = buildLlmPayload();

  const response = http.post(`${BASE_URL}/enhance-cv`, JSON.stringify(payload), {
    headers: {
      "Content-Type": "application/json",
      "ngrok-skip-browser-warning": "true",
    },
    tags: { endpoint: "enhance-cv", test_type: "llm-concurrency" },
    timeout: "240s",
  });

  const ok = check(response, {
    "llm enhance status 200": (r) => r.status === 200,
    "llm enhance content-type json": (r) =>
      String(r.headers["Content-Type"] || "").includes("application/json"),
    "llm enhance body not empty": (r) => Boolean(r.body),
  });

  if (ok) {
    successCount.add(1);
  }

  failureRate.add(!ok);
  sleep(1);
}
