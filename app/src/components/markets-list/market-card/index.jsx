import React, { useCallback, useState, useEffect } from "react";
import { Flex, Box } from "reflexbox";
import AuiBox from "@aragon/ui/dist/Box";
import styled, { css } from "styled-components";
import IdentityBadge from "@aragon/ui/dist/IdentityBadge";
import ProgressBar from "@aragon/ui/dist/ProgressBar";
import { textStyle } from "@aragon/ui/dist/text-styles";
import BigNumber from "bignumber.js";
import { useTheme } from "@aragon/ui/dist/Theme";
import Timer from "@aragon/ui/dist/Timer";

const PointerAuiBox = styled(AuiBox)`
    cursor: pointer;
    ${(props) =>
        !props.open &&
        css`
            background: ${(props) => props.negativeColor};
        `};
`;

const EllipsizedTextBox = styled(Box)`
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
`;

const StandardText = styled.span`
    font-size: 16px;
`;

const OutcomeFlex = styled(Flex)`
    height: 40px;
    line-height: 40px;
    font-size: 16px;
`;

export const MarketCard = ({
    conditionId,
    creator,
    question,
    outcomes,
    endsAt,
    open,
    redeemed,
    onClick,
}) => {
    const theme = useTheme();
    const [pending, setPending] = useState();

    useEffect(() => {
        setPending(open && !redeemed && new Date().getTime() < endsAt * 1000);
    }, [endsAt, open, redeemed]);

    const handleLocalClick = useCallback(() => {
        onClick(conditionId);
    }, [conditionId, onClick]);

    return (
        <PointerAuiBox
            onClick={handleLocalClick}
            open={open}
            negativeColor={theme.negativeSurface}
            padding={16}
            css={`
                height: 256px;
                > div {
                    height: 100%;
                }
            `}
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
                <EllipsizedTextBox mb="16px">
                    <StandardText>{question}</StandardText>
                </EllipsizedTextBox>
                {outcomes.slice(0, 2).map((outcome, index) => {
                    const prettyPrice = new BigNumber(outcome.price);
                    return (
                        <OutcomeFlex key={index} flexDirection="column">
                            <Box
                                css={`
                                    ${textStyle("label2")}
                                `}
                            >
                                {outcome.label} (
                                {prettyPrice
                                    .multipliedBy("100")
                                    .decimalPlaces(2)
                                    .toString()}
                                %)
                            </Box>
                            <Box>
                                <ProgressBar value={prettyPrice.toNumber()} />
                            </Box>
                        </OutcomeFlex>
                    );
                })}
                <Box mb="16px" height="24px">
                    {outcomes && outcomes.length > 2 && "More outcomes hidden"}
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
