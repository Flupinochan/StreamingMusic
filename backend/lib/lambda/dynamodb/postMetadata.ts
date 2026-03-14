import { Logger } from "@aws-lambda-powertools/logger";
import { JSONStringified } from "@aws-lambda-powertools/parser/helpers";
import { parser } from "@aws-lambda-powertools/parser/middleware";
import { APIGatewayProxyEventSchema } from "@aws-lambda-powertools/parser/schemas/api-gateway";
import type { ParsedResult } from "@aws-lambda-powertools/parser/types";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";
import middy from "@middy/core";
import type { APIGatewayProxyResult, Context } from "aws-lambda";
import { z } from "zod";
import { metadataSchema, type Metadata } from "./metadataSchema";

const TABLE_NAME = process.env.TABLE_NAME!;

const ddbClient = DynamoDBDocumentClient.from(new DynamoDBClient());
const logger = new Logger();

const requestBodySchema = metadataSchema;

const lambdaEventSchema = APIGatewayProxyEventSchema.extend({
  body: JSONStringified(requestBodySchema),
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

  const item: Metadata = event.data.body;

  try {
    await ddbClient.send(new PutCommand({ TableName: TABLE_NAME, Item: item }));

    logger.info("Saved metadata", { id: item.id });

    return {
      statusCode: 201,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "*",
      },
      body: JSON.stringify(item),
    };
  } catch (err) {
    logger.error("put failed", { error: err });
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
