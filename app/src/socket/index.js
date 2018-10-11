import io from "socket.io-client";

import { API_URL } from "../config";

export default io(API_URL);
