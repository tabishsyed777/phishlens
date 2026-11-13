FROM python:3.12-slim
WORKDIR /app
COPY phishlens.py /app/phishlens.py
RUN useradd --create-home --uid 10001 appuser
USER appuser
ENTRYPOINT ["python", "/app/phishlens.py"]
