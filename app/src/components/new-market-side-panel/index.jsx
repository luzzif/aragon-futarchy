import React, { useState, useCallback } from "react";
import { Field, Button, TextInput, IconRemove } from "@aragon/ui";
import SidePanel from "@aragon/ui/dist/SidePanel";
import styled from "styled-components";
import { DateTime } from "luxon";
import { Box, Flex } from "reflexbox";
import { useTheme } from "@aragon/ui/dist/Theme";

const Margin = styled.div`
    height: 8px;
`;

const OutcomesContainer = styled(Flex)`
    border-radius: 4px;
    border: solid 1px ${({ borderColor }) => borderColor};
`;

export const NewMarketSidePanel = ({ open, onClose, onCreate }) => {
    const theme = useTheme();

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
        setQuestion("");
        setOutcome("");
        setOutcomes([]);
        setFunding("");
        setEndsAt("");
    };

    const handleCreate = useCallback(() => {
        onCreate(question, outcomes, funding, endsAt);
        onClose();
        resetState();
    }, [onCreate, question, outcomes, funding, endsAt, onClose]);

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
            <Field label="Initial ETH funding">
                <TextInput
                    type="number"
                    wide
                    value={funding}
                    onChange={handleFundingChange}
                />
            </Field>
            <Field label="Ends at">
                <TextInput
                    type="datetime-local"
                    wide
                    value={endsAt}
                    onChange={handleTemporalValidityChange}
                />
            </Field>
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
