import bcrypt from "bcrypt";
import * as readline from "readline";

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(prompt: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

async function main() {
  console.log("\n=== Создание администратора для платформы ===\n");

  const username = await question("Username: ");
  const email = await question("Email: ");
  const password = await question("Password: ");

  const hash = await bcrypt.hash(password, 10);

  console.log("\n=== ГОТОВЫЙ SQL ДЛЯ ПРОДАКШЕН БАЗЫ ===\n");
  console.log(`INSERT INTO users (id, username, password, role, email, status, created_at)
VALUES (
  gen_random_uuid(),
  '${username}',
  '${hash}',
  'admin',
  '${email}',
  'active',
  NOW()
);`);

  console.log("\n=== Инструкция ===");
  console.log("1. Откройте вкладку Database в Replit");
  console.log("2. Переключитесь на Production");
  console.log("3. Выполните SQL выше\n");

  rl.close();
}

main();
