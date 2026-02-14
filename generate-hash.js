import bcrypt from "bcrypt";

const password = "Admin123!"; // ← ton mot de passe admin

const run = async () => {
  const hash = await bcrypt.hash(password, 10);
  console.log("HASH:");
  console.log(hash);
};

run();
