.DEFAULT_GOAL := serve

help: ## Show all Makefile targets
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-30s\033[0m %s\n", $$1, $$2}'

update: ## Update Quartz to the latest version on Github
	go install github.com/jackyzha0/hugo-obsidian@latest
	@git remote show upstream || (echo "remote 'upstream' not present, setting 'upstream'" && git remote add upstream https://github.com/jackyzha0/quartz.git)
	git fetch upstream
	git log --oneline --decorate --graph ..upstream/hugo
	git checkout -p upstream/hugo -- layouts .github Makefile assets/js assets/styles/base.scss assets/styles/darkmode.scss config.toml data

update-force: ## Forcefully pull all changes and don't ask to patch
	go install github.com/jackyzha0/hugo-obsidian@latest
	@git remote show upstream || (echo "remote 'upstream' not present, setting 'upstream'" && git remote add upstream https://github.com/jackyzha0/quartz.git)
	git fetch upstream
	git checkout upstream/hugo -- layouts .github Makefile assets/js assets/styles/base.scss assets/styles/darkmode.scss config.toml data

.PHONY: build serve build-graph validate

node_modules: package.json package-lock.json
	npm install

build-graph: ## Build the rhizomatic graph JSON
	node scripts/regenerate-graph.js

build: node_modules build-graph ## Build the Hugo site
	hugo-obsidian -input=content -output=assets/indices -index -root=.
	hugo --minify

serve: node_modules build-graph ## Serve Quartz locally
	hugo-obsidian -input=content -output=assets/indices -index -root=.
	hugo server --enableGitInfo --minify --bind=$(or $(HUGO_BIND),0.0.0.0) --baseURL=$(or $(HUGO_BASEURL),http://localhost) --port=$(or $(HUGO_PORT),1313) --appendPort=$(or $(HUGO_APPENDPORT),true)

validate: node_modules ## Validate JSON data files against the schema
	npx ajv validate -s tauira-schema.json -d "data/nodes/*.json" --errors=json
	npx ajv validate -s tauira-schema.json -d "data/edges/*.json" --errors=json

docker: ## Serve locally using Docker
	docker run -it --volume=$(shell pwd):/quartz -p 1313:1313 ghcr.io/jackyzha0/quartz:hugo
