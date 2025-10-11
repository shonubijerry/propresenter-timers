# ProPresenter Timer Control

A desktop application built with Next.js and Electron for managing ProPresenter timers with a dedicated fullscreen display for timer projection.

## Overview

ProPresenter Timer Control provides a user-friendly interface to manage timers in ProPresenter through its API. The application allows you to create, edit, start, stop, delete, and reset timers, as well as project a selected timer to an external display in fullscreen mode.

## Features

- **Timer Management**
  - Create new timers with custom durations
  - Edit existing timer configurations
  - Start and stop timers remotely
  - Reset timers to initial values
  - Delete timers when no longer needed

- **External Display Projection**
  - Project selected timer clock to external display
  - Fullscreen mode for optimal visibility
  - Real-time timer updates

- **ProPresenter Integration**
  - Direct integration with ProPresenter API
  - Real-time communication with ProPresenter

## Tech Stack

- **Frontend**: Next.js 15.5.3, React 19, TailwindCSS 4
- **Desktop**: Electron 38
- **Form Handling**: React Hook Form
- **Timer Logic**: React Timer Hook
- **Fullscreen**: React Full Screen
- **Icons**: React Icons

## Prerequisites

- Node.js (v18 or higher recommended)
- ProPresenter with API access enabled

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd propresenter-timers
```

2. Install dependencies:
```bash
npm install
```

3. Configure environment variables:
Create a `.env` file in the root directory with your ProPresenter API configuration:
```env
NEXT_PUBLIC_PROPRESENTER_HOST=<your-propresenter-host>
NEXT_PUBLIC_PROPRESENTER_PORT=<api-port>
NEXT_PUBLIC_PROPRESENTER_API_KEY=<your-api-key>
```

## Development

Run the application in development mode:

```bash
npm run dev
```

This will:
- Start the Next.js development server on port 3000
- Launch the Electron application
- Enable hot-reload for both frontend and Electron

### Individual Development Commands

- `npm run dev:next` - Run Next.js dev server only
- `npm run dev:electron` - Run Electron only
- `npm run build:electron` - Compile Electron TypeScript files

## Building for Production

### Build the application:
```bash
npm run build
```

This command will:
1. Clean previous builds
2. Build the Next.js application
3. Compile Electron TypeScript files

### Create distributable packages:
```bash
npm run dist
```

This will generate platform-specific installers in the `release` directory:
- **Windows**: NSIS installer and portable executable
- **macOS**: DMG image
- **Linux**: AppImage

## Project Structure

```
propresenter-timers/
├── electron/          # Electron main process files
│   ├── /          # TypeScript source files
│   └── dist/         # Compiled JavaScript files
├── out/              # Next.js static export
├── assets/           # Application icons
├── public/           # Static assets
├── src/              # Next.js source files
│   ├── app/         # Next.js app directory
│   └── components/  # React components
└── release/         # Built application packages
```

## Application Details

- **App ID**: com.amazingrace.timer
- **Product Name**: AGC Timer Control
- **Author**: Oluwakorede Shonubi

## Scripts Reference

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development environment |
| `npm run build` | Build for production |
| `npm run dist` | Create distributable packages |
| `npm run clean` | Remove build artifacts |
| `npm run lint` | Run ESLint |

## Configuration

The application uses environment variables for ProPresenter API configuration. Ensure your `.env` file is properly configured before running the application.

### Windows Build Options
- Supports both 64-bit and 32-bit architectures
- NSIS installer with customization options
- Portable executable available
- Desktop and Start Menu shortcuts

### macOS Build Options
- DMG distribution format
- Code signing disabled by default (set `identity: null`)

### Linux Build Options
- AppImage format for universal compatibility

## License

Private - Not for public distribution

## Support

For issues and feature requests, please contact the developer.

---

Built with ❤️ using Next.js and Electron
