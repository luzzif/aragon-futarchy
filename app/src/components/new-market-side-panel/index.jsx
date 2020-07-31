import React, { useState, useCallback } from "react";
import { Field, Button, TextInput, IconRemove } from "@aragon/ui";
import SidePanel from "@aragon/ui/dist/SidePanel";
import styled from "styled-components";
import { DateTime, Duration } from "luxon";
import DateRangePicker from "@aragon/ui/dist/DateRangePicker";
import { Box, Flex } from "reflexbox";
import { useTheme } from "@aragon/ui/dist/Theme";

const Margin = styled.div`
    height: 8px;
`;

const OutcomesContainer = styled(Flex)`
    border-radius: 4px;
    border: solid 1px #dde4e9;
`;

const WideDateRangePicker = styled(DateRangePicker)`
    width: 100%;
`;

export const NewMarketSidePanel = ({ open, onClose, onCreate }) => {
    const theme = useTheme();

    const [question, setQuestion] = useState("");
    const [outcome, setOutcome] = useState("");
    const [outcomes, setOutcomes] = useState([]);
    const [startsAt] = useState(new Date());
    const [endsAt, setEndsAt] = useState(null);
    const [funding, setFunding] = useState("");

    const handleQuestionChange = useCallback((event) => {
        setQuestion(event.target.value);
    }, []);

    const handleOutcomeChange = useCallback((event) => {
        setOutcome(event.target.value);
    }, []);

    const handleTemporalValidityChange = useCallback(
        (range) => {
            let { end } = range;
            if (end.getTime() < startsAt.getTime()) {
                end = DateTime.fromJSDate(startsAt)
                    .plus(Duration.fromObject({ days: 1 }))
                    .toJSDate();
            }
            setEndsAt(end);
        },
        [startsAt]
    );

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
        setEndsAt(null);
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
                <OutcomesContainer flexDirection="column">
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
            <Field label="Temporal validity">
                <WideDateRangePicker
                    wide
                    startDate={startsAt}
                    endDate={endsAt}
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
