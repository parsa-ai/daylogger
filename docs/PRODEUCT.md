# Telegram Daily Accountability Bot
## Product Requirements & Technical Specification

### 1. Project Overview

Build a small Telegram bot that helps a group of people track their daily tasks and stay accountable.

The bot should automatically remind group members about their tasks, collect their responses, follow up when necessary, and publish a daily group report.

The primary goal is to keep the bot simple, practical, and easy to use without requiring members to manually enter their daily plans every morning.

This is a standalone project and does not require integration with any existing application.

---

### 2. Technology Stack

Use the following technologies:

- **Framework:** Next.js with App Router
- **Language:** TypeScript
- **Telegram integration:** Telegram Bot API using grammY
- **Database:** PostgreSQL hosted on Neon
- **ORM:** Prisma
- **Hosting:** Vercel
- **Scheduled tasks:** Vercel Cron Jobs
- **Package manager:** pnpm

The application must be designed for Vercel's serverless environment.

Do not introduce unnecessary infrastructure such as Redis, a separate backend service, a dedicated worker server, or a microservice architecture.

---

### 3. Core Product Concept

The bot operates inside a Telegram group.

Each group member can define a set of recurring daily tasks.

Once these tasks are created, the bot automatically generates the daily task instances and asks the corresponding member about each task at its scheduled time.

All task reminders and responses must be visible to the entire group.

Members can also add unexpected, one-time tasks during the day.

At the end of the day, the bot publishes a summary of everyone's progress.

The bot should require minimal interaction from users.

---

### 4. User Management

Users interact with the bot through Telegram.

Each user must be identified by their Telegram user ID.

The bot should associate each user with the Telegram group where they use it.

Users should be able to:

- Start using the bot.
- Register their daily recurring tasks.
- View their recurring tasks.
- Add new recurring tasks.
- Edit task titles.
- Change task reminder times.
- Activate or deactivate recurring tasks.
- Delete recurring tasks.
- Add one-time tasks.
- Respond to task reminders.
- View the daily report.

The bot should not require a separate website, dashboard, or authentication system.

Telegram should be the primary interface.

---

### 5. Recurring Tasks

Each user can define recurring daily tasks.

Recurring tasks are configured once and automatically appear every day.

Examples:

- Study English at 10:00.
- Work on a project at 14:00.
- Exercise at 19:00.
- Study university subjects at 21:00.

Each recurring task must contain:

- Task ID.
- Owner.
- Task title.
- Reminder time.
- Active or inactive status.
- Creation timestamp.

All active recurring tasks repeat every day.

There is no need to select weekdays in the initial version.

Users should be able to manage their recurring tasks through Telegram commands and inline buttons.

#### Important behavior

Recurring task definitions must be separate from their daily task instances.

Editing or deleting a recurring task must not modify completed tasks or reports from previous days.

Changes to recurring task definitions should take effect starting the following day.

The current day's task instances must remain unchanged unless the user explicitly changes their current-day task.

---

### 6. Daily Task Instances

The bot must create daily task instances from active recurring task definitions.

Each daily task represents one specific task for one specific user on one specific date.

Daily task instances must contain:

- Task ID.
- User ID.
- Associated recurring task ID, if applicable.
- Task title.
- Task date.
- Scheduled reminder time.
- Current status.
- Number of reminder attempts.
- Completion timestamp.
- Creation timestamp.

Recurring tasks and one-time tasks must both use the daily task system.

One-time tasks do not have an associated recurring task definition.

The bot must not create duplicate daily instances for the same recurring task and date.

---

### 7. Task Statuses

Use the following task statuses:

- `PENDING`: The task has not been completed.
- `COMPLETED`: The user confirmed completion.
- `INCOMPLETE`: The task was not completed after the reminder process.
- `CANCELLED`: The task was cancelled.

A task should initially be created with the `PENDING` status.

When the user confirms completion, the bot must:

1. Update the task status to `COMPLETED`.
2. Save the completion timestamp.
3. Stop all remaining reminders for that task.
4. Prevent duplicate completion actions.

If the task remains incomplete after the reminder process, it should become `INCOMPLETE`.

Users should be able to mark a task as completed later in the day, even if its reminder process has already finished.

---

### 8. Automatic Task Reminders

The bot must automatically ask users about their tasks at their configured reminder times.

