export type UserType = {
  address: string;
  /**
   * Absent for a session picked up from the shared reef.nimiq.cafe cookie.
   * That cookie is httpOnly, so the token never reaches JavaScript -- requests
   * authenticate by cookie instead, which works because they are same-origin.
   */
  accessToken?: string;
} | null;

export type AuthState = {
  user: UserType;
  loading: boolean;
};

export type AuthContextValue = {
  user: UserType;
  loading: boolean;
  authenticated: boolean;
  unauthenticated: boolean;
  checkUserSession?: () => Promise<void>;
};
