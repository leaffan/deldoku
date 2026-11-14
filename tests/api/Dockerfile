# PHP wie auf dem Server plus pytest aus Debian; pytest startet den PHP-Server selbst (conftest.py)
ARG PHP_VERSION=8.2
FROM php:${PHP_VERSION}-cli
RUN apt-get update \
    && apt-get install -y --no-install-recommends python3-pytest \
    && rm -rf /var/lib/apt/lists/*
ENV PYTHONDONTWRITEBYTECODE=1
