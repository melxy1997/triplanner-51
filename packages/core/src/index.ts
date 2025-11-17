export interface Placeholder {
  /**
   * A description to ensure TypeScript compilation works end-to-end.
   */
  description: string;
}

export const createPlaceholder = (description = 'Triplanner core ready'): Placeholder => ({
  description,
});

