FROM python:3.11-slim

WORKDIR /app

# Install PostgreSQL client and dependencies
RUN apt-get update && apt-get install -y postgresql-client libpq-dev gcc

# Copy requirements first to leverage Docker caching
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade -r requirements.txt

# Copy the rest of the application
COPY . .

# Use a direct CMD instead of ENTRYPOINT to avoid line ending issues
CMD ["sh", "-c", "python migrate_to_postgres.py && python -m uvicorn main:app --host 0.0.0.0 --port 8000"]