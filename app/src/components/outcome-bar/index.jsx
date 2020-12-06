import React from "react";
import styled from "styled-components";
import { textStyle } from "@aragon/ui";
import { Box, Flex } from "reflexbox";
import BigNumber from "bignumber.js";

const BaseBar = styled.div`
    background-color: ${({ theme }) => theme.surfaceUnder};
    width: 100%;
    height: 6px;
    border-radius: 3px;
`;

const PercentageBar = styled.div`
    background-color: ${({ color }) => color};
    width: ${({ percentage }) => percentage}%;
    height: 6px;
    border-radius: 3px;
`;

const LabelBox = styled(Box)`
    ${textStyle("label2")}
`;

const PercentageBox = styled(Box)`
    ${textStyle("body3")}
    font-size: 12px;
    color: ${({ theme }) => theme.surfaceContentSecondary};
`;

export const OutcomeBar = ({ label, price, color }) => {
    const percentage = new BigNumber(price)
        .multipliedBy(100)
        .decimalPlaces(2)
        .toString();

    return (
        <Flex
            flexDirection="column"
            height="28px"
            justifyContent="space-between"
        >
            <Flex justifyContent="space-between" mb="4px">
                <LabelBox>{label}</LabelBox>
                <PercentageBox>{percentage}%</PercentageBox>
            </Flex>
            <Box flex="1">
                <BaseBar>
                    <PercentageBar color={color} percentage={percentage} />
                </BaseBar>
            </Box>
        </Flex>
    );
};