For example:

A user has a recurring task:

`Study English — 10:00`

At 10:00, the bot publishes a group message:

"Parsa, have you completed your English study today?"

The message must contain two inline buttons:

- Completed
- Not yet

The bot must associate the message and its buttons with the correct task and user.

#### Response behavior

When the user selects `Completed`:

- Mark the task as completed.
- Save the completion timestamp.
- Stop further reminders.
- Update the task's status.

When the user selects `Not yet`:

- Keep the task pending.
- Schedule the next reminder.
- Update the reminder attempt count.

When another group member interacts with the task:

- Do not allow them to change its status.
- Only the task owner can respond successfully.

The bot must validate the Telegram user ID before processing every task response.

---

### 9. Reminder Rules

Each task should have:

- One initial reminder.
- A maximum of two additional reminders.

Default reminder schedule:

- Initial reminder: At the task's scheduled time.
- First reminder: One hour after the initial reminder.
- Second reminder: Two hours after the initial reminder.

If the user has not completed the task after the second reminder, the task should be marked as `INCOMPLETE`.

If the user does not respond, the same reminder process should continue.

The bot must never send more than two additional reminders for the same task.

#### Reminder scheduling constraints

- Do not send reminders after the daily cutoff.
- Do not send reminders after the task is completed.
- Do not send reminders after the task is cancelled.
- Do not send reminders for inactive recurring task definitions.
- Do not schedule reminders for future task dates before their scheduled times.

The daily report should be published at 22:00.

The daily cutoff should be configurable.

For the initial implementation, use 21:30 as the latest reminder time.

Tasks scheduled too late in the day must have their reminder attempts limited by the daily cutoff.

The bot must not send reminders after the daily report.

---

### 10. One-Time Tasks

Users must be able to add unexpected tasks during the day.

Example:

`/add Buy a charger`

The bot should register the task and ask the user when it should be reminded.

Available options:

- In 30 minutes.
- In 1 hour.
- At a specific time.
- No reminder.

One-time tasks must:

- Belong to the user who created them.
- Be associated with the current day.
- Have a task title.
- Have an optional reminder time.
- Appear in the daily report.
- Never automatically repeat the following day.

One-time tasks should use the same reminder and status system as recurring tasks.

The bot must not require users to define a recurring task to add a one-time task.

---

### 11. Telegram Group Interaction

All task reminders and task responses must happen inside the Telegram group.

The bot should use Telegram inline keyboards.

Example reminder:

"Parsa, have you completed your project work today?"

Buttons:

- Completed
- Not yet

The bot must identify the task owner and validate that only the owner can respond.

The bot should not require users to send arbitrary text messages to update task statuses.

All task responses should be handled through inline button callbacks.

The bot must be able to:

- Send messages to the configured group.
- Receive callback queries.
- Validate user permissions.
- Update task statuses.
- Edit existing reminder messages when appropriate.

The bot must be configured with the necessary Telegram group permissions.

Users should start the bot privately before the bot attempts to send private messages to them. However, the initial implementation should use group messages for task reminders and reports.

---

### 12. Daily Group Report

The bot must automatically publish a daily group report at 22:00.

The report should include:

- Every active group member.
- Total tasks assigned to each member.
- Completed tasks.
- Incomplete tasks.
- Completion percentage.
- Task titles.
- Overall group progress.

Example:

**Daily Group Report**

Parsa

- Study English: Completed
- Work on project: Completed
- Exercise: Incomplete
- Buy a charger: Completed

Progress: 3/4 — 75%

Ali

- Study university subjects: Completed
- Exercise: Completed
- Work on project: Incomplete

Progress: 2/3 — 67%

Group progress:

5 completed tasks out of 7 total tasks.

71% completion.

The report should include both recurring tasks and one-time tasks.

Tasks should not be excluded from the report merely because they were added during the day.

If a user has no tasks for the day, show an appropriate empty state instead of displaying 0%.

The bot should publish only one final report per group per day.

Reports must remain available in the Telegram group as historical messages.

---

### 13. Telegram Commands

Keep the command system minimal.

#### `/start`

Initialize the user and introduce the bot.

#### `/tasks`

Display and manage the user's recurring tasks.

Users should be able to add, edit, deactivate, reactivate, and delete recurring tasks.

#### `/add`

