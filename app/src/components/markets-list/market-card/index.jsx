import React, { useCallback } from "react";
import { Flex, Box } from "reflexbox";
import Card from "@aragon/ui/dist/Card";
import styled from "styled-components";
import IdentityBadge from "@aragon/ui/dist/IdentityBadge";
import ProgressBar from "@aragon/ui/dist/ProgressBar";
import { textStyle } from "@aragon/ui/dist/text-styles";

const PointerCard = styled(Card)`
    cursor: pointer;
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
    odds,
    onClick,
}) => {
    const handleLocalClick = useCallback(() => {
        onClick(conditionId);
    }, [onClick]);

    return (
        <PointerCard width="200px" height="200px" onClick={handleLocalClick}>
            <Flex
                width="100%"
                height="100%"
                p="16px"
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
                {outcomes.slice(0, 2).map((outcome, index) => {
                    const odd = odds[index];
                    return (
                        <OutcomeFlex
                            key={outcome}
                            height="40px"
                            flexDirection="column"
                            mb="8px"
                        >
                            <Box
                                css={`
                                    ${textStyle("label2")}
                                `}
                            >
                                {outcome} ({odd}%)
                            </Box>
                            <Box>
                                <ProgressBar value={odd} />
                            </Box>
                        </OutcomeFlex>
                    );
                })}
            </Flex>
        </PointerCard>
    );
};
