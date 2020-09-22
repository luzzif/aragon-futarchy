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

## Nice-to-have

- Proper oracle (Kleros, Realit.io) implementation to determine correct outcomes
  once a market has to be resolved.
- Unwrap ETH before actually sending it back to the user (right now on shares
  sell and position redeems, WETH is sent back, even though when collateralizing
  a market or buying, raw ETH is used and wrapped on demand).
- ~~On trade, actually transfer the ERC1155 tokens to the user (for simplicity's
  sake, right now the Aragon app's contract holds all the tokens and keeps track
  of which address possesses how much tokens for a certain position, in order to
  avoid manually setting the allowance).~~
- Use multiple collateral options.

## Development

In order to fire up a local Ganache network with the contracts ready to go, and
to deploy the Aragon client frontend, simply use the `yarn start` command.

## Demo

A brief demo video explaining how the app works is available
[here](https://youtu.be/h5jGkKMqcDU).
