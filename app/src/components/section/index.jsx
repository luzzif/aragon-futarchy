import React from "react";
import { Box } from "reflexbox";
import { textStyle } from "@aragon/ui/dist/text-styles";
import { useTheme } from "@aragon/ui/dist/Theme";

export const Section = ({ title, dense, children, ...rest }) => {
    const theme = useTheme();

    return (
        <>
            <Box
                mb="8px"
                css={`
                    ${textStyle("label2")}
                    color: ${theme.contentSecondary};
                `}
                {...rest}
            >
                {title}
            </Box>
            <Box
                mb={dense ? "12px" : "24px"}
                css={`
                    ${textStyle("body2")}
                    color: ${theme.content};
                `}
            >
                {children}
            </Box>
        </>
    );
};
