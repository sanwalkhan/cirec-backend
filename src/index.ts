import { config as dotEnvConfig } from "dotenv";
dotEnvConfig();

import * as Hapi from "@hapi/hapi";
import Inert from "@hapi/inert";
import Vision from "@hapi/vision";
import Jwt from "hapi-auth-jwt2";
import * as HapiSwagger from "hapi-swagger";
import qs from "qs";
import { setupRoutes } from "./api/routes";
import { config } from "./common/index";
import { logger } from "./common/logger";
import paypal from "paypal-rest-sdk";
import { fetchTables } from "./common/db";

paypal.configure({
  mode: "sandbox", // Change to 'live' for production
  client_id: process.env.PAYPAL_CLIENT_ID as string,
  client_secret: process.env.PAYPAL_CLIENT_SECRET as string,
});

const init = async () => {
  const server = Hapi.server({
    port: process.env.PORT,
    host: process.env.HOST,
    query: {
      parser: (query) => qs.parse(query),
    },
    router: {
      stripTrailingSlash: true,
    },
    routes: {
      cache: {
        privacy: "public",
        expiresIn: 1000,
      },
      timeout: {
        server: 120 * 1000,
      },
      cors: {
        origin: ["*"],
        credentials: true,
        additionalHeaders: [
          "Authorization",
          "Content-Type",
          "x-rkc-version",
          "x-rkui-version",
        ],
      },
      validate: {
        options: {
          stripUnknown: true,
        },
        failAction: (_request, _h, error) => {
          delete (error as any).output.payload.validation;
          throw error;
        },
      },
    },
  });

  const apiDescription = "You are viewing the reference docs for the Cirec API.";

  await server.register([
    {
      plugin: Inert as any,
    },
    {
      plugin: Vision,
    },
    {
      plugin: HapiSwagger,
      options: <HapiSwagger.RegisterOptions>{
        grouping: "tags",
        security: [{ API_KEY: [] }],
        securityDefinitions: {
          API_KEY: {
            type: "apiKey",
            name: "Authorization",
            in: "header",
            "x-default": "demo-api-key",
          },
        },
        schemes: [config.enviornment === "development" ? "http" : "https"],
        host: process.env.URL,
        cors: true,
        tryItOutEnabled: true,
        documentationPath: "/",
        sortEndpoints: "ordered",
        info: {
          title: "Cirec API",
          version: require("../package.json").version,
          description: apiDescription,
        },
      },
    },
    {
      plugin: require("hapi-pulse"),
      options: {
        timeout: 25 * 1000,
        signals: ["SIGINT", "SIGTERM"],
        preServerStop: async () => {
          logger.info("process", "Shutting down");
        },
      },
    },
    {
      plugin: Jwt,
    },
  ]);

  const validate = async function (decoded: any, request: any, h: any) {
    //@todo define validation function
  };

  server.auth.strategy("jwt", "jwt", {
    key: config.authSecret, // Never Share your secret key
    validate,
    verifyOptions: { algorithms: ["HS256"] },
    payloadKey: false,
  });

  server.route({
    method: "POST",
    path: "/create-payment",
    handler: async (request, h) => {
      const { amount, currency = "USD", description = "Test Payment" } =
        request.payload as any;

      const createPaymentJson = {
        intent: "sale",
        payer: { payment_method: "paypal" },
        redirect_urls: {
          return_url: `http://localhost:5173/success`,
          cancel_url: `http://localhost:5173/cancel`,
        },
        transactions: [
          {
            amount: { currency, total: amount },
            description,
          },
        ],
      };

      try {
        const payment = await new Promise((resolve, reject) => {
          paypal.payment.create(createPaymentJson, (error: any, payment: unknown) => {
            if (error) return reject(error);
            resolve(payment);
          });
        });

        const approvalUrl = (payment as any).links.find(
          (link: any) => link.rel === "approval_url"
        ).href;

        return h.response({ approvalUrl }).code(200);
      } catch (error: any) {
        logger.error("Error creating PayPal payment:", error);
        return h.response({ error: "Payment creation failed" }).code(500);
      }
    },
  });

  setupRoutes(server);

  await server.start();
  console.log("Server running on %s", server.info.uri);
};

fetchTables();

process.on("unhandledRejection", (err) => {
  console.log(err);
  process.exit(1);
});

init();
