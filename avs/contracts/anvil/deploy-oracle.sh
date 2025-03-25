#!/usr/bin/env bash

set -e

RPC_URL=http://localhost:8545
PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80

# Ensure an argument is provided
if [ -z "$1" ]; then
    echo "Usage: $0 <hook_address>"
    exit 1
fi

HOOK_ADDRESS=$1

# cd to the directory of this script so that this can be run from anywhere
parent_path=$(
    cd "$(dirname "${BASH_SOURCE[0]}")"
    pwd -P
)
cd "$parent_path"

cd ../

forge script script/OracleDeployer.s.sol --rpc-url $RPC_URL --broadcast --sig "run(address)" $HOOK_ADDRESS