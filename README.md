# Bethel zkpStorage Middleware NodeJS

This repository contains the Bethel zkpStorage Middleware built using Node.js. The project follows a microservices-based architecture with gRPC communication and a shared Postgres database.

## Description

This middleware provides a flexible, modular approach to building secure storage solutions. It leverages Node.js, gRPC, Docker, and PostgreSQL to enable scalable and resilient data handling.

## Getting Started

### Dependencies

- Node.js (version 18.x recommended)
- Docker & Docker Compose
- PostgreSQL (handled via Docker in this setup)

### Installing

1. **Clone** this repository:
   ```bash
   git clone https://github.com/bethelplatform/Bethel-zkpStorage-Middleware-NodeJS.git
   cd Bethel-zkpStorage-Middleware-NodeJS

2. Install project dependencies for each service:

   ```bash
   # In the root directory
   cd gateway && npm install && cd ..
   cd services/user-service && npm install && cd ../..
   cd services/upload-service && npm install && cd ../..
   cd services/chunk-service && npm install && cd ../..
   cd services/claim-service && npm install && cd ../..
   cd services/logger-service && npm install && cd ../..
   cd services/point-service && npm install && cd ../..

### Executing Program

1. Environment Variables: Review or modify ```.env``` if needed.
   
2. Start via Docker Compose:
   ```bash
   docker-compose up --build

3. Access the GraphQL Gateway:
   ```bash
   http://localhost:4000
Use the GraphQL Playground to run queries, such as ```getUserById.```

### Help

If you encounter issues running ```docker-compose up --build```, make sure:

  - Docker and Docker Compose are installed and running.
  - No other application is using the ports defined in ```.env```.
  - You have proper file permissions for npm and Docker.

### Acknowledgments

 - Node.js, Docker, and PostgreSQL communities for toolchains and best practices.
 - Contributors and community members offering guidance on microservice patterns.
