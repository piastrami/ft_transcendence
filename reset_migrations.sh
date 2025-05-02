#!/bin/bash

color="\033[38;5;200m"
reset="\033[0m"

echo -e "${color}🧹 deleting migration tables inside db${reset}"
./manage.py dbshell << EOF 
DELETE FROM django_migrations;
EOF

echo -e "${color}🧹 erasing all model tables inside db${reset}"
./manage.py dbshell << EOF
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO myuser;
GRANT ALL ON SCHEMA public TO public;
\q
EOF

echo -e "${color}🧹 cleaning migration django files${reset}"
find . -path "*/migrations/*.py" -not -name "__init__.py" -delete

# create migrations in the right order
echo -e "${color}📦 packaging migrations...${reset}"
./manage.py makemigrations authentication
./manage.py makemigrations profiles
./manage.py makemigrations pong
./manage.py makemigrations chat
./manage.py makemigrations notifications
echo -e "${color}🔄 applying migrations...${reset}"
./manage.py migrate

# adding initial data
echo -e "${color}adding initial data...${reset}"
echo -e "${color}creating users...${reset}"
./manage.py create_users
echo -e "${color}creating profiles and games...${reset}"
./manage.py create_games

echo -e "${color}✅ migration reset done${reset}"
