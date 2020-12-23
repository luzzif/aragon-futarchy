import React, { useState, useCallback, useEffect } from "react";
import AuiBox from "@aragon/ui/dist/Box";
import { Box, Flex } from "reflexbox";
import { TradeDetail } from "./trade-detail";
import Button from "@aragon/ui/dist/Button";
import { useAragonApi } from "@aragon/api-react";
import BigNumber from "bignumber.js";
import { fromWei, toWei } from "web3-utils";
import lsmrMarketMakerAbi from "../../../abi/lmsr-market-maker.json";
import conditionalTokensAbi from "../../../abi/conditional-tokens.json";
import TextInput from "@aragon/ui/dist/TextInput";
import Radio from "@aragon/ui/dist/Radio";
import { textStyle } from "@aragon/ui/dist/text-styles";
import { useTheme } from "@aragon/ui/dist/Theme";
import { SideSwitcher } from "./side-switcher";
import { useApproved } from "../../../hooks/allowance";

export const TradingCard = ({ outcomes, conditionId }) => {
    const { api, currentApp } = useAragonApi();
    const theme = useTheme();
    const approved = useApproved();

    const [buy, setBuy] = useState(true);
    const [amount, setAmount] = useState("");
    const [outcome, setOutcome] = useState(outcomes[0]);
    const [sellable, setSellable] = useState(false);
    const [netCost, setNetCost] = useState(new BigNumber(0));
    const [totalCost, setTotalCost] = useState(new BigNumber(0));
    const [fee, setFee] = useState(new BigNumber(0));
    const [locallyApproved, setLocallyApproved] = useState(approved);

    const handleTrade = useCallback(() => {
        const trade = buy ? api.buy : api.sell;
        const weiTotalCost = toWei(totalCost.toString());
        trade(
            conditionId,
            outcomes.map((mappedOutcome) => {
                if (mappedOutcome !== outcome) {
                    return 0;
                }
                const tradedAmount = toWei(amount.toString());
                return tradedAmount;
            }),
            new BigNumber(weiTotalCost).absoluteValue().toString(),
            { value: buy ? weiTotalCost : 0 }
        ).subscribe(() => {}, console.error);
        setAmount("");
        setOutcome(outcomes[0]);
        setSellable(false);
        setNetCost(new BigNumber(0));
        setTotalCost(new BigNumber(0));
        setFee(new BigNumber(0));
    }, [amount, api, buy, conditionId, outcome, outcomes, totalCost]);

    const handleApprovalRequest = useCallback(() => {
        const handleApproval = async () => {
            const conditionalTokensInstance = api.external(
                await api.call("conditionalTokens").toPromise(),
                conditionalTokensAbi
            );
            await conditionalTokensInstance
                .setApprovalForAll(currentApp.appAddress, true)
                .toPromise();
            setLocallyApproved(true);
        };
        handleApproval();
    }, [api, currentApp]);

    useEffect(() => {
        setSellable(
            outcome &&
                amount &&
                new BigNumber(toWei(amount || "0")).isLessThanOrEqualTo(
                    outcome.balance
                )
        );
    }, [outcome, amount]);

    useEffect(() => {
        if (!outcome && outcomes.length > 0) {
            setOutcome(outcomes[0]);
        }
    }, [outcome, outcomes]);

    useEffect(() => {
        setLocallyApproved(approved);
    }, [approved]);

    useEffect(() => {
        const getTradeDetails = async () => {
            const { marketMaker: marketMakerAddress } = await api
                .call("marketData", conditionId)
                .toPromise();
            const marketMakerInstance = await api.external(
                marketMakerAddress,
                lsmrMarketMakerAbi
            );
            const weiNetCost = await marketMakerInstance
                .calcNetCost(
                    outcomes.map((mappedOutcome) => {
                        if (mappedOutcome !== outcome) {
                            return 0;
                        }
                        const tradedAmount = toWei(amount.toString());
                        return buy
                            ? tradedAmount
                            : new BigNumber(tradedAmount).negated().toString();
                    })
                )
                .toPromise();
            const netCost = new BigNumber(fromWei(weiNetCost));
            setNetCost(netCost);
            const fee = new BigNumber(
                fromWei(
                    await marketMakerInstance
                        .calcMarketFee(
                            new BigNumber(weiNetCost).absoluteValue().toString()
                        )
                        .toPromise()
                )
            );
            setFee(fee);
            setTotalCost(netCost.plus(fee));
        };
        if (outcome && amount) {
            getTradeDetails();
        } else {
            setNetCost(new BigNumber(0));
            setFee(new BigNumber(0));
            setTotalCost(new BigNumber(0));
        }
    }, [amount, api, buy, conditionId, outcome, outcomes]);

    const handleOutcomeChange = useCallback(
        (radioId) => {
            setOutcome(outcomes[parseInt(radioId)]);
        },
        [outcomes]
    );

    const handleAmountChange = useCallback((event) => {
        setAmount(event.target.value);
    }, []);

    const handleSideChange = useCallback(() => {
        setBuy(!buy);
    }, [buy]);

    const getButtonText = useCallback(() => {
        if (buy) {
            return "Confirm";
        }
        if (!locallyApproved) {
            return "Approve tokens";
        }
        return !sellable ? "Can't sell" : "Confirm";
    }, [locallyApproved, buy, sellable]);

    const isButtonDisabled = useCallback(() => {
        if (!buy && !locallyApproved) {
            return false;
        }
        return !amount || !outcome || (!buy && !sellable);
    }, [amount, locallyApproved, buy, outcome, sellable]);

    return (
        <>
            <AuiBox heading="Trading">
                <Flex flexDirection="column" alignItems="center">
                    <Flex width="100%" mb="12px">
                        <SideSwitcher buy={buy} onChange={handleSideChange} />
                    </Flex>
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
                            Balance
                        </Box>
                    </Flex>
                    <Flex mb="4px" flexDirection="column" width="100%">
                        {outcomes.map((mappedOutcome, index) => (
                            <Flex
                                key={index}
                                justifyContent="space-between"
                                mb="8px"
                            >
                                <Box display="flex" alignItems="center">
                                    <Radio
                                        id={index}
                                        checked={
                                            outcomes.findIndex(
                                                (o) =>
                                                    o.positionId ===
                                                    outcome.positionId
                                            ) === index
                                        }
                                        onChange={handleOutcomeChange}
                                        css={`
                                            margin-right: 8px;
                                        `}
                                    />
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
                    <Box mb="16px" width="100%">
                        <TextInput
                            wide
                            type="number"
                            value={amount}
                            onChange={handleAmountChange}
                            placeholder="Shares amount"
                        />
                    </Box>
                    <Flex flexDirection="column" width="100%" mb="12px">
                        <TradeDetail
                            title={`Net ${buy ? "cost" : "gain"}`}
                            value={netCost
                                .absoluteValue()
                                .decimalPlaces(4)
                                .toString()}
                            currency="ETH"
                        />
                        <TradeDetail
                            title="Fee"
                            value={fee
                                .absoluteValue()
                                .decimalPlaces(4)
                                .toString()}
                            currency="ETH"
                        />
                        <TradeDetail
                            title="Total cost"
                            value={totalCost
                                .absoluteValue()
                                .decimalPlaces(4)
                                .toString()}
                            currency="ETH"
                        />
                    </Flex>
                    <Flex flexDirection="column" width="100%" mb="12px">
                        <Button
                            mode="strong"
                            disabled={isButtonDisabled()}
                            onClick={
                                locallyApproved || buy
                                    ? handleTrade
                                    : handleApprovalRequest
                            }
                        >
                            {getButtonText()}
                        </Button>
                    </Flex>
                </Flex>
            </AuiBox>
        </>
    );
};
