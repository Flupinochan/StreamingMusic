import { Logger } from "@aws-lambda-powertools/logger";
import { parser } from "@aws-lambda-powertools/parser/middleware";
import { APIGatewayProxyEventSchema } from "@aws-lambda-powertools/parser/schemas/api-gateway";
import type { ParsedResult } from "@aws-lambda-powertools/parser/types";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, ScanCommand } from "@aws-sdk/lib-dynamodb";
import middy from "@middy/core";
import type { APIGatewayProxyResult, Context } from "aws-lambda";
import { z } from "zod";
import { metadataSchema, type Metadata } from "./metadataSchema";

const TABLE_NAME = process.env.TABLE_NAME!;

const ddbClient = DynamoDBDocumentClient.from(new DynamoDBClient());
const logger = new Logger();
const defaultHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "*",
};
const successHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "*",
  "Cache-Control":
    "public, max-age=300, s-maxage=300, stale-while-revalidate=300",
};

const lambdaEventSchema = APIGatewayProxyEventSchema;

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
      headers: defaultHeaders,
      body: "Invalid request",
    };
  }

  try {
    const result = await ddbClient.send(
      new ScanCommand({ TableName: TABLE_NAME }),
    );

    const items: Metadata[] = [];

    for (const raw of result.Items ?? []) {
      const parsed = metadataSchema.safeParse(raw);
      if (!parsed.success) {
        logger.warn("Skipping invalid metadata item from DynamoDB", {
          error: parsed.error,
          item: raw,
        });
        continue;
      }
      items.push(parsed.data);
    }

    logger.info("Retrieved metadata list", { count: items.length });

    return {
      statusCode: 200,
      headers: successHeaders,
      body: JSON.stringify(items),
    };
  } catch (err) {
    logger.error("scan failed", { error: err });
    return {
      statusCode: 500,
      headers: defaultHeaders,
      body: JSON.stringify({ message: "Internal server error" }),
    };
  }
};

export const handler = middy(lambdaHandler).use(
  parser({ schema: lambdaEventSchema, safeParse: true }),
);
