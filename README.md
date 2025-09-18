# Household Budget Manager

A comprehensive household budget management application built with React,
TypeScript, and Tailwind CSS. Designed to help individuals and couples manage
shared finances, track expenses, and plan for financial goals.

## About

For the longest time, I've been keeping track of my personal and household
budget in a Google Spreadsheet. Nothing wrong with that, it's just... not
pretty.

I got the idea to do yet another test with some AI coding and thought, _"Maybe I
can just feed the spreadsheet to Claude?"_ Well, I could. And it did something
at first, but not really what I wanted. From there, I spent days prompting,
hitting my 5 hour limit several days in a row. Getting so close, and then ending
up right back where I started.

Finally, after about a week, I have something that feels good enough to share.
Just to clarify, I've written 0 lines of this code. I only removed maybe 5
lines, and I wrote the About section in this README. The rest is just me
prompting and directing Claude to do what I meant. I think it turned out OK!

This text was cleaned up a little with ChatGPT...

## Features

### 💰 Expense Management

- **Household Expenses**: Track shared expenses like rent, utilities, and groceries
- **Personal Expenses**: Manage individual expenses with custom categories
- **Smart Splitting**: Automatically split expenses by income percentage or equally
- **Flexible Categories**: Create custom expense categories for better organization

### 🏠 Asset & Loan Tracking

- **Asset Management**: Track cars, boats, and other household assets with associated costs
- **Loan Management**: Monitor loans and debt with interest rate calculations and repayment tracking
- **Swedish Banking Terms**: Uses accurate terminology (amortering for repayment) aligned with Swedish banking
- **Payment Tracking**: See monthly payment breakdowns and remaining balances
- **Progress Visualization**: Visual progress bars for loan payoff

### 📊 Financial Dashboard

- **Budget Overview**: Complete household financial picture with income vs. expenses
- **Surplus Calculation**: Accurate household surplus after all expenses and loan payments
- **Financial Health**: Insights on savings potential and emergency fund coverage
- **Visual Charts**: Interactive charts showing expense breakdowns and trends

### 👥 Multi-User Support

- **1-2 User Support**: Optimized for individuals or couples
- **Settlement Tracking**: Automatic calculation of who owes whom
- **Income-Based Splitting**: Fair expense allocation based on income ratios
- **Clean Single-User Mode**: Simplified UI when managing personal finances

### 💡 Smart Features

- **Swedish Tax Integration**: Accurate after-tax income calculations using official Skatteverket data
  - Current tax rates for all 290 Swedish municipalities
  - Municipal tax, regional tax, and state tax calculations
  - Automatic tax table lookup based on income and municipality
- **Cloud Persistence**: Automatic syncing across devices with Firebase Firestore
- **Multi-Tenant Support**: Share household budgets with family members via unique URLs
- **Export/Import**: Backup and restore your financial data
- **Responsive Design**: Works seamlessly on desktop and mobile

## Getting Started

### Prerequisites

- Node.js (version 20.19+ recommended)
- npm or yarn
- Firebase project (for cloud persistence)

### Quick Start

```bash
# Clone the repository
git clone <repository-url>
cd household-budget

# Install dependencies
npm install

# Start development server (uses local storage)
npm run dev
```

### Firebase Setup (Optional but Recommended)

For cloud persistence and multi-device syncing:

1. Create a Firebase project at [Firebase Console](https://console.firebase.google.com/)
2. Copy `.env.example` to `.env` and fill in your Firebase configuration
3. Enable Firestore Database in your Firebase project
4. Deploy security rules: `npm run firebase:deploy:rules`

See [FIREBASE_SETUP.md](FIREBASE_SETUP.md) for detailed instructions.

### Build and Deploy

```bash
# Build for production
npm run build

# Deploy to Firebase Hosting
npm run firebase:deploy

# Or deploy only hosting (faster updates)
npm run firebase:deploy:hosting
```

### Development Commands

```bash
npm run dev                       # Start development server
npm run build                     # Build for production
npm run build:github              # Build for GitHub Pages deployment
npm run preview                   # Preview production build
npm run lint                      # Run ESLint
npm run prettify                  # Format code with Prettier
npm run firebase:emulators        # Start Firebase emulators
npm run firebase:deploy           # Build and deploy to Firebase
npm run firebase:deploy:hosting   # Deploy only frontend
npm run firebase:deploy:rules     # Deploy only Firestore rules
npm run update-municipalities     # Update Swedish municipality tax data
```

### Maintenance Commands

#### Updating Swedish Tax Data

The application includes current Swedish municipality tax rates for accurate after-tax income calculations. To update this data:

```bash
# Update major municipalities only (faster, for testing)
npm run update-municipalities

# Update all 290 municipalities (comprehensive, for production)
node scripts/update-municipality-data.js --full
```

This script fetches current tax rates directly from Skatteverket's official API and updates the static fallback data used when the API is unavailable.

For detailed information about Swedish tax data integration, see [MUNICIPALITY_DATA.md](MUNICIPALITY_DATA.md).

## Technology Stack

- **React 18** - Modern React with hooks and functional components
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first styling
- **Firebase Firestore** - Cloud database with real-time synchronization
- **Firebase Hosting** - Fast, secure web hosting
- **Recharts** - Interactive data visualization
- **Lucide React** - Beautiful icons
- **Vite** - Fast development and building
- **React Router** - Client-side routing for multi-tenant support

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file
for details.
