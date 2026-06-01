# Learning: MCP with Node.js

This repository contains code I've written to implement an MCP server using Node.js.

## Local Setup

The MCP server is secured using OAuth2.
The setup for that is based on https://modelcontextprotocol.io/docs/tutorials/security/authorization#keycloak-setup.

Keycloak can be started using Docker Compose with [docker-compose.yml](docker-compose.yml):

* defines a volume to keep data between sessions
* server is available under localhost:8080

### First Time Setup

When starting Keycloak for the first time, the steps from the original documentation need to be applied:

* create client scope `mcp:tools` with type "Default" and enabled inclusion in token scope
* configure audience mapper for that scope with custom audience = `http://localhost:3000`
* configure client registration by disabling "client URIs must match" and add you local IP to the trusted hosts

### Testing with Claude Code

To test if the MCP works using Claude Code, you can register it like this:

#### STDIO

```
claude mcp add learning-mcp-with-node-stdio -e NODE_VERSION=24 -- /home/user/.nvm/nvm-exec node /home/user/projects/learning-mcp-with-node/build/mcp-stdio.js
```

Testing: TBD

#### HTTP

```
claude mcp add --transport http learning-mcp-with-node-http http://localhost:3000/
```

When starting Claude afterward, the MCP server will be in the "needs authentication" state (check with the`/mcp` command).
Starting the authentication process should open a browser window where Keycloak asks you to approve the registration.
After that the MCP server should be usable.

You can test that by asking Claude "What is John's phone number?".