Create a new one-time task for the current day.

#### `/report`

Display the current day's group report.

#### `/help`

Explain the available commands and basic usage.

Do not introduce additional commands unless they are necessary for the MVP.

---

### 14. Database Schema

Use PostgreSQL on Neon.

The initial implementation should use three primary tables.

#### Users

Store Telegram group members.

Fields:

- `id`
- `telegramUserId`
- `displayName`
- `chatId`
- `isActive`
- `createdAt`

The Telegram user ID must be unique.

#### RecurringTasks

Store recurring task definitions.

Fields:

- `id`
- `userId`
- `title`
- `reminderTime`
- `isActive`
- `createdAt`
- `updatedAt`

Each recurring task belongs to one user.

#### DailyTasks

Store individual daily task instances.

Fields:

- `id`
- `userId`
- `recurringTaskId`
- `title`
- `date`
- `reminderTime`
- `status`
- `reminderCount`
- `completedAt`
- `createdAt`
- `updatedAt`

`recurringTaskId` must be optional to support one-time tasks.

Use a date-based uniqueness constraint to prevent duplicate daily instances of the same recurring task.

Task status changes must be persisted in the database.

---

### 15. Vercel Serverless Architecture

The application must be compatible with Vercel's serverless execution model.

Do not use in-memory timers or long-running processes.

The application should contain:

#### Telegram Webhook

A Next.js route that receives Telegram updates.

Responsibilities:

- Process `/start`, `/tasks`, `/add`, `/report`, and `/help`.
- Process inline keyboard callbacks.
- Validate user permissions.
- Update database records.
- Send Telegram messages.

#### Cron Endpoint

A protected Next.js route invoked by Vercel Cron.

Responsibilities:

- Generate missing daily task instances.
- Find tasks whose initial reminders are due.
- Find tasks whose follow-up reminders are due.
- Mark tasks incomplete when the reminder process finishes.
- Publish the daily group report.
- Prevent duplicate task instances and duplicate reports.

The Cron endpoint must query the database for due tasks instead of relying on application memory.

#### Database

Use Neon PostgreSQL as the persistent storage layer.

The application must use a connection strategy compatible with serverless execution.

Do not create unnecessary database connections for every task.

---

### 16. Scheduling Requirements

The bot must use persistent scheduling logic.

Do not use:

- `setInterval`
- `setTimeout` as the primary scheduling mechanism
- In-memory reminder queues
- Background workers that require a permanently running process

Instead, use Vercel Cron to periodically invoke the scheduling endpoint.

The scheduling endpoint should:

1. Determine the current date and time.
2. Find tasks that are due.
3. Check whether the task is still eligible for a reminder.
4. Check the reminder attempt count.
5. Send the appropriate Telegram message.
6. Persist the reminder attempt.
7. Update task status when necessary.

The scheduler must be safe to execute multiple times.

Repeated Cron executions must not create duplicate task instances, duplicate reminders, or duplicate reports.

Use database constraints and transactional operations where necessary.

Vercel Cron timing is not guaranteed to be exact to the second. The implementation must tolerate scheduling delays.

The bot should send reminders as close as reasonably possible to their configured times.

---

### 17. Timezone

All task reminder times must be interpreted using the group's configured timezone.

The timezone should be stored as an IANA timezone identifier.

For the initial implementation, use:

`Europe/London`

Do not assume that the server's timezone is the group's timezone.

Store timestamps consistently in UTC where appropriate.

Use the configured timezone when calculating daily task dates, reminder times, and report times.

The implementation must handle daylight saving time changes correctly.

The daily report should be scheduled for 22:00 in the configured group timezone.

---

### 18. Reliability Requirements

The bot must handle:

- Duplicate Telegram webhook updates.
- Duplicate Cron executions.
- Serverless execution time limits.
- Database connection failures.
- Telegram API errors.
- Missed scheduled executions.
- Users clicking the same button multiple times.
- Users attempting to update another person's task.
- Bot restarts.
- Tasks becoming overdue.
- Tasks scheduled near the daily cutoff.

The implementation should be idempotent wherever possible.

Telegram webhook updates should be processed only once.

Use Telegram update IDs or another appropriate deduplication mechanism.

Reminder attempts must be persisted.

If a Cron execution fails, the next execution should be able to recover eligible tasks from the database.

