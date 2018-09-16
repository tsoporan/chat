import React from "react";
import ReactDOM from "react-dom";
import registerServiceWorker from "./registerServiceWorker";

import App from "./App";

import "semantic-ui-css/semantic.min.css";

ReactDOM.render(<App />, document.getElementById("root"));
registerServiceWorker();
