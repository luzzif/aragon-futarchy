// maps the chain id to the timeout value expressed in seconds
// enforced in the network
export const REALITIO_TIMEOUT = Object.freeze({
    1: 86400,
    4: 60,
    1337: 60,
});

export const OUTCOME_BAR_COLORS = [
    "#3E7BF6",
    "#F08658",
    "#876559",
    "#F7D858",
    "#7C80F2",
    "#9BC75A",
];

export const MARKET_STATUSES = Object.freeze({
    OPEN: "Open",
    CLOSED: "Closed",
    AWAITING_FINALIZATION: "Awaiting finalization",
});
