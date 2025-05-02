FROM python:3.10-slim

EXPOSE 8000

RUN apt-get update && apt-get install -y \
build-essential \
# libpq-dev includes pg_config lib necessary for psycopg2
libpq-dev \     
gcc  \
postgresql-client \
curl \
openssl \
libssl-dev \
&& rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY . /app

# Installer pip et wheel d'abord
RUN pip install --upgrade pip wheel setuptools
# Installer psycopg2-binary séparément d'abord
RUN pip install psycopg2-binary==2.9
# Puis installer le reste des dépendances
RUN pip install --no-cache-dir -r requirements.txt

# make the script executable
RUN chmod 777 reset_migrations.sh

# generate a self-signed certificate
RUN mkdir -p /etc/ssl/private /etc/ssl/certs && \
    openssl req -x509 -newkey rsa:2048 -keyout /etc/ssl/private/django_key.pem \
    -out /etc/ssl/certs/django_cert.pem -days 365 -nodes \
    -subj "/CN=localhost"
# subj fills automatically the certificate request form

# starting the django server with https
CMD ["python", "manage.py", "runserver_plus", "--cert-file", "/etc/ssl/certs/django_cert.pem", "--key-file", "/etc/ssl/private/django_key.pem", "0.0.0.0:8000"]
# CMD ["python", "manage.py", "runserver", "0.0.0.0:8000"]