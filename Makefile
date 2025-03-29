.PHONY: master build-contracts deploy-hook deploy-avs set-service-manager start-operator start-simulator

PRIVATE_KEY=$(shell grep PRIVATE_KEY hook/.env | cut -d '=' -f2)
STATE_VIEW_ADDRESS=$(shell jq -r '.STATE_VIEW' avs/contracts/deployments.json)
DEPLOYMENTS_FILE=hook/deployments.json

build-contracts:
	cd hook && forge install && forge build && cd ..
	cd avs/contracts && forge install && forge build && cd ../..

start-anvil:
	anvil

deploy-hook:
	cp hook/.env.example hook/.env
	cd hook && forge script script/DeployOracleHook.s.sol:DeployOracleHook --rpc-url http://localhost:8545 --private-key $(PRIVATE_KEY) --broadcast
	@echo "Hook deployed at:" $$(jq -r '.oracleHook' $(DEPLOYMENTS_FILE))

deploy-avs:
	cp avs/.env.example avs/.env
	cp avs/contracts/.env.example avs/contracts/.env
	cd avs && npm run deploy:core && npm run deploy:oracle -- $$(jq -r '.oracleHook' ../$(DEPLOYMENTS_FILE))
	cd avs && npm run extract:abis

set-service-manager:
	@echo "Fetching Service Manager Address..."
	$(eval SERVICE_MANAGER := $(shell jq -r '.addresses.oracleServiceManager' avs/contracts/deployments/oracle/31337.json))
	$(eval HOOK_ADDRESS := $(shell jq -r '.oracleHook' $(DEPLOYMENTS_FILE)))
	cd hook && cast send --private-key $(PRIVATE_KEY) $(HOOK_ADDRESS) "setServiceManager(address)" $(SERVICE_MANAGER) --rpc-url http://localhost:8545 -- --broadcast

update-state-view:
	@echo "Fetching State View Address..."
	$(eval STATE_VIEW := $(shell jq -r '.stateView' $(DEPLOYMENTS_FILE)))
	@echo "Updating avs/.env..."
	sed -i'' -e 's/^STATE_VIEW_ADDRESS=.*/STATE_VIEW_ADDRESS=$(STATE_VIEW)/' avs/.env

	@echo "Updated avs/.env with STATE_VIEW_ADDRESS=$(STATE_VIEW)"

start-operator: update-state-view
	cd avs && npm i && npm run start:operator 

test-modify-liquidity:
	@echo "Fetching deployed contract addresses from $(DEPLOYMENTS_FILE)..."
	@LP_ROUTER=$$(jq -r '.liquidityRouter' $(DEPLOYMENTS_FILE)) && \
	TOKEN0=$$(jq -r '.token0' $(DEPLOYMENTS_FILE)) && \
	TOKEN1=$$(jq -r '.token1' $(DEPLOYMENTS_FILE)) && \
	HOOK=$$(jq -r '.oracleHook' $(DEPLOYMENTS_FILE)) && \
	echo "Using LP_ROUTER: $$LP_ROUTER, TOKEN0: $$TOKEN0, TOKEN1: $$TOKEN1, HOOK: $$HOOK" && \
	cd hook && forge script script/ModifyLiquidity.s.sol --rpc-url http://localhost:8545 --broadcast --sig "run(address,address,address,address)" $$LP_ROUTER $$TOKEN0 $$TOKEN1 $$HOOK

start-simulator:
	@echo "Fetching Mock Liquidity Router Address..."
	$(eval ROUTER_ADDRESS := $(shell jq -r '.mockModifyLiquidity' $(DEPLOYMENTS_FILE)))
	@echo "Updating simulator/.env..."
	sed -i'' -e 's/^ROUTER_ADDRESS=.*/ROUTER_ADDRESS=$(ROUTER_ADDRESS)/' simulator/.env

	@echo "Updated simulator/.env with ROUTER_ADDRESS=$(ROUTER_ADDRESS)"
	cd simulator && npm run start

start-dashboard:
	@echo "Fetching Oracle Hook Address..."
	$(eval ORACLE_ADDRESS := $(shell jq -r '.oracleHook' $(DEPLOYMENTS_FILE)))
	@echo "Updating dashboard/.env..."
	sed -i'' -e 's/^VITE_ORACLE_ADDRESS=.*/VITE_ORACLE_ADDRESS=$(ORACLE_ADDRESS)/' dashboard/.env

	@echo "Updated dashboard/.env with VITE_ORACLE_ADDRESS=$(ORACLE_ADDRESS)"
	cd dashboard && npm run dev 
	@echo "Starting dashboard..."

master: build-contracts deploy-hook deploy-avs set-service-manager start-operator