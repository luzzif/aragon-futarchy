exports.encodeQuestion = (text, outcomes, category) => {
    text = JSON.stringify(text).replace(/^"|"$/g, "");
    outcomes = JSON.stringify(outcomes).replace(/^\[/, "").replace(/\]$/, "");
    return `${text}\u241f${outcomes}\u241f${category}\u241fen_US`;
};
