process.env.POWERTOOLS_LOGGER_LOG_EVENT = "true";

import { Logger } from "@aws-lambda-powertools/logger";
import { parser } from "@aws-lambda-powertools/parser/middleware";
import { APIGatewayProxyEventSchema } from "@aws-lambda-powertools/parser/schemas/api-gateway";
import type { ParsedResult } from "@aws-lambda-powertools/parser/types";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DeleteCommand, DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import middy from "@middy/core";
import type { APIGatewayProxyResult, Context } from "aws-lambda";
import { z } from "zod";
import { metadataIdSchema } from "./metadataSchema";

const TABLE_NAME = process.env.TABLE_NAME!;

const ddbClient = DynamoDBDocumentClient.from(new DynamoDBClient());
const logger = new Logger();

const requestPathParametersSchema = metadataIdSchema;

const lambdaEventSchema = APIGatewayProxyEventSchema.extend({
  pathParameters: requestPathParametersSchema,
});

type ParsedEvent = z.infer<typeof lambdaEventSchema>;
type SafeParsedEvent = ParsedResult<ParsedEvent, ParsedEvent>;

const lambdaHandler = async (
  event: SafeParsedEvent,
  context: Context,
): Promise<APIGatewayProxyResult> => {
  logger.addContext(context);
  logger.logEventIfEnabled(event);

  if (!event.success) {
    logger.error("Invalid request", { error: event.error });
    return {
      statusCode: 400,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "*",
      },
      body: "Invalid request",
    };
  }

  const id = event.data.pathParameters.id;

  try {
    await ddbClient.send(
      new DeleteCommand({
        TableName: TABLE_NAME,
        Key: { id },
      }),
    );

    logger.info("Deleted metadata", { id });

    return {
      statusCode: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "*",
      },
      body: "",
    };
  } catch (err) {
    logger.error("delete failed", { error: err });
    return {
      statusCode: 500,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "*",
      },
      body: JSON.stringify({ message: "Internal server error" }),
    };
  }
};

export const handler = middy(lambdaHandler).use(
  parser({ schema: lambdaEventSchema, safeParse: true }),
);
