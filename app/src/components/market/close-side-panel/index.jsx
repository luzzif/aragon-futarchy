import React, { useState, useCallback } from "react";
import { Flex, Box } from "reflexbox";
import { textStyle } from "@aragon/ui/dist/style";
import Button from "@aragon/ui/dist/Button";
import SidePanel from "@aragon/ui/dist/SidePanel";
import styled from "styled-components";
import Radio from "@aragon/ui/dist/Radio";

const Margin = styled.div`
    height: 8px;
`;

export const CloseSidePanel = ({ open, outcomes, onConfirm, onClose }) => {
    const [selectedOutcome, setSelectedOutcome] = useState(outcomes[0]);

    const handleOutcomeChange = useCallback(
        (index) => {
            setSelectedOutcome(outcomes[index]);
        },
        [outcomes]
    );

    const handleLocalConfirm = useCallback(() => {
        onConfirm(selectedOutcome);
    }, [onConfirm, selectedOutcome]);

    return (
        <SidePanel
            title="Choose the correct outcome"
            opened={open}
            onClose={onClose}
        >
            <Margin />
            {outcomes.map((outcome, index) => {
                return (
                    <Flex
                        key={index}
                        height="40px"
                        alignItems="center"
                        width="100%"
                        mb="16px"
                    >
                        <Box mr="16px">
                            <Radio
                                id={index}
                                checked={selectedOutcome === outcome}
                                onChange={handleOutcomeChange}
                            />
                        </Box>
                        <Box
                            css={`
                                ${textStyle("body2")}
                            `}
                        >
                            {outcome.label}
                        </Box>
                    </Flex>
                );
            })}
            <Button
                mode="strong"
                wide
                label="Choose outcome"
                onClick={handleLocalConfirm}
            />
        </SidePanel>
    );
};
