import "dotenv/config";
import { Sop1Error } from "../../../../packages/shared/src/errors.js";
import { invokeConvertedNodeFromRecording } from "../../../../packages/node-recorder/src/index.js";

function parseInputs(args: string[]): Record<string, unknown> {
  const inputs: Record<string, unknown> = {};
  for (const arg of args) {
    const index = arg.indexOf("=");
    if (index <= 0) throw new Error(`Invalid input argument: ${arg}. Use key=value.`);
    inputs[arg.slice(0, index)] = arg.slice(index + 1);
  }
  return inputs;
}

const [recordingId, ...inputArgs] = process.argv.slice(2);

if (!recordingId) {
  console.error("Usage: npm run debug:recording-node -- <recording_id> <input_key=input_value>...");
  process.exit(1);
}

const inputs = parseInputs(inputArgs);
try {
  const { node, result } = await invokeConvertedNodeFromRecording(recordingId, inputs);

  console.log(
    JSON.stringify(
      {
        recording_id: recordingId,
        node: {
          type: node.type,
          handler_kind: node.handler.kind,
          inputs: node.inputs,
          outputs: node.outputs,
        },
        input_values: inputs,
        result,
      },
      null,
      2,
    ),
  );
} catch (error) {
  if (error instanceof Sop1Error) {
    console.error(
      JSON.stringify(
        {
          recording_id: recordingId,
          error: {
            code: error.code,
            platform: error.platform,
            step: error.step,
            message: error.message,
            details: error.details,
          },
        },
        null,
        2,
      ),
    );
    process.exit(1);
  }

  throw error;
}
