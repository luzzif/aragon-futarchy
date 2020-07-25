import "core-js/stable";
import "regenerator-runtime/runtime";
import React from "react";
import ReactDOM from "react-dom";
import { AragonApi } from "@aragon/api-react";
import { App } from "./views/app";

const reducer = (state) => {
    if (!state) {
        return { syncing: false, markets: [] };
    }
    return state;
};

ReactDOM.render(
    <AragonApi reducer={reducer}>
        <App />
    </AragonApi>,
    document.getElementById("root")
);
