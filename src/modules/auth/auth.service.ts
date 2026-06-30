import { pool } from "../../db";
import bcrypt from "bcryptjs";
import type { IUser } from "./auth.interface";
import jwt, { type JwtPayload } from "jsonwebtoken";
import config from "../../config";

const createUserIntoDB = async (payload: IUser) => {
  const { name, email, password, role } = payload;

  // Hash the password
  const hashedPassword = await bcrypt.hash(password, 10);

  const result = await pool.query(
    `
    INSERT INTO users (name, email, password, role)
    VALUES ($1, $2, $3, $4)
    RETURNING *
  `,
    [name, email, hashedPassword, role || "contributor"],
  );
  delete result.rows[0].password;
  return result;
};


//login
const loginUser = async (email: string, password: string) => {
  const result = await pool.query(
    `
    SELECT * FROM users WHERE email = $1
  `,
    [email]
  );

  if (result.rows.length === 0) {
    throw new Error("User not found");
  }

  const user = result.rows[0];
  const isMatch = await bcrypt.compare(password, user.password);

  if (!isMatch) {
    throw new Error("Invalid credentials");
  }
  const jwtpayload = {
    id: user.id,
    name: user.name,
    role: user.role,
    is_active: user.is_active,
    email: user.email,
  };

  const accessToken = jwt.sign(jwtpayload, config.secret as string, {
    expiresIn: "1d",
  });

  return {accessToken, user};
};

export const authService = {
  createUserIntoDB,
  loginUser,
};

