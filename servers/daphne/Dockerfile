# Utiliser une image Python officielle
FROM python:3.10-slim

# Définir le répertoire de travail
WORKDIR /app

# Copier les fichiers du projet
COPY . /app

# Installer openssl pour générer des certificats et pip pour installer les dépendances
RUN apt-get update && apt-get install -y \
    build-essential \
    libpq-dev \
    gcc \
    openssl \
    libssl-dev \
    curl \
    gnupg \
    iproute2 -y \
    && apt-get clean && rm -rf /var/lib/apt/lists/* 

COPY requirements.txt /app

# Installer pip et wheel d'abord
RUN pip install --upgrade pip wheel setuptools
# Installer psycopg2-binary séparément d'abord
RUN pip install psycopg2-binary==2.9
# Puis installer le reste des dépendances
RUN pip install --no-cache-dir -r requirements.txt

# Générer les certificats SSL
RUN mkdir -p /etc/ssl/private /etc/ssl/certs && \
    openssl req -x509 -newkey rsa:2048 -keyout /etc/ssl/private/daphne_key.pem \
    -out /etc/ssl/certs/daphne_cert.pem -days 365 -nodes \
    -subj "/CN=localhost"

# installing wscat for debugging 
# Ajouter le dépôt officiel Node.js et installer Node.js et npm
RUN curl -fsSL https://deb.nodesource.com/setup_18.x | bash - && \
    apt-get install -y nodejs && \
    npm install -g wscat && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

EXPOSE 8001

# Commande pour lancer Daphne avec HTTPS/WSS
CMD ["daphne", "-b", "0.0.0.0", "-e", "ssl:8001:privateKey=/etc/ssl/private/daphne_key.pem:certKey=/etc/ssl/certs/daphne_cert.pem", "ft_transcendence.asgi:application"]

# test sans ssl : 
# CMD ["daphne", "-b", "0.0.0.0", "-p", "8001", "ft_transcendence.asgi:application"]
