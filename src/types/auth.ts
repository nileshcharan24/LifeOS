export type EmailAuth = {
  email: string;
  password?: string;
};

export type SignUpWithEmail = {
  email: string;
  password: string;
  full_name?: string;
  ai_custom_instructions?: string;
};
