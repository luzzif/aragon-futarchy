import React, { useCallback, useState } from "react";
import PropTypes from "prop-types";
import styled from "styled-components";
import IconWarning from "@aragon/ui/dist/IconWarning";

export const StyledImage = styled.img`
    border-radius: 50%;
    width: ${(props) => props.size}px;
    height: ${(props) => props.size}px;
`;

export const TokenIcon = ({ logoUri }) => {
    const [error, setError] = useState(false);

    const handleLoadingError = useCallback(() => {
        setError(true);
    }, []);

    return logoUri && !error ? (
        <StyledImage
            alt="Icon"
            size={16}
            src={logoUri}
            onError={handleLoadingError}
        />
    ) : (
        <IconWarning />
    );
};

TokenIcon.propTypes = {
    address: PropTypes.string.isRequired,
    size: PropTypes.number.isRequired,
};
