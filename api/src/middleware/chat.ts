import { RequestHandler } from 'express'
import { param, body, validationResult } from 'express-validator'
import logger from '../misc/logger'
import { chatBotServiceEntry } from '../service/chat-bot'
import { IMessage } from '../service/chat-bot/type'
import { messageResponseFormat } from '../service/chat-bot/misc/message-response-format'

export const chatMiddleware: RequestHandler = async (req, res) => {
  const botId = req.params.botId
  if (!botId) {
    res.status(400).json({ error: 'botId is required' })
    return
  }

  const { messages }: { messages: IMessage[] } = req.body

  if (!process.env.OPENAI_API_KEY) {
    res.status(500).json({ message: 'OpenAI API key is missing' })
    return
  }

  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')

  try {
    await chatBotServiceEntry(botId, messages, req, res)
  } catch (error) {
    logger.error(error, 'Encountered an error when processing chat')
    res.write(
      messageResponseFormat('Encountered an error when processing chat.')
    )
    res.end()
  }
}

export const validatorHandler: RequestHandler = (req, res, next) => {
  const error = validationResult(req).mapped()
  if (Object.keys(error).length > 0) {
    res.status(400).json({ message: 'Validation error', error })
    return
  }
  next()
}

export const requestValidator = [
  param('botId').isUUID().withMessage('botId must be a valid UUID'),
  body('messages').isArray().withMessage('Messages must be an array'),
  body('messages.*.role')
    .isString()
    .withMessage('Each message must have a role as a string')
    .notEmpty()
    .isIn(['system', 'user', 'assistant'])
    .withMessage('Role must be either "system" or "user"'),
  body('messages.*.content')
    .isString()
    .withMessage('Each message must have a content as a string')
    .notEmpty()
    .withMessage('content cannot be empty'),
  validatorHandler,
]
