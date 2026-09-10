import axios, { AxiosRequestConfig, AxiosResponse } from "axios";

const MAX_RATE_LIMIT_RETRIES = 2;
const DEFAULT_RETRY_SECONDS = 20;

const sleep = (milliseconds: number) =>
  new Promise((resolve) => window.setTimeout(resolve, milliseconds));

export async function postOcrWithRateLimitRetry(
  url: string,
  formData: FormData,
  config: AxiosRequestConfig,
): Promise<AxiosResponse> {
  for (let attempt = 0; ; attempt += 1) {
    try {
      return await axios.post(url, formData, config);
    } catch (error) {
      if (!axios.isAxiosError(error) || error.response?.status !== 429 || attempt >= MAX_RATE_LIMIT_RETRIES) {
        throw error;
      }

      const rawRetryAfter = Number(error.response.headers["retry-after"]);
      const retrySeconds = Number.isFinite(rawRetryAfter)
        ? Math.max(1, Math.min(rawRetryAfter, 120))
        : DEFAULT_RETRY_SECONDS;
      await sleep(retrySeconds * 1000);
    }
  }
}
