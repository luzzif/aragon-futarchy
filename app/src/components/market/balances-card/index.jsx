import React from "react";
import AuiBox from "@aragon/ui/dist/Box";
import { Box, Flex } from "reflexbox";
import BigNumber from "bignumber.js";
import { fromWei } from "web3-utils";
import { textStyle } from "@aragon/ui/dist/text-styles";
import { useTheme } from "@aragon/ui/dist/Theme";

export const BalancesCard = ({ outcomes }) => {
    const theme = useTheme();

    return (
        <>
            <AuiBox heading="Your positions">
                <Flex flexDirection="column" alignItems="center">
                    <Flex mb="8px" justifyContent="space-between" width="100%">
                        <Box
                            css={`
                                ${textStyle("label2")}
                                color: ${theme.contentSecondary};
                            `}
                        >
                            Outcome
                        </Box>
                        <Box
                            css={`
                                ${textStyle("label2")}
                                color: ${theme.contentSecondary};
                            `}
                        >
                            Shares
                        </Box>
                    </Flex>
                    <Flex flexDirection="column" width="100%">
                        {outcomes.map((mappedOutcome, index) => (
                            <Flex
                                key={index}
                                justifyContent="space-between"
                                mb="8px"
                            >
                                <Box display="flex" alignItems="center">
                                    {mappedOutcome.label}
                                </Box>
                                <Box>
                                    {new BigNumber(
                                        fromWei(mappedOutcome.balance)
                                    )
                                        .decimalPlaces(4)
                                        .toString()}
                                </Box>
                            </Flex>
                        ))}
                    </Flex>
                </Flex>
            </AuiBox>
        </>
    );
};
