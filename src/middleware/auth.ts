import type { NextFunction, Request, Response } from "express";
import jwt, { type JwtPayload } from "jsonwebtoken";
import config from "../config";
import { pool } from "../db";
import type { ROLES } from "../types";

type AuthenticatedRequest = Request & { user?: JwtPayload };

const auth = (...roles: ROLES[]) => {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    console.log(roles);
    try {
      // console.log("This is protected Route");
      // console.log(req.headers.authorization);

      // 1. Check if the token exists
      // 2. Verify the token
      // 3. Find the user into database
      // 4. If the user active or not?

      const token = req.headers.authorization;

      console.log(token);
      if (!token) {
        res.status(401).json({
          success: false,
          message: "Unauthorized access!!",
        });
      }

      const decoded = jwt.verify(
        token as string,
        config.secret as string,
      ) as JwtPayload;

      const userData = await pool.query(
        `
     SELECT * FROM users WHERE email=$1   
        `,
        [decoded.email],
      );

      // console.log(userData);

      const user = userData.rows[0];

      // console.log(user);
      if (userData.rows.length === 0) {
        res.status(404).json({
          success: false,
          message: "User not found!",
        });
      }



      // console.log("Auth Role :", user.role);

      // roles = ["admin","agent"]
      // user.role = "admin" | "user" | "agent"

      if (roles.length && !roles.includes(user.role)) {
        res.status(403).json({
          success: false,
          message: "Forbidden!!,This role have no access!",
        });
      }

      req.user = decoded; // req : { user : {} }

      next();
    } catch (error) {
      next(error);
    }
  };
};

export default auth;