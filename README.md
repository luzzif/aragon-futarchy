# Aragon Futarchy

A simple app to bring the innovation of futarchy to Aragon-based DAOs.

Powered by
[Gnosis conditional tokens framework](https://github.com/gnosis/conditional-tokens-contracts).

## General features list

- Prediction market creation (deliberate outcome amounts and expiration date).
- Use ETH (WETH) as collateral.
- Outcome shares trading (buying/selling).
- Possibility, for a market owner, to close the market ahead of time (useful as
  the app is currently in a POC state, not when used in real life situations).
- Redeem positions once a market you were invested in closes.
- Reality.eth integration to determine correct outcomes once a market has to be
  resolved (for large posted bonds, arbitration can be requested through
  Kleros).
- Use multiple collateral options.

## Nice-to-have

- Better Aragon integration to automatically perform actions once a market
  closes with a certain outcome.

## Development

In order to fire up a local Ganache network with the contracts ready to go, and
to deploy the Aragon client frontend, simply use the `yarn start` command.
