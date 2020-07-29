import React, { useState, useEffect } from "react";
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
    onChange,
    onClose,
    buy,
    onTrade,
}) => {
    const [collateralToSpend, setCollateralToSpend] = useState("0");

    useEffect(() => {
        if (sharesAmount && netCost) {
            setCollateralToSpend(
                new BigNumber(sharesAmount)
                    .multipliedBy(netCost)
                    .decimalPlaces(4)
                    .toString()
            );
        }
    }, [netCost, sharesAmount]);

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
                    Estimated ETH to spend: {collateralToSpend}
                </Box>
            </Flex>
            <Button
                mode={buy ? "positive" : "negative"}
                wide
                label={buy ? "Buy" : "Sell"}
                disabled={!!(sharesAmount && parseFloat(sharesAmount) <= 0)}
                onClick={onTrade}
            />
        </SidePanel>
    );
};
