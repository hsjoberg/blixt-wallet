import { Chain } from "./build";

export function chainSelect<T>(chains: {
  mainnet: T;
  testnet?: T;
  regtest?: T;
}) {
  if (Chain === "mainnet") {
    return chains.mainnet;
  } else if (Chain === "testnet") {
    return chains.testnet ?? chains.mainnet;
  } else { // regtest
    return chains.regtest ?? chains.mainnet;
  }
}
