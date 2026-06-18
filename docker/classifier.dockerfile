FROM python:3.12-slim

WORKDIR /app

# Cài đặt hatchling (build backend)
RUN pip install hatchling

# Copy toàn bộ source code
COPY . .

# Install dependencies (không dùng mode editable -e trong docker)
RUN pip install --no-cache-dir .

# Port sẽ map ra
EXPOSE 8000

# Chạy FastAPI
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
