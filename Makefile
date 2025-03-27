PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80

build-contracts:
	cd hook && forge install && forge build && cd ..
	cd avs/contracts && forge install && forge build && cd ../..

start-anvil:
	anvil

deploy-hook:
	cd hook && forge script script/DeployOracleHook.s.sol:DeployOracleHook --rpc-url http://localhost:8545 --private-key $(PRIVATE_KEY) --broadcast 
	@jq -r '.oracleHook' hook/deployments.json > hook_address.txt
	@echo "Hook deployed at:" `cat hook_address.txt`

extract-service-manager:
	@jq -r '.addresses.oracleServiceManager' avs/contracts/deployments/oracle/31337.json > service_manager_address.txt
	@echo "Service Manager Address:" `cat service_manager_address.txt`

deploy-avs:
	cd avs && npm run deploy:core && npm run deploy:oracle -- $$(cat ../hook_address.txt)
	cd avs && npm run extract:abis

set-service-manager: extract-service-manager
	cd hook && cast send --private-key $(PRIVATE_KEY) $$(cat ../hook_address.txt) "setServiceManager(address)" $$(cat ../service_manager_address.txt) --rpc-url http://localhost:8545 -- --broadcast

start-operator:
	cd avs && npm run start:operator

test:
	cast send --private-key $(PRIVATE_KEY)

test-modify-liquidity:
	cd hook && forge script script/ModifyLiquidity.s.sol:ModifyLiquidity --rpc-url http://localhost:8545 --private-key $(PRIVATE_KEY) --broadcast