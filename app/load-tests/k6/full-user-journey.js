import http from "k6/http";
import { check, group, sleep } from "k6";
import { Rate } from "k6/metrics";
import { buildPayload } from "./payload.js";

const journeyFailureRate = new Rate("full_user_journey_failures");

export const options = {
  scenarios: {
    full_user_journey: {
      executor: "ramping-vus",
      startVUs: 1,
      stages: [
        { duration: "30s", target: 3 },
        { duration: "1m", target: 8 },
        { duration: "30s", target: 0 },
      ],
      gracefulRampDown: "10s",
    },
  },
  thresholds: {
    http_req_failed: ["rate<0.1"],
    http_req_duration: ["p(95)<30000"],
    full_user_journey_failures: ["rate<0.1"],
  },
};

const BASE_URL = __ENV.BASE_URL || "http://127.0.0.1:8000";

function buildUniqueJourneyPayload() {
  const uniqueSuffix = `${__VU}-${__ITER}`;

  return buildPayload({
    Personal_Info: {
      Nama: `Journey User ${uniqueSuffix}`,
      Email: `journey-${uniqueSuffix}@example.com`,
      Summary:
        "Junior data professional with hands-on project experience in analytics, automation, and machine learning.",
    },
  });
}

export default function () {
  let journeyOk = true;
  const initialPayload = buildUniqueJourneyPayload();
  let enhancedPayload = initialPayload;

  group("step-1-fill-cv-data", () => {
    const dataLooksValid = check(initialPayload, {
      "payload has name": (p) => Boolean(p.Personal_Info?.Nama),
      "payload has at least one education": (p) => p.Education.length > 0,
      "payload has at least one experience": (p) => p.Experience.length > 0,
    });

    journeyOk = journeyOk && dataLooksValid;
    sleep(1);
  });

  group("step-2-enhance-cv", () => {
    const enhanceResponse = http.post(
      `${BASE_URL}/enhance-cv`,
      JSON.stringify(initialPayload),
      {
        headers: {
          "Content-Type": "application/json",
          "ngrok-skip-browser-warning": "true",
        },
        tags: { endpoint: "enhance-cv", flow: "full-journey" },
        timeout: "180s",
      }
    );

    const enhanceOk = check(enhanceResponse, {
      "enhance status 200": (r) => r.status === 200,
      "enhance returns json": (r) =>
        String(r.headers["Content-Type"] || "").includes("application/json"),
      "enhance body not empty": (r) => Boolean(r.body),
    });

    if (enhanceOk) {
      enhancedPayload = JSON.parse(enhanceResponse.body);
      if (!enhancedPayload.Language) {
        enhancedPayload.Language = initialPayload.Language;
      }
    }

    journeyOk = journeyOk && enhanceOk;
    sleep(2);
  });

  group("step-3-generate-docx", () => {
    const generateResponse = http.post(
      `${BASE_URL}/generate-docx`,
      JSON.stringify(enhancedPayload),
      {
        headers: {
          "Content-Type": "application/json",
          "ngrok-skip-browser-warning": "true",
        },
        tags: { endpoint: "generate-docx", flow: "full-journey" },
        timeout: "120s",
      }
    );

    const generateOk = check(generateResponse, {
      "generate status 200": (r) => r.status === 200,
      "generate returns docx": (r) =>
        String(r.headers["Content-Type"] || "").includes(
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        ),
      "generate file not empty": (r) => (r.body || "").length > 0,
    });

    journeyOk = journeyOk && generateOk;
    sleep(1);
  });

  journeyFailureRate.add(!journeyOk);
}
