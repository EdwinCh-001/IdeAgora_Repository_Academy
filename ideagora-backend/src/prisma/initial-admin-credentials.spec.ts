import { readInitialAdminCredentials } from './initial-admin-credentials.js';

describe('readInitialAdminCredentials', () => {
  it('requires explicit credentials and never provides a built-in password', () => {
    expect(() => readInitialAdminCredentials({})).toThrow(
      /INITIAL_ADMIN_EMAIL/,
    );
    expect(() =>
      readInitialAdminCredentials({
        INITIAL_ADMIN_EMAIL: 'admin@ideagora.test',
        INITIAL_ADMIN_FIRST_NAME: 'Admin',
        INITIAL_ADMIN_LAST_NAME: 'Global',
        INITIAL_ADMIN_PASSWORD: 'short',
      }),
    ).toThrow(/al menos 16 caracteres/);
  });

  it('normalizes the email and accepts a strong, bcrypt-compatible password', () => {
    expect(
      readInitialAdminCredentials({
        INITIAL_ADMIN_EMAIL: ' ADMIN@IDEAGORA.TEST ',
        INITIAL_ADMIN_FIRST_NAME: ' Ada ',
        INITIAL_ADMIN_LAST_NAME: ' Lovelace ',
        INITIAL_ADMIN_PASSWORD: 'a-long-passphrase-2026',
      }),
    ).toEqual({
      email: 'admin@ideagora.test',
      firstName: 'Ada',
      lastName: 'Lovelace',
      password: 'a-long-passphrase-2026',
    });
  });

  it('rejects passwords that exceed bcrypt byte limits', () => {
    expect(() =>
      readInitialAdminCredentials({
        INITIAL_ADMIN_EMAIL: 'admin@ideagora.test',
        INITIAL_ADMIN_FIRST_NAME: 'Admin',
        INITIAL_ADMIN_LAST_NAME: 'Global',
        INITIAL_ADMIN_PASSWORD: 'á'.repeat(37),
      }),
    ).toThrow(/no puede superar 72 bytes UTF-8/);
  });

  it('rejects using the email itself as the password', () => {
    expect(() =>
      readInitialAdminCredentials({
        INITIAL_ADMIN_EMAIL: 'admin@ideagora.test',
        INITIAL_ADMIN_FIRST_NAME: 'Admin',
        INITIAL_ADMIN_LAST_NAME: 'Global',
        INITIAL_ADMIN_PASSWORD: 'ADMIN@IDEAGORA.TEST',
      }),
    ).toThrow(/distinta del correo/);
  });
});
