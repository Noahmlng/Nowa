# Nowa - AI Todo App

Nowa is an AI-powered todo app that helps you manage your tasks and goals. It's inspired by Microsoft To-do but with additional AI features for task management and feedback.

## Features

- **Goal Management**: Create and track long-term goals with progress indicators
- **Task Management**: Create, edit, and complete tasks with due dates and priorities
- **Task Feedback**: Add feedback to tasks to track your progress and challenges
- **Task Organization**: Organize tasks by date and custom lists
- **Task Details**: Add descriptions, due dates, priorities, and link tasks to goals

## Getting Started

### Prerequisites

- Node.js (v14 or later)
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone https://github.com/diangao/Nowa.git
cd nowa
```

2. Install dependencies:
```bash
npm install
# or
yarn install
```

3. Set up environment variables:
```bash
# Copy the environment template file
cp .env.template .env.local

# Edit .env.local and add your actual API keys
nano .env.local
# or use any text editor of your choice
```

4. Start the development server:
```bash
npm run dev
# or
yarn dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser to see the application.

### Environment Variables

The application requires the following environment variables:

- `DEEPSEEK_API_KEY`: Your DeepSeek API key for AI functionality
- `DEEPSEEK_API_URL`: The DeepSeek API endpoint (default: https://api.deepseek.com/v1/chat/completions)
- `DEEPSEEK_MODEL`: The DeepSeek model to use (default: deepseek-chat)

These should be set in a `.env.local` file which will not be committed to the repository for security reasons.

## Project Structure

```
nowa/
├── src/
│   ├── app/
│   │   ├── layout.tsx    # Root layout component
│   │   ├── page.tsx      # Home page component
│   │   └── globals.css   # Global styles
│   ├── components/
│   │   ├── GoalList.tsx  # Goal list component
│   │   ├── Sidebar.tsx   # Sidebar navigation component
│   │   ├── TaskDetail.tsx # Task detail modal component
│   │   └── TaskList.tsx  # Task list component
│   └── store/
│       └── store.ts      # Zustand store for state management
├── public/              # Static assets
├── package.json         # Project dependencies
└── README.md            # Project documentation
```

## Technologies Used

- **Next.js**: React framework for server-side rendering and static site generation
- **TypeScript**: Type-safe JavaScript
- **Tailwind CSS**: Utility-first CSS framework
- **Zustand**: State management
- **date-fns**: Date utility library
- **Lucide React**: Icon library

## Future Enhancements

- Voice feedback for tasks
- AI-powered task suggestions and adjustments
- Daily summary reports
- Email notifications
- Integration with external calendars

## License

This project is licensed under the MIT License - see the LICENSE file for details.
