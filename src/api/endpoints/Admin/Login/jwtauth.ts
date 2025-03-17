import { ServerAuthScheme } from "@hapi/hapi";
import jwt, { JwtPayload } from "jsonwebtoken";

const JWT_SECRET = "cirec.net.andrew.sparshot";

export const jwtAuthScheme: ServerAuthScheme = () => {
  return {
    authenticate: async (request, h) => {
      const token = request.headers.authorization?.replace("Bearer ", "");

      if (!token) {
        return h.unauthenticated(new Error("Missing authentication token"));
      }

      try {
        const decoded = jwt.verify(token, JWT_SECRET);

        // Ensure decoded is an object (JwtPayload) and not a string
        if (typeof decoded === "string") {
          return h.unauthenticated(new Error("Invalid token format"));
        }

        return h.authenticated({ credentials: decoded as JwtPayload });
      } catch (err) {
        return h.unauthenticated(new Error("Invalid token"));
      }
    }
  };
};
