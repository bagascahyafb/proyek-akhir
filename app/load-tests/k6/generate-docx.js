import http from "k6/http";
import { check, sleep } from "k6";
import { Rate } from "k6/metrics";
import { buildPayload } from "./payload.js";

const failureRate = new Rate("generate_docx_failures");

export const options = {
  scenarios: {
    ramping_generate_docx: {
      executor: "ramping-vus",
      startVUs: 1,
      stages: [
        { duration: "30s", target: 5 },
        { duration: "1m", target: 20 },
        { duration: "30s", target: 0 },
      ],
      gracefulRampDown: "10s",
    },
  },
  thresholds: {
    http_req_failed: ["rate<0.05"],
    http_req_duration: ["p(95)<5000"],
    generate_docx_failures: ["rate<0.05"],
  },
};

const BASE_URL = __ENV.BASE_URL || "http://127.0.0.1:8000";

export default function () {
  const uniqueSuffix = `${__VU}-${__ITER}`;
  const payload = buildPayload({
    Personal_Info: {
      Nama: `Load Test User ${uniqueSuffix}`,
      Email: `loadtest-${uniqueSuffix}@example.com`,
    },
  });

  const response = http.post(
    `${BASE_URL}/generate-docx`,
    JSON.stringify(payload),
    {
      headers: {
        "Content-Type": "application/json",
        "ngrok-skip-browser-warning": "true",
      },
      tags: { endpoint: "generate-docx" },
      timeout: "120s",
    }
  );

  const ok = check(response, {
    "generate-docx status 200": (r) => r.status === 200,
    "generate-docx returns docx content-type": (r) =>
      String(r.headers["Content-Type"] || "").includes(
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      ),
    "generate-docx returns non-empty file": (r) => (r.body || "").length > 0,
  });

  failureRate.add(!ok);
  sleep(1);
}
