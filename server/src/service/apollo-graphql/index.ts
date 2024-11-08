import { ApolloServer } from '@apollo/server'
import { expressMiddleware } from '@apollo/server/express4'
import { GraphQLError } from 'graphql'
import { Express, Request, Response } from 'express'
import { typeDefs } from '../../schema'
import { resolvers } from '../../resolver'
import { isTrafficAllowed } from '../../misc/is-traffic-allowed'

export const startApolloServer = async (express: Express) => {
  const apolloServer = new ApolloServer({
    typeDefs,
    resolvers,
  })

  await apolloServer.start()

  express.use('/graphql', expressMiddleware(apolloServer, {
    context: async ({ req }) => {
      const origin = (req.headers.origin || req.headers.referer) || ''
      let authorizationToken = req?.headers?.authorization || ''
      const { isAllowed, authToken } = isTrafficAllowed(origin, authorizationToken)

      if (!isAllowed || !authToken) {
        throw new GraphQLError('User is not authenticated', {
          extensions: {
            code: 'UNAUTHENTICATED',
            http: { status: 401 },
          },
        })
      }
  
      return { authToken }
    },
  }))
}
