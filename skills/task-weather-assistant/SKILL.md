---
name: task-weather-assistant
description: Use when the user wants to check the demo weather for a city or add and review tasks using Smart Task & Weather Buddy tools.
---

# Smart Task & Weather Buddy workflow

- For a city weather question, call `get_weather` with the city. Always disclose that returned conditions are demo/sample data and are not a live forecast.
- To record a task, call `add_task` with the task text and confirm what was added.
- To review tasks, call `list_tasks` and present the current list clearly. If the list is empty, say so.
- Never claim tasks are permanently saved: the server uses in-memory storage and tasks can reset when the service restarts.
- Do not invent tool results. If a tool fails, explain that the service may be unavailable and ask the user to retry after the backend is online.
