import React, { useCallback, useState, useEffect } from "react";
import { Flex, Box } from "reflexbox";
import { textStyle } from "@aragon/ui/dist/style";
import BigNumber from "bignumber.js";
import Button from "@aragon/ui/dist/Button";
import SidePanel from "@aragon/ui/dist/SidePanel";
import styled, { css } from "styled-components";
import Field from "@aragon/ui/dist/Field";
import TextInput from "@aragon/ui/dist/TextInput";

const Margin = styled.div`
    height: 8px;
`;

export const TradingSidePanel = ({ open, outcome, onClose, buy, onTrade }) => {
    const [collateralAmount, setCollateralAmount] = useState("");
    const [estimatedShares, setEstimatedShares] = useState("0");

    useEffect(() => {
        if (collateralAmount) {
            setEstimatedShares(
                new BigNumber(collateralAmount)
                    .dividedBy(outcome.price)
                    .decimalPlaces(2)
                    .toString()
            );
        }
    }, [collateralAmount]);

    const handleCollateralAmountChange = useCallback((event) => {
        setCollateralAmount(event.target.value);
    }, []);

    const handleTrade = useCallback(() => {
        onTrade(buy, outcome, collateralAmount);
    }, [collateralAmount, outcome, buy]);

    return (
        <SidePanel
            title={`${
                buy ? "Buy" : "Sell"
            } "${outcome.label.toLowerCase()}" shares`}
            opened={open}
            onClose={onClose}
        >
            <Margin />
            <Field label="ETH to spend">
                <TextInput
                    type="number"
                    wide
                    value={collateralAmount}
                    onChange={handleCollateralAmountChange}
                />
            </Field>
            <Flex flexDirection="column" mb="16px">
                <Box
                    css={css`
                        ${textStyle("body3")}
                    `}
                >
                    Estimated shares to receive: {estimatedShares}
                </Box>
            </Flex>
            <Button
                mode={buy ? "positive" : "negative"}
                wide
                label={buy ? "Buy" : "Sell"}
                disabled={
                    !!(collateralAmount && parseFloat(collateralAmount) <= 0)
                }
                onClick={handleTrade}
            />
        </SidePanel>
    );
};
