FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        libreoffice \
        poppler-utils \
        fonts-dejavu \
    && rm -rf /var/lib/apt/lists/*

RUN groupadd --system --gid 10001 gencvats \
    && useradd --system --uid 10001 --gid gencvats --create-home gencvats

COPY requirements-backend.txt .
RUN pip install --no-cache-dir -r requirements-backend.txt

COPY --chown=gencvats:gencvats api.py .
COPY --chown=gencvats:gencvats lib ./lib

RUN mkdir -p /app/uploaded_files \
    && chown -R gencvats:gencvats /app/uploaded_files

ENV HOME=/tmp
USER gencvats

EXPOSE 8000

CMD ["uvicorn", "api:app", "--host", "0.0.0.0", "--port", "8000", "--limit-concurrency", "32", "--backlog", "64", "--timeout-keep-alive", "5", "--no-server-header"]
