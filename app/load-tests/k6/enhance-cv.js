import http from "k6/http";
import { check, sleep } from "k6";
import { Rate } from "k6/metrics";
import { buildPayload } from "./payload.js";

const failureRate = new Rate("enhance_cv_failures");

export const options = {
  scenarios: {
    ramping_enhance_cv: {
      executor: "ramping-vus",
      startVUs: 1,
      stages: [
        { duration: "30s", target: 2 },
        { duration: "1m", target: 5 },
        { duration: "30s", target: 0 },
      ],
      gracefulRampDown: "10s",
    },
  },
  thresholds: {
    http_req_failed: ["rate<0.1"],
    http_req_duration: ["p(95)<30000"],
    enhance_cv_failures: ["rate<0.1"],
  },
};

const BASE_URL = __ENV.BASE_URL || "http://127.0.0.1:8000";

export default function () {
  const uniqueSuffix = `${__VU}-${__ITER}`;
  const payload = buildPayload({
    Personal_Info: {
      Nama: `Enhance User ${uniqueSuffix}`,
      Email: `enhance-${uniqueSuffix}@example.com`,
    },
  });

  const response = http.post(
    `${BASE_URL}/enhance-cv`,
    JSON.stringify(payload),
    {
      headers: {
        "Content-Type": "application/json",
        "ngrok-skip-browser-warning": "true",
      },
      tags: { endpoint: "enhance-cv" },
      timeout: "180s",
    }
  );

  const ok = check(response, {
    "enhance-cv status 200": (r) => r.status === 200,
    "enhance-cv returns json": (r) =>
      String(r.headers["Content-Type"] || "").includes("application/json"),
  });

  failureRate.add(!ok);
  sleep(1);
}
