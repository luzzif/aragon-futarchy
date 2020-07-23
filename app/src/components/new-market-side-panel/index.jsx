import React, { useState, useCallback, useEffect } from "react";
import { Field, Button, TextInput, IconRemove, DataView } from "@aragon/ui";
import SidePanel from "@aragon/ui/dist/SidePanel";
import styled from "styled-components";
import BigNumber from "bignumber.js";

const Margin = styled.div`
    height: 8px;
`;

const EmptyStatusText = styled.span`
    font-size: 16px;
`;

export const NewMarketSidePanel = ({ open, onClose, onCreate }) => {
    const [question, setQuestion] = useState("");
    const [outcome, setOutcome] = useState("");
    const [outcomes, setOutcomes] = useState([]);
    const [outcomeProbability, setOutcomeProbability] = useState(0);

    useEffect(() => {
        if (outcomes && outcomes.length > 0) {
            setOutcomeProbability(
                new BigNumber("100")
                    .dividedBy(outcomes.length)
                    .decimalPlaces(2)
                    .toString()
            );
        }
    }, [outcomes]);

    const handleQuestionChange = useCallback((event) => {
        setQuestion(event.target.value);
    }, []);

    const handleOutcomeChange = useCallback((event) => {
        setOutcome(event.target.value);
    }, []);

    const handleOutcomeAddition = useCallback(() => {
        setOutcomes([...outcomes, outcome]);
        setOutcome("");
    }, [outcomes, outcome]);

    const getOutcomeRemovalHandler = () => (index) => {
        outcomes.splice(index, 1);
        setOutcomes([...outcomes]);
    };

    const resetState = () => {
        setQuestion("");
        setOutcome("");
        setOutcomes([]);
        setOutcomeProbability(0);
    };

    const handleCreate = useCallback(() => {
        onCreate(question, outcomes);
        onClose();
        resetState();
    }, [onClose, question, outcomes]);

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
            <Field label="Addded outcomes">
                <DataView
                    fields={["Outcome", "Probability"]}
                    entries={outcomes}
                    entriesPerPage={-1}
                    renderEntry={(outcome) => [outcome, outcomeProbability]}
                    renderEntryActions={(outcome, index) => (
                        <Button
                            icon={<IconRemove />}
                            mode="negative"
                            onClick={getOutcomeRemovalHandler(index)}
                        />
                    )}
                    emptyState={
                        <EmptyStatusText>No outcomes added yet</EmptyStatusText>
                    }
                />
            </Field>
            <Button
                mode="strong"
                wide
                label="Create"
                disabled={!question || !outcomes || outcomes.length < 2}
                onClick={handleCreate}
            />
        </SidePanel>
    );
};
