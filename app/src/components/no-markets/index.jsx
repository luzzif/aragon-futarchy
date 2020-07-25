import React from "react";
import { Flex, Box } from "reflexbox";
import EmptyStateCard from "@aragon/ui/dist/EmptyStateCard";

export const NoMarkets = () => {
    return (
        <Flex width="100%" mt={36} justifyContent="center">
            <Box>
                <EmptyStateCard text="Still no markets here. Create one with the button above." />
            </Box>
        </Flex>
    );
};
