import { Events } from 'discord.js';
import { logger } from '../utils/logger.js';
import { getGuildConfig } from '../services/config/guildConfig.js';
import {
  getBotMessage,
  isBotOwner,
  isCommandCategoryEnabled,
  isMaintenanceMode,
} from '../config/bot.js';
import botConfig from '../config/bot.js';
import { handleInteractionError, createError, ErrorTypes, ErrorCodes } from '../utils/errorHandler.js';
import { InteractionHelper } from '../utils/interactionHelper.js';
import { createInteractionTraceContext, runWithTraceContext } from '../utils/logger.js';
import { validateChatInputPayloadOrThrow } from '../utils/commandInputValidation.js';
import { enforceAbuseProtection, formatCooldownDuration } from '../utils/abuseProtection.js';
import { isCommandEnabled } from '../services/commandAccessService.js';
import { resolveSlashAccessKey } from '../utils/messageAdapter.js';
import { isCollectorManagedComponent } from '../utils/collectorComponents.js';
import { ResponseCoordinator } from '../utils/responseCoordinator.js';
import { enforceDefaultCommandPermissions } from '../utils/permissionGuard.js';

function withTraceContext(context = {}, traceContext = {}) {
  return {
    traceId: traceContext.traceId,
    guildId: context.guildId || traceContext.guildId,
    userId: context.userId || traceContext.userId,
    command: context.commandName || traceContext.command,
    ...context,
  };
}

