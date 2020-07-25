import React from "react";
import { MarketCard } from "./market-card";
import { Flex, Box } from "reflexbox";

export const MarketsList = ({ markets, onMarketClick }) => {
    return (
        <Flex flexWrap="wrap" width="100%" m={-3}>
            {markets.map((market) => {
                return (
                    <Box key={market.conditionId} p={3}>
                        <MarketCard {...market} onClick={onMarketClick} />
                    </Box>
                );
            })}
        </Flex>
    );
};
