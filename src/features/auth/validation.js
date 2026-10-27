/** Pure form validation, kept apart from components so it is easy to test. */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const validateSignup = ({ name, email, password, confirm }) => {
  const errors = {};
  if (!name.trim()) errors.name = "Tell us what to call you.";
  if (!EMAIL_RE.test(email.trim())) errors.email = "Enter a valid email address.";
  if (password.length < 8) errors.password = "Use at least 8 characters.";
  if (confirm !== password) errors.confirm = "Passwords don't match.";
  return errors;
};
