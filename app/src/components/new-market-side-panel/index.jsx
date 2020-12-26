import React, { useState, useCallback } from "react";
import { Field, Button, TextInput, IconRemove } from "@aragon/ui/dist";
import SidePanel from "@aragon/ui/dist/SidePanel";
import styled from "styled-components";
import { DateTime } from "luxon";
import { Box, Flex } from "reflexbox";
import { useTheme } from "@aragon/ui/dist/Theme";
import Info from "@aragon/ui/dist/Info";
import Link from "@aragon/ui/dist/Link";
import { useCollateralTokens } from "../../hooks/erc20";
import { useRealitioTimeout } from "../../hooks/realitio";
import DropDown from "@aragon/ui/dist/DropDown";
import { TokenIcon } from "../token-icon";

const Margin = styled.div`
    height: 16px;
`;

const OutcomesContainer = styled(Flex)`
    border-radius: 4px;
    border: solid 1px ${({ borderColor }) => borderColor};
`;

export const NewMarketSidePanel = ({ open, onClose, onCreate }) => {
    const theme = useTheme();
    const collateralTokens = useCollateralTokens();
    const realitioTimeout = useRealitioTimeout();

    const [collateralTokenIndex, setCollateralTokenIndex] = useState(0);
    const [question, setQuestion] = useState("");
    const [outcome, setOutcome] = useState("");
    const [outcomes, setOutcomes] = useState([]);
    const [endsAt, setEndsAt] = useState("");
    const [funding, setFunding] = useState("");

    const handleQuestionChange = useCallback((event) => {
        setQuestion(event.target.value);
    }, []);

    const handleOutcomeChange = useCallback((event) => {
        setOutcome(event.target.value);
    }, []);

    const handleTemporalValidityChange = useCallback((event) => {
        const stringDate = event.target.value;
        const date = DateTime.fromISO(stringDate);
        if (date < DateTime.local()) {
            return;
        }
        setEndsAt(event.target.value);
    }, []);

    const handleFundingChange = useCallback((event) => {
        setFunding(event.target.value);
    }, []);

    const handleOutcomeAddition = useCallback(() => {
        setOutcomes([...outcomes, outcome]);
        setOutcome("");
    }, [outcomes, outcome]);

    const getOutcomeRemovalHandler = (outcome) => () => {
        setOutcomes(
            outcomes.filter((mappedOutcome) => mappedOutcome !== outcome)
        );
    };

    const resetState = () => {
        // the timeout is to make the close animation
        // end on the side panel before resetting the state
        // to avoid bad-looking flickering
        setTimeout(() => {
            setQuestion("");
            setOutcome("");
            setOutcomes([]);
            setFunding("");
            setEndsAt("");
        }, 300);
    };

    const handleCreate = useCallback(() => {
        onCreate(
            collateralTokens[collateralTokenIndex].address,
            question,
            outcomes,
            funding,
            endsAt
        );
        onClose();
        resetState();
    }, [
        collateralTokenIndex,
        collateralTokens,
        endsAt,
        funding,
        onClose,
        onCreate,
        outcomes,
        question,
    ]);

    const handleClose = useCallback(() => {
        onClose();
        resetState();
    }, [onClose]);

    return (
        <SidePanel title="New market" opened={open} onClose={handleClose}>
            <Margin />
            <Field label="Question" required css>
                <TextInput
                    wide
                    value={question}
                    onChange={handleQuestionChange}
                />
            </Field>
            <Field label="Add outcome">
                <TextInput
                    adornment={
                        <Button
                            size="small"
                            label="Add"
                            mode="strong"
                            disabled={!outcome}
                            onClick={handleOutcomeAddition}
                        />
                    }
                    adornmentPosition="end"
                    wide
                    value={outcome}
                    onChange={handleOutcomeChange}
                />
            </Field>
            <Field label="Added outcomes">
                <OutcomesContainer
                    flexDirection="column"
                    borderColor={theme.border}
                >
                    {outcomes && outcomes.length > 0 ? (
                        outcomes.map((outcome, index) => (
                            <Flex
                                key={outcome + index}
                                px="16px"
                                py="8px"
                                width="100%"
                                alignItems="center"
                            >
                                <Box flexGrow="2">{outcome}</Box>
                                <Box>
                                    <IconRemove
                                        css={`
                                            color: ${theme.negative};
                                            cursor: pointer;
                                        `}
                                        onClick={getOutcomeRemovalHandler(
                                            outcome
                                        )}
                                    ></IconRemove>
                                </Box>
                            </Flex>
                        ))
                    ) : (
                        <Box px="16px" py="8px">
                            No outcomes added yet
                        </Box>
                    )}
                </OutcomesContainer>
            </Field>
            <Field label="Collateral token">
                <DropDown
                    wide
                    header="Collateral token"
                    placeholder="Collateral token"
                    selected={collateralTokenIndex}
                    onChange={setCollateralTokenIndex}
                    items={collateralTokens.map((collateral) => {
                        const { symbol, logoURI } = collateral;
                        return (
                            <Flex alignItems="center">
                                <Box mr="8px">
                                    <TokenIcon logoUri={logoURI} />
                                </Box>
                                <Box>{symbol}</Box>
                            </Flex>
                        );
                    })}
                    renderLabel={({ selectedIndex }) => {
                        const { symbol, logoURI } = collateralTokens[
                            selectedIndex
                        ];
                        return (
                            <Flex alignItems="center">
                                <Box mr="8px">
                                    <TokenIcon logoUri={logoURI} />
                                </Box>
                                <Box>{symbol}</Box>
                            </Flex>
                        );
                    }}
                />
            </Field>
            <Field label="Collateral amount">
                <TextInput
                    type="number"
                    wide
                    value={funding}
                    onChange={handleFundingChange}
                />
            </Field>
            <Field label="Closing time">
                <TextInput
                    type="datetime-local"
                    wide
                    value={endsAt}
                    onChange={handleTemporalValidityChange}
                />
            </Field>
            <Info>
                Once the market reaches its end time, people will be able to
                post answers on Reality.eth. To correct a wrong answer, people
                will have a maximum of {realitioTimeout} seconds to mark the
                correct one as such by including a sufficient bond. Read more
                about the process on{" "}
                <Link href="https://reality.eth.link/app/docs/html/dapp.html#answering-a-question">
                    the Reality.eth documentation
                </Link>
            </Info>
            <Margin />
            <Button
                mode="strong"
                wide
                label="Create"
                disabled={
                    !question ||
                    !outcomes ||
                    outcomes.length < 2 ||
                    !funding ||
                    !endsAt
                }
                onClick={handleCreate}
            />
        </SidePanel>
    );
};
