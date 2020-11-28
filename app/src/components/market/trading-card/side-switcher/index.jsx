import React from "react";
import { Box, Flex } from "reflexbox";
import styled, { css } from "styled-components";
import Button from "@aragon/ui/dist/Button";

const CustomBuyButton = styled(Button)`
    border-top-right-radius: 0;
    border-bottom-right-radius: 0;
    ${({ theme, active }) =>
        !active &&
        css`
            background-color: ${theme.disabled};
            color: ${theme.disabledContent};
        `};
    box-shadow: none;
`;

const CustomSellButton = styled(Button)`
    border-top-left-radius: 0;
    border-bottom-left-radius: 0;
    ${({ theme, active }) =>
        !active &&
        css`
            background-color: ${theme.disabled};
            color: ${theme.disabledContent};
        `};
    box-shadow: none;
`;

export const SideSwitcher = ({ buy, onChange }) => {
    return (
        <Flex width="100%">
            <Box width="50%">
                <CustomBuyButton
                    size="small"
                    mode="positive"
                    wide
                    active={buy}
                    onClick={onChange}
                    buy
                >
                    Buy
                </CustomBuyButton>
            </Box>
            <Box width="50%">
                <CustomSellButton
                    size="small"
                    mode="negative"
                    wide
                    active={!buy}
                    onClick={onChange}
                >
                    Sell
                </CustomSellButton>
            </Box>
        </Flex>
    );
};
