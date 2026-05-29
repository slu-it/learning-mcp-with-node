## Commands

There is no global Node installation. Always use NVM, sourcing it first since it isn't loaded in non-interactive shells:

```bash
source ~/.nvm/nvm.sh && nvm use 24   # activate Node 24 before any npm/node commands
npm run build                         # compile TypeScript to build/ and chmod 755 build/index.js
```
