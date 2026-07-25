import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

function jsonValue(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

export async function runAuditedAction<T>(input: {
  userId: string;
  clientId: string;
  toolName: string;
  idempotencyKey: string;
  arguments: unknown;
  execute: () => Promise<T>;
}): Promise<T> {
  const key = {
    userId_toolName_idempotencyKey: {
      userId: input.userId,
      toolName: input.toolName,
      idempotencyKey: input.idempotencyKey,
    },
  };
  const previous = await prisma.agentAction.findUnique({ where: key });
  if (previous) {
    if (JSON.stringify(previous.arguments) !== JSON.stringify(jsonValue(input.arguments))) {
      throw new Error("This idempotency key was already used with different arguments");
    }
    if (previous.status === "succeeded" && previous.result !== null) {
      return previous.result as T;
    }
    throw new Error(
      previous.status === "pending"
        ? "This action is already in progress"
        : previous.error || "This action previously failed; use a new idempotency key to retry",
    );
  }

  try {
    await prisma.agentAction.create({
      data: {
        userId: input.userId,
        clientId: input.clientId,
        toolName: input.toolName,
        idempotencyKey: input.idempotencyKey,
        arguments: jsonValue(input.arguments),
      },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new Error("This action is already in progress");
    }
    throw error;
  }

  try {
    const result = await input.execute();
    await prisma.agentAction.update({
      where: key,
      data: { status: "succeeded", result: jsonValue(result), error: null },
    });
    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown action failure";
    await prisma.agentAction.update({
      where: key,
      data: { status: "failed", error: message.slice(0, 1000) },
    });
    throw error;
  }
}
