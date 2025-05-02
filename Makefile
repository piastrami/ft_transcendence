.ONESHELL:

.PHONY : all exec exec2 clean info 

override django_id := $(shell docker ps | grep django | head -c 12)
override daphne_id := $(shell docker ps | grep daphne | head -c 12)
override redis_id := $(shell docker ps | grep redis | head -c 12)

all: clean check_env_file set_host_ip
	@docker compose -f ./docker-compose.yml build django daphne redis db
	docker compose -f ./docker-compose.yml up -d django daphne redis db
	sleep 2
	mkdir -p staticfiles
	echo "${purple} Applying migrations inside Docker...${reset}" 
	docker compose exec django python manage.py migrate
	echo "${purple} Creating new migrations inside Docker...${reset}" 
	docker compose exec django python manage.py makemigrations
	echo "${purple} Checking for conflicting migrations...${reset}" 
	docker compose exec django python manage.py makemigrations --merge || echo "No conflicts detected."
	echo "${purple} Applying migrations inside Docker after mergemigration...${reset}" 
	docker compose exec django python manage.py migrate
	docker compose exec django python manage.py create_users
	docker compose exec django python manage.py create_games
	docker compose exec django python manage.py collectstatic --noinput

check_env_file:
	@if [ ! -f .env ]; then \
		echo "${red}Error: .env file not found in the current directory${reset}"; \
		echo "${yellow}Please create a .env file before running make commands${reset}"; \
		exit 1; \
	fi

HOST_IP := $(shell ip addr show | grep -w 'inet' | grep -v '127.0.0.1' | grep -v 'docker' | grep -v 'virtual' | head -n 1 | awk '{print $$2}' | cut -d'/' -f1)

# remote players
set_host_ip:
	@if [ -n "$(HOST_IP)" ]; then \
    	if grep -q "HOST_IP=" .env; then \
        	sed -i "s/HOST_IP=.*/HOST_IP=$(HOST_IP)/" .env; \
    	else \
        	echo "" >> .env; \
        	echo "HOST_IP=$(HOST_IP)" >> .env; \
    	fi; \
	else \
    	echo "${red}Failed to detect host IP${reset}"; \
    	exit 1; \
	fi

# get_ip
get_ip:
	@echo $(HOST_IP)

#THESE ARE TEST RULES:
login:
	echo "${green}Logging in Buse, Felise, Pia, Romina automatically${reset}"; \
	pip install selenium webdriver-manager psutil
	python multiple_logins.py $(shell grep HOST_IP .env | cut -d '=' -f 2)

# tourno:
# 	echo "${green}Creating a tournament with 4 players${reset}"; \
# 	chmod +x create_tourno.sh; \
# 	bash create_tourno.sh;

exec:
ifeq ($(strip $(django_id)),)
	@echo "No Django container was found" && exit 1
else
	@docker exec -it $(django_id) /bin/bash 2>/dev/null
endif

exec2:
ifeq ($(strip $(daphne_id)),)
	@echo "No Daphne container was found" && exit 1
else
	@docker exec -it $(daphne_id) /bin/bash 2>/dev/null
endif

exec3:
ifeq ($(strip $(redis_id)),)
	@echo "No redis container was found" && exit 1
else
	@docker exec -it $(redis_id) /bin/bash 2>/dev/null
endif

clean:
	@if [ -z "$$(docker ps -q)" ] && [ -z "$$(docker ps -aq)" ] && [ -z "$$(docker images -q)" ]; then \
	echo "${green}Already clean${reset}"; fi
	if [ ! -z "$$(docker ps -q)" ]; then docker stop $$(docker ps -q); fi
	if [ ! -z "$$(docker ps -aq)" ]; then docker rm $$(docker ps -aq); fi
	if [ ! -z "$$(docker images -q)" ]; then docker rmi $$(docker images -q); fi
	docker system prune -f
	rm -rf staticfiles/

delete: clean
	@docker volume prune -f || true
	@docker compose down -v

info:
	@echo "${green}I M A G E S ${reset}" 
	docker images
	echo "${green}C O N T A I N E R S ${reset}"
	docker ps -a
	@if [ -n "$(HOST_IP)" ]; then \
		echo "${green}Paste this link in your browser: https://$(HOST_IP):8000"; \
		echo "Remember to approve certificates on both :8000 and :8001!${reset}"; \
	else \
		echo "${red}Failed to detect host IP${reset}"; \
		exit 1; \
	fi

info-all:
	@echo "${green}I M A G E S ${reset}" 
	docker images
	echo "${green}C O N T A I N E R S ${reset}"
	docker ps -a
	echo "${green}V O L U M E S ${reset}"
	docker volume ls
	echo "${green}N E T W O R K S ${reset}"
	docker network ls

# APP_NAME has an empty string by default.
# To add an argument, run make test with an argument
# eg. make test APP_NAME=authentication 
# eg. make test APP_NAME=chat
APP_NAME ?= 

# test:
# 	docker compose -f ./docker-compose.yml build playwright
# 	docker compose -f ./docker-compose.yml up -d playwright
# 	docker compose exec django python manage.py test $(APP_NAME)
# 	docker compose exec playwright npx playwright test || (echo "Tests failed!" && exit 1)

migrate:
	@echo "${purple} Applying migrations inside Docker... ${reset}"
	@if [ -z "$(container_id)" ]; then echo "Starting django container..."; docker-compose up -d django; sleep 2; fi
	docker-compose exec django python manage.py migrate


makemigrations:
	@echo "${purple} Creating new migrations inside Docker... ${reset}"
	@if [ -z "$(container_id)" ]; then echo "Starting django container..."; docker-compose up -d django; sleep 2; fi
	docker-compose exec django python manage.py makemigrations 


merge-migrations:
	@echo "${purple} Checking for conflicting migrations... ${reset}"
	@if [ -z "$(container_id)" ]; then echo "Starting django container..."; docker-compose up -d django; sleep 2; fi
	docker-compose exec django python manage.py makemigrations --merge || echo "No conflicts detected."


reset-db:
	@echo "${purple} Stoping db service...${reset}"
	docker-compose stop db || true

	@echo "${purple} Removing db service...${reset}"
	docker-compose rm -f db || true	

	@echo "${purple} Removing postgres_data volume...${reset}"
# docker volume rm $(docker volume ls -q | grep 'postgres_data') || true
	docker volume rm my_postgres_data || true  # Ensure volume is removed
	@docker volume prune -f || true

	@echo "${purple} Restarting db service...${reset}"
	docker-compose up -d db
	sleep 2
	
	@echo "${purple} Applying migrations inside Docker...${reset}" 
	docker-compose exec django python manage.py migrate --fake-initial
	@echo "${purple} Creating new migrations inside Docker...${reset}" 
	docker-compose exec django python manage.py makemigrations
	@echo "${purple} Checking for conflicting migrations...${reset}" 
	docker-compose exec django python manage.py makemigrations --merge || echo "No conflicts detected."
	@echo "${purple} Applying migrations inside Docker after mergemigration...${reset}" 
	docker-compose exec django python manage.py migrate
	@echo "${purple} Recreating Users...${reset}"
	docker-compose exec django python manage.py create_users


# V A R I A B L E S
green=\033[32m
purple=\033[35m
red=\033[31m
reset=\033[0m

