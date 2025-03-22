import { BlockField, JoinMode, LogField } from "@envio-dev/hypersync-client";
import { config as dotenvConfig } from "dotenv";
import { ConfigurationError } from "../utils/errors";

export interface IndexerConfig {
  networkName: string;
  hypersyncUrl: string;
  bearerToken: string;
  startBlock: number;
  poolManagerAddress: string;
}

interface HypersyncQueryConfig {
  fromBlock: number;
  logs: {
    topics: string[][];
    address?: string[];
  }[];
  fieldSelection: {
    log: LogField[];
    block: BlockField[];
  };
  joinMode: JoinMode;
}

export function getConfig(): IndexerConfig {
  dotenvConfig();

  const {
    NETWORK_NAME: networkName,
    HYPERSYNC_BEARER_TOKEN: bearerToken,
    START_BLOCK: startBlock,
    POOL_MANAGER_ADDRESS: poolManagerAddress,
  } = process.env;

  if (!networkName) {
    throw new ConfigurationError(
      "NETWORK_NAME environment variable is not set"
    );
  }
  if (!bearerToken) {
    throw new ConfigurationError(
      "HYPERSYNC_BEARER_TOKEN environment variable is not set"
    );
  }
  if (!poolManagerAddress) {
    throw new ConfigurationError(
      "POOL_MANAGER_ADDRESS environment variable is not set"
    );
  }

  return {
    networkName,
    hypersyncUrl: `https://${networkName}.hypersync.xyz`,
    bearerToken,
    startBlock: startBlock ? parseInt(startBlock) : 0,
    poolManagerAddress,
  };
}

export function createHypersyncQuery(
  topic0List: string[]
): HypersyncQueryConfig {
  const config = getConfig();

  return {
    fromBlock: config.startBlock,
    logs: [
      {
        topics: [topic0List],
        address: [config.poolManagerAddress],
      },
    ],
    fieldSelection: {
      log: [
        LogField.Data,
        LogField.Address,
        LogField.Topic0,
        LogField.Topic1,
        LogField.Topic2,
        LogField.Topic3,
        LogField.TransactionHash,
        LogField.BlockNumber,
      ],
      block: [BlockField.Timestamp],
    },
    joinMode: JoinMode.Default,
  };
}
