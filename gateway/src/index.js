import { ApolloServer } from 'apollo-server-express';
import express from 'express';
import typeDefs from './schema/index.js';
import resolvers from './resolvers/index.js';
import { traceIdMiddleware } from './middleware/traceIdMiddleware.js';
import graphqlUploadExpress from "graphql-upload/graphqlUploadExpress.mjs"


const PORT = process.env.GATEWAY_PORT || 4000;

async function startGateway() {
  const app = express();

  // Apply the TraceId middleware
  app.use(traceIdMiddleware);

  app.use(graphqlUploadExpress({
    maxFileSize: Infinity,
    maxFiles: Infinity,
  }))

  app.get('/share/:token', async (req, res) => {
    const { token } = req.params;
    
    try {
      const response = await VerifyShareLink(token);

      console.log("Response in :::::::: ", response)

      if ( response.message === "Expired link") {
        return res.status(410).json({ message: "Expired link" });
      }
  
      if (response.message === "Invalid or missing token") {
        return res.status(410).json({ message: "Expired or invalid link" });
      }
    
      // Convert fileContent (which might be Uint8Array) to Buffer
      const buffer = Buffer.isBuffer(response.fileContent)
        ? response.fileContent
        : Buffer.from(response.fileContent);
    
      const mimeType = response.mimeType || 'application/octet-stream';
      const filename = response.fileName 
    
      res.setHeader('Content-Type', mimeType);
      res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
      res.send(buffer);

      // res.status(200).json(response);

    
      } catch (err) {
        console.error('Error in /share route:', err);
        res.status(500).json({ error: 'Internal server error' });
      }
  });

  const server = new ApolloServer({
    typeDefs,
    resolvers,
    formatError: (err) => {
      // Log the full error for server-side debugging
      console.error('GraphQL Error:', err);
  
      // Return only the message to the client
      return {
        message: err.message,
      };
    },
    debug: false, // Disable detailed error information in production
    context: ({ req }) => ({
      traceId: req.traceId,
      headers: req.headers,
    }),
    cors: {
      origin: ["https://mainnet.bethel.network", "http://app.becx.io", "http://localhost:3001", "*"],
      credentials: true
    },
  });

  // Start Apollo Server
  await server.start();

  // Apply middleware to a custom route
  server.applyMiddleware({ app, path: '/api/v1', cors: true});

  app.listen(PORT, () => {
    console.log(`[Gateway] GraphQL Server running at http://localhost:${PORT}/api/v1`);
  });
}

startGateway().catch((err) => {
  console.error('[Gateway] Failed to start:', err);
});