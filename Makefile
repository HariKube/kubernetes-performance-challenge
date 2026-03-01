MAKEFLAGS += --no-print-directory
MAKEFILE_DIR := $(dir $(abspath $(lastword $(MAKEFILE_LIST))))

KUBECONFIG?=~/.kube.config
API_ENDPOINT?="$$(cat $$KUBECONFIG | grep server | cut -d' ' -f6)"
USER_CRT?="$$(cat $$KUBECONFIG | grep client-certificate-data | cut -d' ' -f6 | base64 -d)"
USER_KEY?="$$(cat $$KUBECONFIG | grep client-key-data | cut -d' ' -f6 | base64 -d)"

K6_NAME?=$(USER)
K6_VUS?=10
K6_TS=$$(date +'%s')
K6_ITERS=100000
K6_DURATION=1h

DOCKER_CPU?=4
DOCKER_MEM?=1G

.DEFAULT_GOAL := help

help:
	@echo "Usage: make [target] [variables]"
	@echo ""
	@echo "Targets:"
	@echo "  start"
	@echo "  start-devbox"
	@echo "  start-docker"
	@echo ""
	@echo "Variables:"
	@echo "  KUBECONFIG  (Multi cluster config not supported)   - Current: $(KUBECONFIG)"
	@echo "  API_ENDPOINT  (If KUBECONFIG doesn't supported)    - Current: from KUBENCONFIG"
	@echo "  USER_CRT  (If KUBECONFIG doesn't supported)        - Current: from KUBENCONFIG"
	@echo "  USER_KEY  (If KUBECONFIG doesn't supported)        - Current: from KUBENCONFIG"
	@echo "  K6_NAME  (Name of the test run)                    - Current: $(K6_NAME)"
	@echo "  K6_VUS  (Virtual Users)                            - Current: $(K6_VUS)"
	@echo "  DOCKER_CPU  (CPU Limit for Docker)                 - Current: $(DOCKER_CPU)"
	@echo "  DOCKER_MEM  (Memory Limit for Docker)              - Current: $(DOCKER_MEM)"

_prepare:
	@mkdir -p results/$(K6_NAME)

start: _prepare _crds-apply
	@API_ENDPOINT=$(shell echo "$(API_ENDPOINT)" | sed 's:/*$$::') \
	USER_CRT=$(USER_CRT) \
	USER_KEY=$(USER_KEY) \
	k6 run \
		--vus=$(K6_VUS) \
		--iterations=$(K6_ITERS) \
		--duration=$(K6_DURATION) \
		--no-color \
		--summary-export=results/$(K6_NAME)/$(K6_TS)_$(K6_VUS)_sum.json \
		--insecure-skip-tls-verify \
		--out=json=results/$(K6_NAME)/$(K6_TS)_$(K6_VUS).json \
		k6_custom_resource_6_read_write.js

start-devbox: _prepare _crds-apply
	@API_ENDPOINT=$(shell echo "$(API_ENDPOINT)" | sed 's:/*$$::') \
	USER_CRT=$(USER_CRT) \
	USER_KEY=$(USER_KEY) \
	devbox run k6 run \
		--vus=$(K6_VUS) \
		--iterations=$(K6_ITERS) \
		--duration=$(K6_DURATION) \
		--no-color \
		--summary-export=results/$(K6_NAME)/$(K6_TS)_$(K6_VUS)_sum.json \
		--insecure-skip-tls-verify \
		--out=json=results/$(K6_NAME)/$(K6_TS)_$(K6_VUS).json \
		k6_custom_resource_6_read_write.js

start-docker: _prepare _crds-apply
	@docker rm -f k6s-test > /dev/null 2>&1 ||:
	@docker run --rm -it --name k6s-test \
		--net=host \
		-v $(MAKEFILE_DIR):/ws \
		-e API_ENDPOINT=$(shell echo "$(API_ENDPOINT)" | sed 's:/*$$::') \
		-e USER_CRT=$(USER_CRT) \
		-e USER_KEY=$(USER_KEY) \
		-u $$(id -u):$$(id -g) \
		-w /ws \
		--cpus="$(DOCKER_CPU)" \
		--memory="$(DOCKER_MEM)" \
		docker.io/grafana/k6:1.6.0 \
		run \
		--vus=$(K6_VUS) \
		--iterations=$(K6_ITERS) \
		--duration=$(K6_DURATION) \
		--no-color \
		--summary-export=results/$(K6_NAME)/$(K6_TS)_$(K6_VUS)_sum.json \
		--insecure-skip-tls-verify \
		--out=json=results/$(K6_NAME)/$(K6_TS)_$(K6_VUS).json \
		k6_custom_resource_6_read_write.js

_crds-apply:
	@sh -c '[ -d provider-gcp ] || git clone https://github.com/crossplane-contrib/provider-gcp.git'
	@KUBECONFIG=$(KUBECONFIG) kubectl apply -f provider-gcp/package/crds/
