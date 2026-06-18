export interface User {
  id: string;
  email: string;
  displayName: string | null;
  defaultCurrency: string;
  timezone: string;
  onboardingCompleted: boolean;
}