export default {
  name: Events.InteractionCreate,
  async execute(interaction, client) {
    const interactionTraceContext = createInteractionTraceContext(interaction);
    interaction.traceContext = interactionTraceContext;
    interaction.traceId = interactionTraceContext.traceId;

    return runWithTraceContext(interactionTraceContext, async () => {
      try {
        InteractionHelper.patchInteractionResponses(interaction);
        ResponseCoordinator.attach(interaction);

        // 1. Slash Commands
        if (interaction.isChatInputCommand()) {
          try {
            logger.info(`Command executed: /${interaction.commandName} by ${interaction.user.tag}`, {
              event: 'interaction.command.received',
              traceId: interactionTraceContext.traceId,
              guildId: interaction.guildId,
              userId: interaction.user?.id,
              command: interaction.commandName,
            });

            validateChatInputPayloadOrThrow(
              interaction,
              withTraceContext({ type: 'command_input_validation', commandName: interaction.commandName }, interactionTraceContext)
            );

            const command = client.commands.get(interaction.commandName);
            if (!command) {
              throw createError(
                `No command matching ${interaction.commandName} was found.`,
                ErrorTypes.CONFIGURATION,
                'Sorry, that command does not exist.',
                withTraceContext({ commandName: interaction.commandName }, interactionTraceContext)
              );
            }

            if (isMaintenanceMode() && !isBotOwner(interaction.user.id)) {
              throw createError(
                'Bot is in maintenance mode',
                ErrorTypes.CONFIGURATION,
                getBotMessage('maintenanceMode'),
                withTraceContext({ commandName: interaction.commandName }, interactionTraceContext)
              );
            }

            if (!isCommandCategoryEnabled(command.category)) {
              throw createError(
                `Feature disabled for category ${command.category}`,
                ErrorTypes.CONFIGURATION,
                getBotMessage('commandDisabled'),
                withTraceContext({ commandName: interaction.commandName, category: command.category }, interactionTraceContext)
              );
            }

            const defaultCooldownSec = Number(botConfig.commands?.defaultCooldown) || 0;
            if (defaultCooldownSec > 0 && !isBotOwner(interaction.user.id)) {
              const cooldownKey = `${interaction.user.id}:${interaction.commandName}`;
              const expiresAt = client.cooldowns.get(cooldownKey);

              if (expiresAt && Date.now() < expiresAt) {
                const remainingSec = Math.ceil((expiresAt - Date.now()) / 1000);
                throw createError(
                  `Default command cooldown active for ${interaction.commandName}`,
                  ErrorTypes.RATE_LIMIT,
                  getBotMessage('cooldownActive', { time: `${remainingSec}s` }),
                  withTraceContext({ commandName: interaction.commandName, remainingSec }, interactionTraceContext)
                );
              }

              client.cooldowns.set(cooldownKey, Date.now() + defaultCooldownSec * 1000);
            }

            const abuseProtection = await enforceAbuseProtection(interaction, command, interaction.commandName);
            if (!abuseProtection.allowed) {
              const formattedCooldown = formatCooldownDuration(abuseProtection.remainingMs);
              throw createError(
                `Risky command cooldown active for ${interaction.commandName}`,
                ErrorTypes.RATE_LIMIT,
                `This command is on cooldown. Please wait ${formattedCooldown} before trying again.`,
                withTraceContext({
                  commandName: interaction.commandName,
                  subtype: 'command_cooldown',
                  expected: true,
                  cooldownMs: abuseProtection.remainingMs,
                  cooldownWindowMs: abuseProtection.policy?.windowMs,
                  cooldownMaxAttempts: abuseProtection.policy?.maxAttempts,
                }, interactionTraceContext)
              );
            }

            let guildConfig = null;
            if (interaction.guild) {
              guildConfig = await getGuildConfig(client, interaction.guild.id, interactionTraceContext);
              const accessKey = resolveSlashAccessKey(interaction);
              if (!(await isCommandEnabled(client, interaction.guild.id, accessKey, command.category))) {
                throw createError(
                  `Command ${accessKey} is disabled in this guild`,
                  ErrorTypes.CONFIGURATION,
                  'This command has been disabled for this server.',
                  withTraceContext({ commandName: accessKey, guildId: interaction.guild.id }, interactionTraceContext)
                );
              }
            }

            const permissionAllowed = await enforceDefaultCommandPermissions(interaction, command, {
              source: 'interactionCreate',
              guildConfig,
            });
            if (!permissionAllowed) {
              return;
            }

            await command.execute(interaction, guildConfig, client);
          } catch (error) {
            await handleInteractionError(
              interaction,
              error,
              withTraceContext({ type: 'command', commandName: interaction.commandName, subtype: error?.context?.subtype }, interactionTraceContext)
            );
          }

        // 2. Autocomplete
        } else if (interaction.isAutocomplete()) {
          const autocompleteCommand = client.commands.get(interaction.commandName);
          if (autocompleteCommand?.autocomplete) {
            try {
              await autocompleteCommand.autocomplete(interaction, client);
            } catch (error) {
              logger.error('Error handling command autocomplete:', {
                error: error.message,
                guildId: interaction.guildId,
                commandName: interaction.commandName,
              });
              await interaction.respond([]).catch(() => {});
            }
          }

        // 3. Buttons
        } else if (interaction.isButton()) {
          const [customId, ...args] = interaction.customId.split(':');
          const button = client.buttons?.get(customId);

          if (!button) {
            // Handled by inline message component collector
            if (!interaction.customId.includes(':') || isCollectorManagedComponent(customId)) {
              return;
            }
            return;
          }

          try {
            await button.execute(interaction, client, args);
          } catch (error) {
            await handleInteractionError(
              interaction,
              error,
              withTraceContext({ type: 'button', customId: interaction.customId, handler: 'general' }, interactionTraceContext)
            );
          }

        // 4. Select Menus
        } else if (interaction.isStringSelectMenu()) {
          const [customId, ...args] = interaction.customId.split(':');
          const selectMenu = client.selectMenus?.get(customId);

          if (!selectMenu) {
            // Handled by inline collector
            if (!interaction.customId.includes(':') || isCollectorManagedComponent(customId)) {
              return;
            }
            return;
          }

          try {
            await selectMenu.execute(interaction, client, args);
          } catch (error) {
            await handleInteractionError(
              interaction,
              error,
              withTraceContext({ type: 'select_menu', customId: interaction.customId }, interactionTraceContext)
            );
          }

        // 5. Modals
        } else if (interaction.isModalSubmit()) {
          const [customId, ...args] = interaction.customId.split(':');
          const modal = client.modals?.get(customId);

          if (!modal) {
            return;
          }

          try {
            await modal.execute(interaction, client, args);
          } catch (error) {
            await handleInteractionError(
              interaction,
              error,
              withTraceContext({ type: 'modal', customId: interaction.customId, handler: 'general' }, interactionTraceContext)
            );
          }
        }
      } catch (error) {
        logger.error('Unhandled error in interactionCreate:', {
          event: 'interaction.unhandled_error',
          errorCode: ErrorCodes.INTERACTION_UNHANDLED,
          error,
          traceId: interactionTraceContext.traceId,
          interactionId: interaction.id,
          guildId: interaction.guildId,
          userId: interaction.user?.id,
        });

        try {
          await handleInteractionError(
            interaction,
            error,
            withTraceContext({
              type: 'interaction',
              commandName: interaction.commandName,
              customId: interaction.customId,
              source: 'interactionCreate.unhandled',
            }, interactionTraceContext)
          );
        } catch (replyError) {
          logger.error('Failed to send fallback error response:', {
            event: 'interaction.error_response_failed',
            errorCode: ErrorCodes.INTERACTION_RESPONSE_FAILED,
            error: replyError,
            traceId: interactionTraceContext.traceId,
          });
        }
      }
    });
  },
};