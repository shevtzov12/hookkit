import { seedGuestDemo } from "../src/lib/db/seed";

seedGuestDemo()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
