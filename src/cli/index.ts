#!/usr/bin/env bun
/**
 * CC2: CLI Entry Point
 *
 * Entry point for resendld CLI commands.
 * Delegates to command handlers.
 *
 * Usage:
 *   resendld box add EMAIL
 *   resendld box list
 *   resendld box remove EMAIL
 *   resendld archive MESSAGE_ID
 *   resendld delete MESSAGE_ID
 *   resendld spam MESSAGE_ID
 *   resendld reply MESSAGE_ID --to ADDR --body "text"
 */

import {
  handleBoxAdd,
  handleBoxList,
  handleBoxRemove,
  handleArchive,
  handleDelete,
  handleSpam,
  handleReply,
  showHelp,
} from "./commands";

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    showHelp();
    process.exit(0);
  }

  const command = args[0];
  const subcommand = args[1];

  try {
    switch (command) {
      case "box":
        switch (subcommand) {
          case "add":
            await handleBoxAdd(args.slice(2));
            break;
          case "list":
            await handleBoxList();
            break;
          case "remove":
            await handleBoxRemove(args.slice(2));
            break;
          default:
            console.error(`Unknown box command: ${subcommand}`);
            console.log("Usage: resendld box [add|list|remove]");
            process.exit(1);
        }
        break;

      case "archive":
        await handleArchive(args.slice(1));
        break;

      case "delete":
        await handleDelete(args.slice(1));
        break;

      case "spam":
        await handleSpam(args.slice(1));
        break;

      case "reply":
        await handleReply(args.slice(1));
        break;

      case "help":
      case "--help":
      case "-h":
        showHelp();
        break;

      case "version":
      case "--version":
      case "-v":
        console.log("resendld v0.1.0");
        break;

      default:
        console.error(`Unknown command: ${command}`);
        showHelp();
        process.exit(1);
    }
  } catch (error) {
    console.error("Error:", error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

main();
