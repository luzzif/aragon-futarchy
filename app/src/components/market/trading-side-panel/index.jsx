import React, { useState, useEffect, useCallback } from "react";
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

export const TradingSidePanel = ({
    open,
    outcomeLabel,
    sharesAmount,
    netCost,
    fee,
    onChange,
    onClose,
    buy,
    onTrade,
}) => {
    const [collateral, setCollateral] = useState("0");

    useEffect(() => {
        if (sharesAmount && netCost) {
            setCollateral(
                new BigNumber(sharesAmount)
                    .multipliedBy(netCost)
                    .plus(fee)
                    .decimalPlaces(4)
                    .toString()
            );
        }
    }, [fee, netCost, sharesAmount]);

    const handleTrade = useCallback(() => {
        onTrade(collateral);
        onClose();
        setCollateral("0");
    }, [collateral, onClose, onTrade]);

    return (
        <SidePanel
            title={`${buy ? "Buy" : "Sell"} "${outcomeLabel}" shares`}
            opened={open}
            onClose={onClose}
        >
            <Margin />
            <Field label={`Shares to ${buy ? "buy" : "sell"}`}>
                <TextInput
                    type="number"
                    wide
                    value={sharesAmount}
                    onChange={onChange}
                />
            </Field>
            <Flex flexDirection="column" mb="16px">
                <Box
                    css={css`
                        ${textStyle("body3")}
                    `}
                >
                    Estimated ETH to {buy ? `spend` : `receive`}: {collateral} (
                    {new BigNumber(fee || "0").decimalPlaces(4).toString()} fee)
                </Box>
            </Flex>
            <Button
                mode={buy ? "positive" : "negative"}
                wide
                label={buy ? "Buy" : "Sell"}
                disabled={!!(sharesAmount && parseFloat(sharesAmount) <= 0)}
                onClick={handleTrade}
            />
        </SidePanel>
    );
};
