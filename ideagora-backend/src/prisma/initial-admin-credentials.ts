export interface InitialAdminCredentials {
  email: string;
  firstName: string;
  lastName: string;
  password: string;
}

export function readInitialAdminCredentials(
  env: NodeJS.ProcessEnv,
): InitialAdminCredentials {
  const email = env.INITIAL_ADMIN_EMAIL?.trim().toLowerCase();
  const firstName = env.INITIAL_ADMIN_FIRST_NAME?.trim();
  const lastName = env.INITIAL_ADMIN_LAST_NAME?.trim();
  const password = env.INITIAL_ADMIN_PASSWORD;

  if (!email || !firstName || !lastName || !password) {
    throw new Error(
      'Configura INITIAL_ADMIN_EMAIL, INITIAL_ADMIN_FIRST_NAME, INITIAL_ADMIN_LAST_NAME e INITIAL_ADMIN_PASSWORD.',
    );
  }
  if (
    email.length > 254 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  ) {
    throw new Error('INITIAL_ADMIN_EMAIL no tiene un formato válido.');
  }
  if (firstName.length > 100 || lastName.length > 100) {
    throw new Error('Los nombres del administrador no pueden superar 100 caracteres.');
  }
  if (password.length < 16) {
    throw new Error('La contraseña inicial debe tener al menos 16 caracteres.');
  }
  if (Buffer.byteLength(password, 'utf8') > 72) {
    throw new Error('La contraseña inicial no puede superar 72 bytes UTF-8.');
  }
  if (password.toLowerCase() === email) {
    throw new Error('La contraseña inicial debe ser distinta del correo.');
  }

  return { email, firstName, lastName, password };
}
