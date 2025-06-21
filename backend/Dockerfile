# ---- Builder Stage ----
# Use a specific slim version for better reproducibility and security.
FROM python:3.12-slim as builder

# Set environment variables to optimize Python and pip
ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1

# Create a virtual environment
RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

WORKDIR /app

# Copy only the requirements file to leverage Docker layer caching
COPY requirements.txt ./

# Upgrade pip and install dependencies into the virtual environment
RUN pip install --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt


# ---- Final Stage ----
# This is the final, smaller, and more secure image
FROM python:3.12-slim as final

WORKDIR /app

# Create a non-root user and group
RUN groupadd -r app && useradd --no-log-init -r -g app app

# Copy the virtual environment from the builder stage
COPY --from=builder /opt/venv /opt/venv

# Copy the application code
COPY app ./app

# Change ownership of the app directory to the non-root user
RUN chown -R app:app /app

# Switch to the non-root user
USER app

# Make the virtual environment available to the new user
ENV PATH="/opt/venv/bin:$PATH"

# Expose the port
EXPOSE 8000

# Set the command to run the application
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
