# Smart Task & Weather Buddy

Node.js/Express backend exposing both REST endpoints and an MCP Streamable HTTP endpoint.

## Deploy to Render
1. Replace the files in your existing GitHub repository with these project files.
2. Ensure Render's service points at that repository and uses **Node** runtime.
3. Build command: `npm install`
4. Start command: `npm start`
5. Redeploy, then test `https://my-chatgpt-plugin.onrender.com/health` and confirm JSON contains `"ok": true`.
6. The MCP endpoint is `https://my-chatgpt-plugin.onrender.com/mcp`.

## Tools
- `get_weather` — sample/demo weather for a city (not live weather).
- `add_task` — adds a task to temporary in-memory storage.
- `list_tasks` — lists tasks in the current server process.

## Important limitations
Weather values are demo values, not a live forecast. Tasks are stored only in memory and can disappear after a restart or redeploy. Use persistent storage before relying on this for important tasks. No API keys or credentials should be committed to the repository.
