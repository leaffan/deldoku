# PHP wie auf dem Server plus pytest aus PyPI (requirements.txt, von Dependabot gepflegt);
# pytest startet den PHP-Server selbst (conftest.py)
ARG PHP_VERSION=8.2
FROM php:${PHP_VERSION}-cli
RUN apt-get update \
    && apt-get install -y --no-install-recommends python3 python3-venv \
    && rm -rf /var/lib/apt/lists/*
# venv vorn im PATH, damit "python3" in run.sh das venv mit pytest nutzt
ENV VIRTUAL_ENV=/opt/venv PATH=/opt/venv/bin:$PATH PYTHONDONTWRITEBYTECODE=1
COPY requirements.txt /tmp/requirements.txt
RUN python3 -m venv "$VIRTUAL_ENV" \
    && pip install --no-cache-dir -r /tmp/requirements.txt
