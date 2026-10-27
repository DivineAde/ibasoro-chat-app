import { io } from "socket.io-client";
import { API_URL } from "./api";

/** One authenticated socket per signed-in session. */
export const createSocket = (token) =>
  io(API_URL, {
    auth: { token },
    transports: ["websocket", "polling"],
    reconnectionDelayMax: 5000,
  });
