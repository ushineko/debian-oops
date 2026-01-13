.PHONY: help up down shell logs clean

.DEFAULT_GOAL := help

help: ## Show this help
	@echo "OOPS (Openly Operating Public Shell) Manager"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-30s\033[0m %s\n", $$1, $$2}'

up: ## Start the container in detached mode
	docker compose up -d --build

down: ## Stop and remove the container
	docker compose down

shell: ## Enter the container with bash
	docker exec -it -w /root debian_oops zsh

logs: ## View logs
	docker compose logs -f

clean: ## Remove containers, networks, and images
	docker compose down --rmi all --volumes --remove-orphans

size: ## Show the size of the container image
	@docker compose images -q | xargs docker inspect -f '{{ .Size }}' | awk '{ sum=$$1; printf "%.2f MB\n", sum/1024/1024 }'
