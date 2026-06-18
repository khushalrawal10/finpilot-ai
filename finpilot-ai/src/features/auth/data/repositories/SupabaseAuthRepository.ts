import { SupabaseClient, AuthChangeEvent, Session } from '@supabase/supabase-js';
import { User } from '@features/auth/domain/entities/User';
import { AuthError } from '@core/types/errors';

// ============================================================
// Internal types for Supabase row data
// ============================================================

interface UsersRow {
  id: string;
  email: string;
  display_name: string | null;
  default_currency: string;
  timezone: string;
  onboarding_completed: boolean;
}

// ============================================================
// Supabase Auth Repository
// ============================================================

export class SupabaseAuthRepository {
  constructor(private supabase: SupabaseClient) {}

  // ----------------------------------------------------------
  // Sign Up
  // ----------------------------------------------------------

  async signUp(email: string, password: string): Promise<User> {
    const { data: authData, error: authError } =
      await this.supabase.auth.signUp({ email, password });

    if (authError || !authData.user) {
      throw new AuthError(
        authError?.message ?? 'Sign-up failed',
        'signup_failed',
      );
    }

    const displayName = email.split('@')[0];

    const { data: dbRow, error: insertError } = await this.supabase
      .from('users')
      .insert({
        id: authData.user.id,
        email,
        display_name: displayName,
      })
      .select()
      .single<UsersRow>();

    if (insertError || !dbRow) {
      throw new AuthError(
        insertError?.message ?? 'Failed to create user profile',
        'profile_creation_failed',
      );
    }

    return this.mapRow(dbRow);
  }

  // ----------------------------------------------------------
  // Sign In
  // ----------------------------------------------------------

  async signIn(email: string, password: string): Promise<User> {
    const { data: authData, error: authError } =
      await this.supabase.auth.signInWithPassword({ email, password });

    if (authError || !authData.user) {
      throw new AuthError(
        authError?.message ?? 'Invalid email or password',
        'invalid_credentials',
      );
    }

    const { data: dbRow, error: fetchError } = await this.supabase
      .from('users')
      .select('*')
      .eq('id', authData.user.id)
      .single<UsersRow>();

    if (fetchError || !dbRow) {
      throw new AuthError(
        fetchError?.message ?? 'User profile not found',
        'profile_not_found',
      );
    }

    return this.mapRow(dbRow);
  }

  // ----------------------------------------------------------
  // Sign Out
  // ----------------------------------------------------------

  async signOut(): Promise<void> {
    const { error } = await this.supabase.auth.signOut();

    if (error) {
      throw new AuthError(error.message, 'signout_failed');
    }
  }

  // ----------------------------------------------------------
  // Get Current User
  // ----------------------------------------------------------

  async getCurrentUser(): Promise<User | null> {
    const {
      data: { user: authUser },
    } = await this.supabase.auth.getUser();

    if (!authUser) {
      return null;
    }

    const { data: dbRow, error: fetchError } = await this.supabase
      .from('users')
      .select('*')
      .eq('id', authUser.id)
      .single<UsersRow>();

    if (fetchError || !dbRow) {
      return null;
    }

    return this.mapRow(dbRow);
  }

  // ----------------------------------------------------------
  // Auth State Change Listener
  // ----------------------------------------------------------

  onAuthStateChange(
    cb: (user: User | null) => void,
  ): () => void {
    const {
      data: { subscription },
    } = this.supabase.auth.onAuthStateChange(
      async (_event: AuthChangeEvent, session: Session | null) => {
        if (!session?.user) {
          cb(null);
          return;
        }

        const { data: dbRow } = await this.supabase
          .from('users')
          .select('*')
          .eq('id', session.user.id)
          .single<UsersRow>();

        if (!dbRow) {
          cb(null);
          return;
        }

        cb(this.mapRow(dbRow));
      },
    );

    return () => subscription.unsubscribe();
  }

  // ----------------------------------------------------------
  // Private mapper
  // ----------------------------------------------------------

  private mapRow(row: UsersRow): User {
    return {
      id: row.id,
      email: row.email,
      displayName: row.display_name,
      defaultCurrency: row.default_currency,
      timezone: row.timezone,
      onboardingCompleted: row.onboarding_completed,
    };
  }
}
