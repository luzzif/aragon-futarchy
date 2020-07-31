import React from "react";
import { MarketCard } from "./market-card";
import { Flex, Box } from "reflexbox";
import { Warning } from "../warning";

export const MarketsList = ({ markets, onMarketClick }) => {
    return (
        <Flex flexDirection="column">
            <Box mb="20px" mt="20px" px={3}>
                <Warning />
            </Box>
            <Flex flexWrap="wrap" width="100%">
                {markets.map((market) => {
                    return (
                        <Box
                            width={[1, 1 / 2, 1 / 3]}
                            key={market.conditionId}
                            p={3}
                        >
                            <MarketCard {...market} onClick={onMarketClick} />
                        </Box>
                    );
                })}
            </Flex>
        </Flex>
    );
};
