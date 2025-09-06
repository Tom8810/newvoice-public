dev_up:
	@echo "dev環境を起動します..."
	@docker-compose --profile dev up -d
	@echo "localhost:3000でアクセス可能です"

dev_reset:
	@echo "dev環境をリセットします..."
	@docker-compose --profile dev down
	@docker-compose --profile dev build --no-cache
	@docker-compose --profile dev up -d
	@echo "dev環境のリセットが完了しました"

dev_build:
	@echo "dev環境をビルドします..."
	@docker-compose --profile dev build --no-cache
	@echo "dev環境のビルドが完了しました"

dev_stop:
	@echo "dev環境を停止します..."
	@docker-compose --profile dev stop
	@echo "dev環境を停止しました"

dev_restart:
	@echo "dev環境を再起動します..."
	@docker-compose --profile dev restart
	@echo "dev環境を再起動しました"

prod_up:
	@echo "prod環境を起動します..."
	@docker-compose --profile prod up -d
	@echo "本番ドメインにアクセス可能です"

prod_reset:
	@echo "prod環境をリセットします..."
	@docker-compose --profile prod down
	@docker-compose --profile prod build --no-cache
	@docker-compose --profile prod up -d
	@echo "prod環境のリセットが完了しました"

prod_build:
	@echo "prod環境をビルドします..."
	@docker-compose --profile prod build --no-cache
	@echo "prod環境のビルドが完了しました"

prod_stop:
	@echo "prod環境を停止します..."
	@docker-compose --profile prod stop
	@echo "prod環境を停止しました"

prod_restart:
	@echo "prod環境を再起動します..."
	@docker-compose --profile prod restart
	@echo "prod環境を再起動しました"

use_legacy_builder:
	@echo "レガシービルダーを使用します..."
	@docker buildx use default
	@export DOCKER_BUILDKIT=0
	@export COMPOSE_DOCKER_CLI_BUILD=0
	@echo "レガシービルダーの使用が設定されました"