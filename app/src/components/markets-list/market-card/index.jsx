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

const Number = styled.span`
    font-size: 16px;
    font-weight: 700;
    margin-right: 8px;
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
    number,
    creator,
    question,
    outcomes,
    endsAt,
    open,
    onClick,
}) => {
    const theme = useTheme();
    const [pending, setPending] = useState();

    useEffect(() => {
        setPending(open && new Date().getTime() < endsAt * 1000);
    }, [endsAt, open]);

    const handleLocalClick = useCallback(() => {
        onClick(conditionId);
    }, [conditionId, onClick]);

    return (
        <PointerAuiBox
            pending={pending}
            onClick={handleLocalClick}
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
                <EllipsizedTextBox mb="16px">
                    <Number>#{number}:</Number>
                    <StandardText>{question}</StandardText>
                </EllipsizedTextBox>
                {outcomes.map((outcome, index) => {
                    const prettyPrice = new BigNumber(outcome.price);
                    return (
                        <OutcomeFlex
                            key={index}
                            height="40px"
                            flexDirection="column"
                            mb="8px"
                        >
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
                {
                    <Flex flexDirection="column">
                        <Box>
                            <Timer
                                end={
                                    pending
                                        ? new Date(endsAt * 1000)
                                        : new Date(0)
                                }
                            />
                        </Box>
                    </Flex>
                }
            </Flex>
        </PointerAuiBox>
    );
};
