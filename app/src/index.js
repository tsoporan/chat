import React from "react";
import ReactDOM from "react-dom";
import registerServiceWorker from "./registerServiceWorker";

import App from "./components";

import "semantic-ui-css/semantic.min.css";
import "./styles/index.css";

ReactDOM.render(<App />, document.getElementById("root"));
registerServiceWorker();