Do not rely on process memory for task state.

---

### 19. Security

The application must:

- Validate the Telegram webhook secret.
- Protect the Cron endpoint with a secret.
- Validate Telegram user IDs before processing task responses.
- Validate group membership and group association.
- Prevent users from modifying other users' tasks.
- Avoid exposing database credentials.
- Use environment variables for secrets.
- Validate user-provided task titles.
- Prevent duplicate callback processing.

The bot must not expose sensitive information in group messages beyond the task information and progress intended for group accountability.

---

### 20. Environment Variables

Use environment variables for configuration.

Required configuration:

- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_WEBHOOK_SECRET`
- `CRON_SECRET`
- `DATABASE_URL`
- `DIRECT_URL`
- `GROUP_CHAT_ID`
- `GROUP_TIMEZONE`

Use Neon-provided connection URLs.

Do not hardcode secrets in source code.

---

### 21. MVP Scope

The initial version must include:

1. Telegram group integration.
2. User registration.
3. Recurring daily task management.
4. Individual task reminder times.
5. Automatic daily task generation.
6. Automatic group reminders.
7. Completed and not-yet responses.
8. Maximum two follow-up reminders.
9. One-time task creation.
10. Daily group report.
11. Neon PostgreSQL persistence.
12. Vercel deployment.
13. Vercel Cron scheduling.

---

### 22. Out of Scope

Do not implement:

- A web dashboard.
- A separate administration panel.
- Authentication outside Telegram.
- Multiple independent groups.
- Task categories.
- Task priorities.
- Task descriptions.
- Task attachments.
- Task duration tracking.
- Gamification.
- Leaderboards.
- Streaks.
- Points or rewards.
- Weekly analytics.
- Calendar integrations.
- Redis.
- A dedicated worker server.
- Microservices.
- Complex notification preferences.

Keep the implementation focused on the core daily accountability workflow.

---

### 23. Expected User Experience

The final user experience should be:

1. A user starts the bot.
2. The user defines their recurring daily tasks.
3. Each task receives a reminder time.
4. The bot automatically generates daily task instances.
5. The bot asks about each task in the Telegram group.
6. The user responds through inline buttons.
7. The bot follows up when necessary.
8. The user can add unexpected tasks during the day.
9. The bot publishes the daily group report.
10. The next day, the process starts again automatically.

Users should not need to manually create their daily task list every morning.

The bot should operate automatically after the initial setup.

---

### 24. Development Approach

Implement the project in small, independent phases.

#### Phase 1: Project Setup

- Initialize Next.js.
- Configure TypeScript.
- Configure pnpm.
- Set up Prisma.
- Connect Neon.
- Configure environment variables.

#### Phase 2: Telegram Integration

- Configure the Telegram bot.
- Implement the webhook.
- Implement `/start` and `/help`.
- Register users.
- Configure group integration.

#### Phase 3: Recurring Tasks

- Create recurring task definitions.
- Implement `/tasks`.
- Add task creation and editing.
- Add activation and deactivation.
- Add daily task generation.

#### Phase 4: Reminder System

- Implement the Cron endpoint.
- Find due tasks.
- Send initial reminders.
- Process inline button responses.
- Implement follow-up reminders.
- Implement incomplete task finalization.

#### Phase 5: One-Time Tasks

- Implement `/add`.
- Allow reminder time selection.
- Support tasks without reminders.
- Include one-time tasks in the daily report.

#### Phase 6: Daily Report

- Aggregate daily task statuses.
- Calculate completion percentages.
- Publish the group report.
- Prevent duplicate reports.

#### Phase 7: Deployment

- Deploy to Vercel.
- Configure Neon production database.
- Configure Telegram webhook.
- Configure Vercel Cron.
- Test scheduled execution.
- Test recovery after failed executions.

---

### 25. Final Requirements

Build a small, reliable Telegram daily accountability bot.

The main priorities are:

- Minimal complexity.
- Automatic task reminders.
- Persistent task state.
- Group-visible accountability.
- Simple user interaction.
- Reliable daily reports.
- Compatibility with Next.js and Vercel.
- Neon PostgreSQL persistence.

Do not expand the scope beyond these requirements without explicit approval.

The application should be easy to maintain and straightforward to deploy.

The final result should be a lightweight Telegram bot, not a complete task management platform.