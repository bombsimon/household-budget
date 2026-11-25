export const PROJECT_ID = 'demo-project';
export const PASSWORD = 'local-demo-password';

const CATEGORIES = [
  { id: 'home', name: 'Home' },
  { id: 'streaming', name: 'Streaming' },
  { id: 'subscriptions', name: 'Subscriptions' },
  { id: 'health', name: 'Health' },
  { id: 'food', name: 'Food' },
  { id: 'transport', name: 'Transport' },
];

const createUser = (id, name, monthlyIncome, color) => ({
  id,
  name,
  monthlyIncome,
  color,
  municipalityCode: '180',
  municipalityName: 'Stockholm',
});

const ALEX = createUser('alex', 'Alex Holm', 42000, '#3B82F6');
const ROBIN = createUser('robin', 'Robin Ek', 34000, '#10B981');

const createHouseholdExpenses = (secondPayer) => {
  const create = (id, name, amount, personalCategoryId, overrides) => ({
    id,
    name,
    amount,
    personalCategoryId,
    isShared: true,
    splitType: 'percentage',
    paidBy: ALEX.id,
    ...overrides,
  });

  return {
    id: 'shared',
    name: 'Household Expenses',
    expenses: [
      create('fee', 'Housing fee', 4850, 'home'),
      create('power', 'Electricity', 890, 'home', { paidBy: secondPayer.id }),
      create('insurance', 'Home insurance', 3240, 'home', { isYearly: true }),
      create('broadband', 'Broadband', 399, 'home', { splitType: 'equal' }),
      create('groceries', 'Groceries', 7500, 'food', {
        isBudgeted: true,
        paidBy: secondPayer.id,
      }),
      create('movies', 'Movies and series', 249, 'streaming', {
        splitType: 'equal',
        paidBy: secondPayer.id,
      }),
    ],
  };
};

const createPersonalExpenses = (user) => {
  const create = (key, name, amount, personalCategoryId, overrides) => ({
    id: `${user.id}-${key}`,
    name,
    amount,
    personalCategoryId,
    isShared: false,
    splitType: 'equal',
    userId: user.id,
    paidBy: user.id,
    ...overrides,
  });

  return {
    id: `personal-${user.id}`,
    name: `Personal - ${user.name}`,
    expenses: [
      create('phone', 'Phone', 299, 'subscriptions'),
      create('gym', 'Gym', 449, 'health'),
      create('music', 'Music', 119, 'streaming'),
      create('transport', 'Public transport', 1060, 'transport'),
      create('passwords', 'Password manager', 480, 'subscriptions', {
        isYearly: true,
      }),
      create('savings', 'Savings', 3000, undefined, { isBudgeted: true }),
    ],
  };
};

const createLoans = (isShared) => {
  const create = (id, name, originalAmount, currentAmount, overrides) => ({
    id,
    name,
    originalAmount,
    currentAmount,
    category: 'Home',
    paidBy: ALEX.id,
    isInterestShared: isShared,
    interestSplitType: 'percentage',
    isRepaymentShared: isShared,
    repaymentSplitType: 'equal',
    ...overrides,
  });

  return [
    create('mortgage-1', 'Mortgage part 1', 1800000, 1512000, {
      interestRate: 0.0289,
      monthlyPayment: 3000,
    }),
    create('mortgage-2', 'Mortgage part 2', 900000, 783000, {
      interestRate: 0.0315,
      monthlyPayment: 1500,
    }),
  ];
};

const createCar = (isShared) => {
  const create = (id, name, amount, overrides) => ({
    id,
    name,
    amount,
    isShared,
    splitType: 'percentage',
    userId: isShared ? undefined : ALEX.id,
    paidBy: ALEX.id,
    ...overrides,
  });

  return {
    id: 'car',
    name: 'Car',
    expenses: [
      create('car-insurance', 'Insurance', 520),
      create('parking', 'Parking', 900),
      create('fuel', 'Fuel', 1200, { isBudgeted: true }),
    ],
  };
};

const createHousehold = (users) => {
  const isShared = users.length > 1;

  return {
    users,
    personalCategories: CATEGORIES,
    categories: [
      createHouseholdExpenses(users.at(-1)),
      ...users.map(createPersonalExpenses),
    ],
    loans: createLoans(isShared),
    assets: [createCar(isShared)],
    version: '1.0.0',
    lastUpdated: new Date().toISOString(),
  };
};

export const HOUSEHOLDS = {
  'local-demo': createHousehold([ALEX]),
  'local-demo-shared': createHousehold([ALEX, ROBIN]),
};
