import app from './app.js';
import initializeDatabase from './db/init.js';


// Initialize the database
try {
  await initializeDatabase();
} catch (error) {
  console.error("Error initializing database:", error);
  process.exit(1);
}

app.listen(process.env.PORT || 5000, () => {
  console.log(`Server is running on port ${process.env.PORT || 5000}`);
});
