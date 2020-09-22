import React, { useState, useEffect } from "react";
import { Flex, Box } from "reflexbox";
import AuiBox from "@aragon/ui/dist/Box";
import styled, { css } from "styled-components";
import IdentityBadge from "@aragon/ui/dist/IdentityBadge";
import { textStyle } from "@aragon/ui/dist/text-styles";
import BigNumber from "bignumber.js";
import { useTheme } from "@aragon/ui/dist/Theme";
import Timer from "@aragon/ui/dist/Timer";
import { Distribution } from "@aragon/ui";

const PointerAuiBox = styled(AuiBox)`
    cursor: pointer;
    ${(props) =>
        !props.open &&
        css`
            background: ${(props) => props.negativeColor};
        `};
`;

export const MarketCard = ({
    creator,
    question,
    outcomes,
    endsAt,
    open,
    redeemed,
}) => {
    const theme = useTheme();
    const [pending, setPending] = useState();

    useEffect(() => {
        setPending(open && !redeemed && new Date().getTime() < endsAt * 1000);
    }, [endsAt, open, redeemed]);

    return (
        <PointerAuiBox
            open={open}
            negativeColor={theme.negativeSurface}
            padding={16}
        >
            <Flex
                width="100%"
                height="100%"
                overflow="hidden"
                flexDirection="column"
            >
                <Box mb="16px">
                    <IdentityBadge entity={creator} badgeOnly shorten />
                </Box>
                <Box mb="16px">
                    <Distribution
                        heading={question}
                        items={outcomes.map((outcome) => ({
                            item: outcome.label,
                            percentage: new BigNumber(outcome.price)
                                .multipliedBy("100")
                                .decimalPlaces(2)
                                .toNumber(),
                        }))}
                    />
                </Box>
                <Flex
                    flexDirection="column"
                    height="100%"
                    justifyContent="flex-end"
                >
                    <Box maxHeight="24px">
                        {pending && (
                            <Timer
                                end={
                                    open && new Date().getTime() < endsAt * 1000
                                        ? new Date(endsAt * 1000)
                                        : new Date(0)
                                }
                            />
                        )}
                        {redeemed && (
                            <span
                                css={`
                                    ${textStyle("body1")}
                                    color: ${theme.negative};
                                `}
                            >
                                Positions redeemed
                            </span>
                        )}
                        {!open && !redeemed && (
                            <span
                                css={`
                                    ${textStyle("body2")}
                                `}
                            >
                                Closed
                            </span>
                        )}
                    </Box>
                </Flex>
            </Flex>
        </PointerAuiBox>
    );
};
