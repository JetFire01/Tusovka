# EventManager

A self-hosted event planning and expense coordination app for trips, camping weekends, dinners, and other group events. EventManager brings event details, participant responses, shared checklists, transport planning, and cost settlement together in one place.

## Features

- **Event workspaces:** Create events with dates, locations, descriptions, and configurable planning blocks.
- **Reusable event templates:** Define event types with default blocks, food quantities, and equipment lists.
- **Participant surveys:** Collect attendance dates, meal preferences, transport and tent reservations, equipment claims, and activity opt-ins.
- **Shared planning blocks:** Coordinate menus, food and daily provisions, drinks, equipment, transport, tents, activities, optional purchases, and custom notes.
- **Shopping list tools:** Import and export item lists as text. Optionally generate and refine a shopping list from the menu, template quantities, attendee count, and notes from previous events using Google Gemini.
- **Expense sharing:** Calculate participant shares for food, equipment, drinks, optional purchases, and fuel, then show balances and suggested repayments.
- **Live updates:** Survey and statistics pages refresh shared event data every five seconds while active.
- **English and Russian UI, plus dark mode.**

## Tech stack

- Next.js 16 (App Router), React 19, and TypeScript
- Tailwind CSS 4
- Prisma 7 with SQLite through the LibSQL adapter
- Zod for validation and JOSE for signed session tokens
- Optional Google Gemini API integration for AI-assisted shopping lists

## Requirements

- Node.js 20 or later and npm
- Docker and Docker Compose for the containerized deployment option

## Run locally

```bash
git clone https://github.com/JetFire01/Tusovka.git
cd Tusovka
npm install
npm run setup
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The development server generates the Prisma client and synchronizes the SQLite schema on startup. `npm run setup` performs those steps explicitly before the first run.

By default, the local database is `prisma/dev.db`. To use another SQLite location, set `DATABASE_URL` before starting the app, for example:

```bash
DATABASE_URL="file:./data/eventmanager.db" npm run dev
```

## Configuration

| Variable | Required | Description |
| --- | --- | --- |
| `DATABASE_URL` | No | SQLite connection URL. Defaults to `file:./prisma/dev.db` for local development. |
| `JWT_SECRET` | Recommended | Secret used to sign session tokens. Set a unique, long random value for any shared or production deployment. |
| `GEMINI_API_KEY` | Optional | Enables AI shopping list generation. Without it, the rest of the app can be used normally. |
| `GEMINI_MODEL` | Optional | Gemini model name. Defaults to `gemini-2.5-flash`. |

For local development, you can place variables in `.env` in the project root. Do not commit secrets.

## Typical workflow

1. Create an event, optionally from a saved event template.
2. Configure its dates, menu, shopping items, transport, accommodation, and other planning blocks.
3. Share the app address with participants so they can register and complete the event survey.
4. Update purchased items and costs as plans develop.
5. Review the statistics page for attendance, logistics, missing equipment, balances, and suggested repayments.
6. Add after-event notes to inform planning for future events of the same type.

## Project scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Generate Prisma client, sync the SQLite schema, and start the development server. |
| `npm run setup` | Generate Prisma client and sync the SQLite schema. |
| `npm run build` | Build the production app. |
| `npm run start` | Start the production Next.js server. |
| `npm run lint` | Run ESLint. |

## Notes

- The app uses PIN-based participant accounts and stores event data in SQLite. Anyone who can access a shared instance may be able to interact with its events; deploy it only on a network you intend to share with participants.
- AI shopping list generation sends menu and event planning context to the configured Google Gemini API when requested.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.
