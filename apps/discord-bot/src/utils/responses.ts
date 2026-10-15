import { EmbedBuilder } from 'discord.js'
import { e } from './emojis'

const BRAND_COLOR   = 0x7c3aed
const SUCCESS_COLOR = 0x22c55e
const ERROR_COLOR   = 0xef4444
const WARNING_COLOR = 0xf59e0b
const INFO_COLOR    = 0x06b6d4

export function successEmbed(title: string, description: string): EmbedBuilder {
  return new EmbedBuilder()
    .setColor(SUCCESS_COLOR)
    .setTitle(`${e('success')} ${title}`)
    .setDescription(description)
}

export function errorEmbed(description: string): EmbedBuilder {
  return new EmbedBuilder()
    .setColor(ERROR_COLOR)
    .setTitle(`${e('error')} Error`)
    .setDescription(description)
}

export function warningEmbed(title: string, description: string): EmbedBuilder {
  return new EmbedBuilder()
    .setColor(WARNING_COLOR)
    .setTitle(`${e('warning')} ${title}`)
    .setDescription(description)
}

export function infoEmbed(title: string, description: string): EmbedBuilder {
  return new EmbedBuilder()
    .setColor(INFO_COLOR)
    .setTitle(title)
    .setDescription(description)
}

export function permissionDeniedEmbed(): EmbedBuilder {
  return errorEmbed(
    "You don't have permission to do that. Ask a server admin to assign you the correct role using `/server roles add`.",
  )
}

export function notFoundEmbed(entityType: string): EmbedBuilder {
  return warningEmbed(
    'Not Found',
    `The ${entityType} you're looking for doesn't exist or may have been removed.`,
  )
}

export function genericErrorEmbed(): EmbedBuilder {
  return errorEmbed('Something went wrong on our end. Please try again in a moment.')
}

export function loadingEmbed(): EmbedBuilder {
  return new EmbedBuilder()
    .setColor(BRAND_COLOR)
    .setDescription(`${e('loading')} On it...`)
}

export function noResultsEmbed(): EmbedBuilder {
  return infoEmbed(`${e('upcoming')} Nothing Here Yet`, 'There are no results to display right now.')
}

export function brandFooter(embed: EmbedBuilder, serverName: string): EmbedBuilder {
  return embed.setFooter({ text: `Legendary Esports • ${serverName}` })
}
