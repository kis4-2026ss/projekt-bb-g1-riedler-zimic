import { createBackend } from './app.mjs';

const port = Number(process.env.PORT || 3000);
const seed = process.env.SEED_DB !== 'false';

try {
  const { app } = await createBackend({ seed });
  app.listen(port, () => console.log(`Server listening on port ${port}`));
} catch (error) {
  console.error('Unable to start server:', error);
  process.exit(1);
}
